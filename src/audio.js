// 効果音とBGM（Web Audio API で音を合成するので音声ファイル不要・ライセンス問題なし）
import { settings } from './settings.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmNextTime = 0;
    this.bgmTheme = 0;
    this.noiseBuffer = null;
    this.lastPlay = {};
  }

  // ブラウザの制約により、最初のクリック/キー入力後に初期化する
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const on = settings.get('sound');
    this.master.gain.value = on ? 1 : 0;
    this.sfxGain.gain.value = settings.get('sfxVolume') * 0.6;
    this.bgmGain.gain.value = settings.get('bgmVolume') * 0.22;
  }

  _ok(name, minGap = 0.04) {
    if (!this.ctx || !settings.get('sound')) return false;
    const t = this.ctx.currentTime;
    if (this.lastPlay[name] && t - this.lastPlay[name] < minGap) return false;
    this.lastPlay[name] = t;
    return true;
  }

  _tone({ type = 'sine', f0, f1 = f0, dur = 0.15, vol = 0.5, delay = 0, attack = 0.005, dest }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise({ dur = 0.15, vol = 0.4, freq = 800, q = 1, type = 'lowpass', delay = 0, f1 }) {
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    if (f1) filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---- 効果音 ----
  jump(pitch = 1) {
    if (!this._ok('jump')) return;
    this._tone({ type: 'square', f0: 300 * pitch, f1: 720 * pitch, dur: 0.14, vol: 0.18 });
    this._tone({ type: 'sine', f0: 600 * pitch, f1: 1100 * pitch, dur: 0.12, vol: 0.15 });
  }
  land(strength = 1) {
    if (!this._ok('land', 0.06)) return;
    const s = Math.min(1, strength);
    this._tone({ type: 'sine', f0: 180, f1: 60, dur: 0.14, vol: 0.35 * s + 0.1 });
    this._noise({ dur: 0.08, vol: 0.15 * s, freq: 900 });
  }
  bump(strength = 1) {
    if (!this._ok('bump', 0.08)) return;
    const s = Math.min(1.2, strength);
    this._tone({ type: 'triangle', f0: 240, f1: 90, dur: 0.22, vol: 0.4 * s });
    this._noise({ dur: 0.15, vol: 0.3 * s, freq: 1800, f1: 300 });
    this._tone({ type: 'sine', f0: 900, f1: 1400, dur: 0.12, vol: 0.12, delay: 0.05 });
  }
  boing() {
    if (!this._ok('boing')) return;
    this._tone({ type: 'sine', f0: 160, f1: 900, dur: 0.35, vol: 0.4 });
    this._tone({ type: 'triangle', f0: 320, f1: 1300, dur: 0.3, vol: 0.15, delay: 0.03 });
  }
  dive() {
    if (!this._ok('dive')) return;
    this._noise({ dur: 0.25, vol: 0.25, freq: 600, f1: 2500, type: 'bandpass', q: 2 });
  }
  fall() {
    if (!this._ok('fall', 0.3)) return;
    this._tone({ type: 'sine', f0: 1200, f1: 180, dur: 0.8, vol: 0.25 });
    this._tone({ type: 'triangle', f0: 1210, f1: 190, dur: 0.8, vol: 0.12 });
  }
  respawn() {
    if (!this._ok('respawn')) return;
    [523, 784].forEach((f, i) => this._tone({ type: 'sine', f0: f, dur: 0.12, vol: 0.2, delay: i * 0.07 }));
  }
  checkpoint() {
    if (!this._ok('cp', 0.2)) return;
    [523, 659, 784, 1047].forEach((f, i) => this._tone({ type: 'square', f0: f, dur: 0.16, vol: 0.12, delay: i * 0.08 }));
    [523, 659, 784, 1047].forEach((f, i) => this._tone({ type: 'sine', f0: f * 2, dur: 0.2, vol: 0.08, delay: i * 0.08 }));
  }
  star() {
    if (!this._ok('star', 0.05)) return;
    [1047, 1319, 1568, 2093].forEach((f, i) => this._tone({ type: 'sine', f0: f, dur: 0.18, vol: 0.14, delay: i * 0.04 }));
  }
  click() {
    if (!this._ok('click', 0.03)) return;
    this._tone({ type: 'square', f0: 880, f1: 1320, dur: 0.06, vol: 0.1 });
  }
  hover() {
    if (!this._ok('hover', 0.05)) return;
    this._tone({ type: 'sine', f0: 1200, dur: 0.04, vol: 0.05 });
  }
  switchOn() {
    if (!this._ok('switch', 0.1)) return;
    this._tone({ type: 'square', f0: 400, f1: 800, dur: 0.1, vol: 0.12 });
  }
  crumble() {
    if (!this._ok('crumble', 0.15)) return;
    this._noise({ dur: 0.45, vol: 0.3, freq: 500, f1: 150 });
    this._tone({ type: 'triangle', f0: 140, f1: 70, dur: 0.3, vol: 0.2 });
  }
  gate() {
    if (!this._ok('gate', 0.3)) return;
    this._noise({ dur: 0.5, vol: 0.2, freq: 300, f1: 120 });
  }
  countdown(final = false) {
    if (!this._ok('count', 0.2)) return;
    this._tone({ type: 'square', f0: final ? 1047 : 523, dur: final ? 0.4 : 0.15, vol: 0.15 });
  }
  clear() {
    if (!this._ok('clear', 1)) return;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => {
      this._tone({ type: 'square', f0: f, dur: 0.22, vol: 0.12, delay: i * 0.11 });
      this._tone({ type: 'triangle', f0: f / 2, dur: 0.25, vol: 0.15, delay: i * 0.11 });
    });
    this._noise({ dur: 1.2, vol: 0.08, freq: 6000, type: 'highpass', delay: 0.9 });
  }

  // ---- BGM（シンプルな自作ループ曲を逐次スケジュール） ----
  startBgm(theme = 0) {
    if (!this.ctx) return;
    this.bgmTheme = theme;
    if (this.bgmTimer) return;
    this.bgmStep = 0;
    this.bgmNextTime = this.ctx.currentTime + 0.1;
    this.bgmTimer = setInterval(() => this._scheduleBgm(), 50);
  }
  stopBgm() {
    if (this.bgmTimer) clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  }

  _scheduleBgm() {
    if (!this.ctx) return;
    const themes = [
      // [テンポ(BPM), 移調(半音), メロディ, ベース] 0=休符
      { bpm: 118, tr: 0 },
      { bpm: 128, tr: 2 },
      { bpm: 136, tr: -3 },
      { bpm: 100, tr: 5 },
      { bpm: 146, tr: -2 },
      { bpm: 140, tr: 3 },
      { bpm: 152, tr: -5 },
      { bpm: 132, tr: 7 },
    ];
    const th = themes[this.bgmTheme % themes.length];
    const stepDur = 60 / th.bpm / 2; // 8分音符
    // ペンタトニックの明るいメロディ（32ステップ）
    const melody = [
      0, 4, 7, 9, 7, 4, 2, 0, 2, 4, 7, 4, 2, -1, 0, -1,
      0, 4, 7, 12, 9, 7, 9, 12, 14, 12, 9, 7, 4, 7, 4, 2,
    ];
    const bass = [0, 0, 7, 7, 5, 5, 7, 7];
    const chordRoots = [0, 0, 5, 5, -3, -3, 7, 7];
    // タブが非表示だった等で遅れた場合は、まとめて鳴らさずに追いつかせる
    if (this.bgmNextTime < this.ctx.currentTime - 0.1) this.bgmNextTime = this.ctx.currentTime + 0.05;
    while (this.bgmNextTime < this.ctx.currentTime + 0.25) {
      const s = this.bgmStep % 32;
      const t = this.bgmNextTime - this.ctx.currentTime;
      const base = 523.25 * Math.pow(2, th.tr / 12);
      const m = melody[s];
      if (m >= 0 && (s % 2 === 0 || s > 16)) {
        this._tone({ type: 'triangle', f0: base * Math.pow(2, m / 12), dur: stepDur * 1.6, vol: 0.32, delay: t, dest: this.bgmGain });
      }
      if (s % 4 === 0) {
        const bi = Math.floor(s / 4) % 8;
        const bf = (base / 4) * Math.pow(2, chordRoots[bi] / 12);
        this._tone({ type: 'sine', f0: bf, dur: stepDur * 3.5, vol: 0.5, delay: t, dest: this.bgmGain });
        this._tone({ type: 'square', f0: bf * 2 * Math.pow(2, bass[bi] / 12), dur: stepDur * 0.8, vol: 0.06, delay: t + stepDur * 2, dest: this.bgmGain });
      }
      // ハイハット風
      if (s % 2 === 1) {
        const ctx = this.ctx;
        const st = ctx.currentTime + t;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.08, st);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.05);
        src.connect(f);
        f.connect(g);
        g.connect(this.bgmGain);
        src.start(st);
        src.stop(st + 0.07);
      }
      this.bgmNextTime += stepDur;
      this.bgmStep++;
    }
  }
}

export const audio = new AudioManager();
