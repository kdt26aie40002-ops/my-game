// 設定・キー割り当て・ベストタイムの保存（ブラウザの localStorage）
import { DEFAULT_BINDINGS } from './config.js';

const KEY = 'bouncy-buddies-save-v1';

const DEFAULTS = {
  sound: true,
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  shadows: true,
  splitMode: 'auto',    // 'auto' | 'shared' | 'split'
  speedMul: 1.0,        // 移動速度の倍率
  jumpMul: 1.0,         // ジャンプ力の倍率
  airMul: 1.0,          // 空中制御の倍率
  turnMul: 1.0,         // 向き直る速さの倍率
};

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    this.bindings = clone(DEFAULT_BINDINGS);
    this.records = {}; // stageId -> { bestTime, bestStars }
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      Object.assign(this.values, data.values || {});
      if (data.bindings) {
        for (const p of ['p1', 'p2']) {
          for (const a of Object.keys(DEFAULT_BINDINGS[p])) {
            const list = data.bindings[p]?.[a];
            if (Array.isArray(list) && list.length) this.bindings[p][a] = list;
          }
        }
      }
      this.records = data.records || {};
    } catch {
      // 保存データが壊れている・使えない場合は初期値のまま
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ values: this.values, bindings: this.bindings, records: this.records }));
    } catch {
      // プライベートモード等で保存できない場合は無視
    }
  }

  get(name) {
    return this.values[name];
  }

  set(name, value) {
    this.values[name] = value;
    this.save();
  }

  resetTuning() {
    for (const k of ['speedMul', 'jumpMul', 'airMul', 'turnMul']) this.values[k] = DEFAULTS[k];
    this.save();
  }

  resetBindings() {
    this.bindings = clone(DEFAULT_BINDINGS);
    this.save();
  }

  setBinding(player, action, code) {
    // 同じキーが他の操作に使われていたら外す（キーの重複による干渉を防ぐ）
    for (const p of ['p1', 'p2']) {
      for (const a of Object.keys(this.bindings[p])) {
        this.bindings[p][a] = this.bindings[p][a].filter((c) => c !== code);
      }
    }
    this.bindings[player][action] = [code];
    this.save();
  }

  recordClear(stageId, time, stars) {
    const r = this.records[stageId] || {};
    const newBest = r.bestTime == null || time < r.bestTime;
    if (newBest) r.bestTime = time;
    r.bestStars = Math.max(r.bestStars || 0, stars);
    this.records[stageId] = r;
    this.save();
    return newBest;
  }
}

export const settings = new Settings();
