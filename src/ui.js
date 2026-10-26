// 画面（タイトル・ステージ選択・操作説明・設定・ポーズ・クリア）とHUD
import { settings } from './settings.js';
import { ACTION_LABELS } from './config.js';
import { STAGES } from './stages/index.js';
import { audio } from './audio.js';

const $ = (id) => document.getElementById(id);

export function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

// KeyboardEvent.code を読みやすい表記に
export function keyName(code) {
  if (!code) return '未設定';
  const map = {
    Space: 'スペース',
    Enter: 'Enter',
    NumpadEnter: 'テンキーEnter',
    ShiftLeft: '左Shift',
    ShiftRight: '右Shift',
    ControlLeft: '左Ctrl',
    ControlRight: '右Ctrl',
    AltLeft: '左Alt',
    AltRight: '右Alt',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backspace: 'BackSpace',
    Slash: '/',
    Period: '.',
    Comma: ',',
    Semicolon: ';',
    Quote: ':',
    Tab: 'Tab',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'テンキー' + code.slice(6);
  return code;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.current = null;
    this.stack = [];
    this.toastTimer = null;
    this.bigTimer = null;
    this.hintTimer = null;
    this.listening = null;
    this.lastHud = {};

    // ボタンの動作を一括で登録
    document.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        audio.unlock();
        audio.click();
        this.onAction(el.dataset.action);
      });
      el.addEventListener('mouseenter', () => audio.hover());
    });
    $('btn-pause').addEventListener('click', () => {
      audio.unlock();
      audio.click();
      this.game.togglePause();
    });
    // 最初の操作で音声を有効化
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    this.initSettings();
  }

  // ---------- 画面切替 ----------
  show(id, { push = false } = {}) {
    if (push && this.current) this.stack.push(this.current);
    if (!push) this.stack = [];
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    if (id) $(id).classList.remove('hidden');
    this.current = id;
    if (id === 'screen-howto') this.renderHowto();
    if (id === 'screen-settings') this.refreshSettings();
    // 先頭のボタンにフォーカス（キーボード操作用）
    if (id) {
      const first = $(id).querySelector('.btn, .stage-card');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 50);
    }
  }

  back() {
    this.stopListening();
    const prev = this.stack.pop();
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    if (prev) $(prev).classList.remove('hidden');
    this.current = prev || null;
  }

  onAction(action) {
    const g = this.game;
    switch (action) {
      case 'mode1':
        this.showStageSelect(1);
        break;
      case 'mode2':
        this.showStageSelect(2);
        break;
      case 'howto':
        this.show('screen-howto', { push: true });
        break;
      case 'settings':
        this.show('screen-settings', { push: true });
        break;
      case 'back':
        this.back();
        break;
      case 'resume':
        g.resume();
        break;
      case 'restart':
        g.restartStage();
        break;
      case 'checkpoint':
        g.resume();
        g.respawnAll();
        break;
      case 'title':
        g.goToTitle();
        break;
      case 'next':
        g.nextStage();
        break;
    }
  }

  showStageSelect(players) {
    $('stages-title').textContent = players === 1 ? 'ステージをえらぼう（1人プレイ）' : 'ステージをえらぼう（2人プレイ）';
    const list = $('stage-list');
    list.innerHTML = '';
    const colors = [
      ['#c9f7a8', '#fff3b0'],
      ['#f3dcff', '#ffd6ea'],
      ['#c7cdff', '#ffd2b8'],
      ['#ffd9a8', '#ffb38a'],
      ['#c9bfff', '#ff9fd6'],
      ['#dfe3ee', '#ffd27a'],
      ['#d6f3ff', '#9fd4ff'],
      ['#ffb3c7', '#b9a8ff'],
    ];
    STAGES.forEach((st, i) => {
      const rec = settings.records[st.id];
      const btn = document.createElement('button');
      btn.className = 'stage-card';
      btn.style.setProperty('--a', colors[i % colors.length][0]);
      btn.style.setProperty('--b', colors[i % colors.length][1]);
      btn.innerHTML = `
        <span class="num">STAGE ${i + 1}</span>
        <span class="name">${st.name}</span>
        <span class="sub">${st.subtitle}</span>
        <span class="rec">${rec ? `ベスト ${formatTime(rec.bestTime)} ／ ⭐${rec.bestStars}` : 'まだクリアしていません'}</span>`;
      btn.addEventListener('click', () => {
        audio.unlock();
        audio.click();
        this.game.startStage(i, players);
      });
      btn.addEventListener('mouseenter', () => audio.hover());
      list.appendChild(btn);
    });
    this.show('screen-stages', { push: true });
  }

  renderHowto() {
    for (const [p, id] of [['p1', 'howto-p1'], ['p2', 'howto-p2']]) {
      const b = settings.bindings[p];
      const ul = $(id);
      const move = `${keyName(b.up[0])} ${keyName(b.left[0])} ${keyName(b.down[0])} ${keyName(b.right[0])}`;
      ul.innerHTML = `
        <li><span>移動</span><kbd>${move}</kbd></li>
        <li><span>ジャンプ（長押しで高く）</span><kbd>${b.jump.map(keyName).join(' / ') || '未設定'}</kbd></li>
        <li><span>ダイブ（飛びこみ）</span><kbd>${b.action.map(keyName).join(' / ') || '未設定'}</kbd></li>
        <li><span>チェックポイントへ戻る</span><kbd>${b.reset.map(keyName).join(' / ') || '未設定'}</kbd></li>
        <li><span>ポーズ</span><kbd>Esc</kbd></li>`;
    }
  }

  // ---------- 設定画面 ----------
  initSettings() {
    const bindCheck = (id, key, after) => {
      $(id).addEventListener('change', (e) => {
        settings.set(key, e.target.checked);
        after && after();
      });
    };
    const bindRange = (id, key, valId, after) => {
      $(id).addEventListener('input', (e) => {
        settings.set(key, parseFloat(e.target.value));
        if (valId) $(valId).textContent = `×${parseFloat(e.target.value).toFixed(2)}`;
        after && after();
      });
    };
    bindCheck('set-sound', 'sound', () => audio.applyVolumes());
    bindRange('set-bgm', 'bgmVolume', null, () => audio.applyVolumes());
    bindRange('set-sfx', 'sfxVolume', null, () => {
      audio.applyVolumes();
      audio.jump();
    });
    bindCheck('set-shadows', 'shadows', () => this.game.applyGraphicsSettings());
    $('set-split').addEventListener('change', (e) => {
      settings.set('splitMode', e.target.value);
      this.game.applyGraphicsSettings();
    });
    bindRange('set-speed', 'speedMul', 'val-speed');
    bindRange('set-jump', 'jumpMul', 'val-jump');
    bindRange('set-air', 'airMul', 'val-air');
    bindRange('set-turn', 'turnMul', 'val-turn');
    $('btn-reset-tuning').addEventListener('click', () => {
      audio.click();
      settings.resetTuning();
      this.refreshSettings();
    });
    $('btn-reset-keys').addEventListener('click', () => {
      audio.click();
      settings.resetBindings();
      this.refreshSettings();
    });

    // キー設定の入力待ち
    this.game.input.addListener((e) => {
      if (!this.listening) {
        if (e.code === 'Escape' && this.current && this.current !== 'screen-title' && this.stack.length) {
          this.back();
          return true;
        }
        return false;
      }
      if (e.code === 'Escape') {
        this.stopListening();
        return true;
      }
      settings.setBinding(this.listening.player, this.listening.action, e.code);
      audio.click();
      this.stopListening();
      this.refreshSettings();
      return true;
    });
  }

  stopListening() {
    if (this.listening) this.listening.btn.classList.remove('listening');
    this.listening = null;
  }

  refreshSettings() {
    const v = settings.values;
    $('set-sound').checked = v.sound;
    $('set-bgm').value = v.bgmVolume;
    $('set-sfx').value = v.sfxVolume;
    $('set-shadows').checked = v.shadows;
    $('set-split').value = v.splitMode;
    $('set-speed').value = v.speedMul;
    $('set-jump').value = v.jumpMul;
    $('set-air').value = v.airMul;
    $('set-turn').value = v.turnMul;
    $('val-speed').textContent = `×${v.speedMul.toFixed(2)}`;
    $('val-jump').textContent = `×${v.jumpMul.toFixed(2)}`;
    $('val-air').textContent = `×${v.airMul.toFixed(2)}`;
    $('val-turn').textContent = `×${v.turnMul.toFixed(2)}`;

    const table = $('bind-table');
    table.innerHTML = '<div class="head">操作</div><div class="head" style="color:#ff7a45">1P</div><div class="head" style="color:#2e9bff">2P</div>';
    for (const action of Object.keys(ACTION_LABELS)) {
      const label = document.createElement('div');
      label.className = 'act';
      label.textContent = ACTION_LABELS[action];
      table.appendChild(label);
      for (const p of ['p1', 'p2']) {
        const btn = document.createElement('button');
        btn.className = 'bind-btn';
        btn.textContent = settings.bindings[p][action].map(keyName).join(' / ') || '未設定';
        btn.addEventListener('click', () => {
          audio.click();
          this.stopListening();
          this.listening = { player: p, action, btn };
          btn.classList.add('listening');
          btn.textContent = 'キーを押してください…';
          btn.blur();
        });
        table.appendChild(btn);
      }
    }
  }

  // ---------- HUD ----------
  showHud(on) {
    $('hud').classList.toggle('hidden', !on);
  }

  _set(id, text) {
    if (this.lastHud[id] !== text) {
      this.lastHud[id] = text;
      $(id).textContent = text;
    }
  }

  updateHud({ stageName, time, falls, stars, starTotal, checkpoint, checkpointTotal }) {
    this._set('hud-stage', stageName);
    this._set('hud-timer', formatTime(time));
    this._set('hud-falls', String(falls));
    this._set('hud-stars', `${stars}/${starTotal}`);
    this._set('hud-checkpoint', checkpoint > 0 ? `チェックポイント ${checkpoint}/${checkpointTotal}` : 'スタート');
  }

  setControlsHint(players) {
    const b = settings.bindings;
    const hint = $('controls-hint');
    const p1 = `<span style="color:#ff7a45">1P</span> ${keyName(b.p1.up[0])}${keyName(b.p1.left[0])}${keyName(b.p1.down[0])}${keyName(b.p1.right[0])} 移動 ／ ${keyName(b.p1.jump[0])} ジャンプ ／ ${keyName(b.p1.action[0])} ダイブ ／ ${keyName(b.p1.reset[0])} 復帰`;
    const p2 = `<span style="color:#2e9bff">2P</span> 矢印 移動 ／ ${keyName(b.p2.jump[0])} ジャンプ ／ ${keyName(b.p2.action[0])} ダイブ ／ ${keyName(b.p2.reset[0])} 復帰`;
    hint.innerHTML = players === 1 ? p1 + '<br>Esc ポーズ' : `${p1}<br>${p2}<br>Esc ポーズ`;
    hint.classList.remove('faded');
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => hint.classList.add('faded'), 9000);
  }

  setSplit(on) {
    $('split-divider').classList.toggle('hidden', !on);
    $('split-labels').classList.toggle('hidden', !on);
  }

  toast(text, ms = 1800) {
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    // アニメーションを再生し直す
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  big(text, ms = 900) {
    const el = $('big-text');
    el.textContent = text;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this.bigTimer);
    if (ms > 0) this.bigTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  hideBig() {
    clearTimeout(this.bigTimer);
    $('big-text').classList.add('hidden');
  }

  showClear({ stageIndex, time, falls, stars, starTotal, newBest, isLast, players }) {
    $('clear-title').textContent = isLast ? '全ステージクリア！' : 'ステージクリア！';
    $('clear-stage').textContent = `STAGE ${stageIndex + 1}「${STAGES[stageIndex].name}」`;
    $('clear-time').textContent = formatTime(time);
    $('clear-best').textContent = newBest ? '★ ベスト記録！' : '';
    $('clear-falls').textContent = String(falls);
    $('clear-stars').textContent = `${stars}/${starTotal}`;
    let msg;
    if (falls === 0) msg = '一度も落ちずにクリア！ すごい！';
    else if (falls < 5) msg = 'ナイスチャレンジ！';
    else msg = 'あきらめずにゴール！ えらい！';
    if (stars === starTotal) msg += ' スターもぜんぶ集めたね！';
    if (isLast) msg = (players === 2 ? 'ふたりで' : '') + 'すべてのステージをクリアしました！ おめでとう！';
    $('clear-msg').textContent = msg;
    $('btn-next').classList.toggle('hidden', isLast);
    this.show('screen-clear');
  }
}
