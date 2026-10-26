// キーボード・ゲームパッド入力
// 押されているキーを集合で管理し、プレイヤーごとの割り当てで読み取るので
// 2人が同時に操作しても互いに干渉しません。
import { settings } from './settings.js';

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter', 'Backspace', 'Tab']);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();    // 前回 poll から押されたキー
    this.listeners = [];          // keydown を横取りしたいリスナー（キー設定画面など）
    this.singlePlayer = true;
    this.capture = false;
    this.padPrev = [{}, {}, {}, {}];

    window.addEventListener('keydown', (e) => {
      for (const l of this.listeners) {
        if (l(e) === true) {
          e.preventDefault();
          return;
        }
      }
      const tag = document.activeElement?.tagName;
      const inGame = tag !== 'INPUT' && tag !== 'SELECT';
      // プレイ中のみスペース等のブラウザ既定動作（スクロール・ボタン押下）を止める
      if (inGame && this.capture && PREVENT.has(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    // ウィンドウからフォーカスが外れたら押しっぱなし状態を解除
    window.addEventListener('blur', () => this.down.clear());
  }

  addListener(fn) {
    this.listeners.unshift(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  _bindingsFor(index) {
    const b = settings.bindings;
    if (index === 0 && this.singlePlayer) {
      // 1人プレイでは 2P のキー（矢印キー・Enter）でも 1P を操作できる
      const merged = {};
      for (const a of Object.keys(b.p1)) merged[a] = [...b.p1[a], ...b.p2[a]];
      return merged;
    }
    return index === 0 ? b.p1 : b.p2;
  }

  _readPad(index) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[index];
    const prev = this.padPrev[index];
    const out = { x: 0, y: 0, jump: false, jumpPressed: false, action: false, actionPressed: false, resetPressed: false, pausePressed: false, connected: false };
    if (!pad) return out;
    out.connected = true;
    const dz = 0.22;
    const ax = pad.axes[0] || 0;
    const ay = pad.axes[1] || 0;
    out.x = Math.abs(ax) > dz ? ax : 0;
    out.y = Math.abs(ay) > dz ? -ay : 0;
    const btn = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    // 十字キー
    if (btn(12)) out.y = 1;
    if (btn(13)) out.y = -1;
    if (btn(14)) out.x = -1;
    if (btn(15)) out.x = 1;
    const now = { jump: btn(0), action: btn(2) || btn(1), reset: btn(3), pause: btn(9) };
    out.jump = now.jump;
    out.action = now.action;
    out.jumpPressed = now.jump && !prev.jump;
    out.actionPressed = now.action && !prev.action;
    out.resetPressed = now.reset && !prev.reset;
    out.pausePressed = now.pause && !prev.pause;
    this.padPrev[index] = now;
    return out;
  }

  // プレイヤー index の入力状態を取得
  getPlayerInput(index) {
    const b = this._bindingsFor(index);
    const any = (list) => list.some((c) => this.down.has(c));
    const anyPressed = (list) => list.some((c) => this.pressed.has(c));
    let x = (any(b.right) ? 1 : 0) - (any(b.left) ? 1 : 0);
    let y = (any(b.up) ? 1 : 0) - (any(b.down) ? 1 : 0);
    const pad = this._readPad(index);
    if (pad.x || pad.y) {
      x = pad.x;
      y = pad.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return {
      x,
      y,
      jump: any(b.jump) || pad.jump,
      jumpPressed: anyPressed(b.jump) || pad.jumpPressed,
      action: any(b.action) || pad.action,
      actionPressed: anyPressed(b.action) || pad.actionPressed,
      resetPressed: anyPressed(b.reset) || pad.resetPressed,
      pausePressed: pad.pausePressed,
    };
  }

  pausePressed() {
    return this.pressed.has('Escape') || this.pressed.has('KeyP');
  }

  // 1フレームの終わりに呼ぶ
  endFrame() {
    this.pressed.clear();
  }
}
