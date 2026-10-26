// ゲーム全体の進行管理：ステージ読み込み、固定ステップの物理更新、描画、
// チェックポイント・落下・ゴール判定、ポーズ、1人/2人モード
import * as THREE from 'three';
import { initPhysics, PhysicsWorld } from './physics.js';
import { PHYSICS, PLAYER_STYLES } from './config.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { Input } from './input.js';
import { Environment } from './environment.js';
import { Effects } from './effects.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { settings } from './settings.js';
import { STAGES } from './stages/index.js';

const NO_INPUT = { x: 0, y: 0, jump: false, jumpPressed: false, action: false, actionPressed: false, resetPressed: false, pausePressed: false };

export class Game {
  constructor(container) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.env = new Environment(this.scene);
    this.effects = new Effects(this.scene);
    this.input = new Input();
    this.rig = new CameraRig();
    this.demoCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);

    this.physics = null;
    this.level = null;
    this.players = [];
    this.playerCount = 1;
    this.stageIndex = 0;
    this.state = 'loading'; // loading | demo | countdown | playing | paused | cleared
    this.pausedFrom = null;
    this.cameraYaw = 0; // カメラの向き（0 = -Z 方向を向く）
    this.accumulator = 0;
    this.time = 0;
    this.stageTime = 0;
    this.falls = 0;
    this.starsCollected = 0;
    this.checkpoint = null;
    this.countdown = 0;
    this.goalWait = -1;
    this.lastFrame = performance.now();
    this.split = false;

    this.ui = new UI(this);

    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (this.state === 'playing' || this.state === 'countdown')) this.pause();
    });
    // デバッグ・自動テスト用
    window.__bouncy = this;
  }

  async init() {
    await initPhysics();
    this.applyGraphicsSettings();
    this.loadStage(0, 2, true);
    this.ui.show('screen-title');
    this.renderer.setAnimationLoop(() => this.frame());
  }

  applyGraphicsSettings() {
    this.env.sun.castShadow = settings.get('shadows');
    this.rig.mode = settings.get('splitMode');
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ------------------------------------------------------------
  // ステージ管理
  // ------------------------------------------------------------
  loadStage(index, playerCount, demo = false) {
    // 前のステージを破棄
    for (const p of this.players) p.dispose();
    this.players = [];
    if (this.level) this.level.dispose();
    if (this.physics) this.physics.dispose();
    this.effects.clear();

    this.stageIndex = index;
    this.playerCount = playerCount;
    this.physics = new PhysicsWorld();
    const def = STAGES[index];
    this.level = new Level(this, def);
    this.env.setTheme(def.theme);

    for (let i = 0; i < playerCount; i++) {
      const pos = this.spawnPosition(i, null);
      const p = new Player(this, i, PLAYER_STYLES[i], pos, this.level.spawnYaw);
      this.players.push(p);
    }
    this.checkpoint = null;
    this.stageTime = 0;
    this.falls = 0;
    this.starsCollected = 0;
    this.goalWait = -1;
    this.accumulator = 0;
    this.input.singlePlayer = playerCount === 1;
    this.rig.mode = demo ? 'shared' : settings.get('splitMode');
    this.rig.reset(this.players, this.cameraYaw);
    this.split = false;
    this.ui.setSplit(false);

    if (demo) {
      this.state = 'demo';
      this.input.capture = false;
      for (const p of this.players) p.ai = { timer: Math.random(), x: 0, y: 0 };
      this.ui.showHud(false);
    } else {
      this.state = 'countdown';
      this.input.capture = true;
      this.countdown = 3.0;
      this.lastCount = 4;
      for (const p of this.players) p.enabled = false;
      this.ui.showHud(true);
      this.ui.setControlsHint(playerCount);
      this.ui.hideBig();
    }
    audio.stopBgm();
    audio.startBgm(demo ? 3 : def.bgmTheme);
  }

  startStage(index, playerCount) {
    if (document.activeElement) document.activeElement.blur();
    this.ui.show(null);
    this.loadStage(index, playerCount, false);
  }

  restartStage() {
    this.startStage(this.stageIndex, this.playerCount);
  }

  nextStage() {
    if (this.stageIndex + 1 < STAGES.length) this.startStage(this.stageIndex + 1, this.playerCount);
    else this.goToTitle();
  }

  goToTitle() {
    this.loadStage(0, 2, true);
    this.ui.show('screen-title');
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'countdown') return;
    this.pausedFrom = this.state;
    this.state = 'paused';
    this.ui.show('screen-pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    if (document.activeElement) document.activeElement.blur();
    this.state = this.pausedFrom || 'playing';
    this.ui.show(null);
    this.lastFrame = performance.now();
  }

  togglePause() {
    if (document.activeElement) document.activeElement.blur();
    if (this.state === 'paused') {
      // 設定画面などを開いている時はその画面を閉じるだけ
      if (this.ui.current === 'screen-pause') this.resume();
    } else this.pause();
  }

  // ------------------------------------------------------------
  // 復帰（リスポーン）
  // ------------------------------------------------------------
  spawnPosition(index, cp) {
    const base = cp ? cp.pos.clone().add(new THREE.Vector3(0, 1.3, -0.5)) : this.level.spawn.clone();
    if (this.playerCount > 1) base.x += index === 0 ? -1.2 : 1.2;
    return base;
  }

  respawnPlayer(p) {
    const pos = this.spawnPosition(p.index, this.checkpoint);
    p.respawn(pos, this.checkpoint ? this.checkpoint.yaw : this.level.spawnYaw);
    audio.respawn();
  }

  // R キー：チェックポイントへ戻る（先に進んだ相棒に追いつく手段にもなる）
  requestRespawn(p) {
    if (this.state !== 'playing') return;
    this.respawnPlayer(p);
  }

  respawnAll() {
    for (const p of this.players) this.respawnPlayer(p);
  }

  onPlayerFell(p) {
    this.falls++;
    p.fallCount++;
    audio.fall();
    this.ui.toast(this.playerCount > 1 ? `${p.style.name} が落ちちゃった！` : '落ちちゃった！ もう一回！', 1300);
    this.respawnPlayer(p);
  }

  // ------------------------------------------------------------
  // 固定ステップ更新（物理）
  // ------------------------------------------------------------
  fixedUpdate(dt) {
    const players = this.players;
    this.level.fixedUpdate(dt, players);
    for (const p of players) p.fixedUpdate(dt);

    // ダイブで相棒を突きとばす
    if (players.length === 2) {
      const [a, b] = players;
      for (const [x, y] of [[a, b], [b, a]]) {
        if (!x.diving || y.stunned) continue;
        const px = x.body.translation();
        const py = y.body.translation();
        const dx = py.x - px.x;
        const dz = py.z - px.z;
        const d = Math.hypot(dx, dz);
        if (d < 1.25 && Math.abs(py.y - px.y) < 1.4) {
          const v = x.body.linvel();
          const sp = Math.hypot(v.x, v.z);
          if (sp > 4) {
            y.body.applyImpulse({ x: (v.x / sp) * 7 * y.mass, y: 4 * y.mass, z: (v.z / sp) * 7 * y.mass }, true);
            y.hasExpected = false;
            y.knockOut(12);
            x.diveTimer = Math.min(x.diveTimer, 0.2);
          }
        }
      }
    }

    this.physics.step();

    if (this.state === 'demo' || this.state === 'cleared') {
      for (const p of players) if (p.body.translation().y < this.level.killY) this.respawnPlayer(p);
      return;
    }

    for (const p of players) {
      const pos = p.body.translation();
      // 落下判定
      if (pos.y < this.level.killY) {
        this.onPlayerFell(p);
        continue;
      }
      // チェックポイント（2人で共有。より先のものだけ有効）
      const cp = this.level.checkpointAt(pos);
      if (cp && (!this.checkpoint || cp.index > this.checkpoint.index)) {
        this.checkpoint = cp;
        this.level.activateCheckpoint(cp);
        audio.checkpoint();
        this.ui.toast(`🚩 チェックポイント ${cp.index}！`);
      }
      // スター
      for (const s of this.level.stars) {
        if (s.collected) continue;
        if (Math.hypot(pos.x - s.pos.x, pos.y - s.pos.y, pos.z - s.pos.z) < 1.25) {
          s.collected = true;
          this.starsCollected++;
          audio.star();
          this.effects.burst(s.pos.clone(), 0xffd23f, 14, 4);
        }
      }
      // ゴール
      if (this.state === 'playing' && !p.finished && this.level.inGoal(pos)) {
        p.finished = true;
        this.effects.confetti(this.level.goal.pos.clone().add(new THREE.Vector3(0, 3, 0)), 50);
        if (players.every((q) => q.finished)) {
          this.onClear();
          return;
        }
        // 2人プレイ：先にゴールした場合は相棒を少し待つ
        this.goalWait = 15;
        audio.checkpoint();
        this.ui.toast(`${p.style.name} がゴール！ 相棒を待っています…`, 2500);
      }
    }

    if (this.state === 'playing' && this.goalWait > 0) {
      this.goalWait -= dt;
      if (this.goalWait <= 0) this.onClear();
    }
  }

  onClear() {
    if (this.state !== 'playing') return;
    this.state = 'cleared';
    this.input.capture = false;
    for (const p of this.players) p.enabled = false;
    audio.clear();
    this.effects.confetti(this.level.goal.pos.clone().add(new THREE.Vector3(0, 4, 0)), 120);
    const def = STAGES[this.stageIndex];
    const newBest = settings.recordClear(def.id, this.stageTime, this.starsCollected);
    this.ui.big('GOAL!', 1600);
    const stats = {
      stageIndex: this.stageIndex,
      time: this.stageTime,
      falls: this.falls,
      stars: this.starsCollected,
      starTotal: this.level.stars.length,
      newBest,
      isLast: this.stageIndex === STAGES.length - 1,
      players: this.playerCount,
    };
    setTimeout(() => {
      if (this.state === 'cleared') this.ui.showClear(stats);
    }, 1700);
  }

  // タイトル画面の背景で動くキャラクター（簡単な自動操作）
  demoInput(p, dt) {
    const ai = p.ai;
    ai.timer -= dt;
    const pos = p.body.translation();
    const home = this.level.spawn;
    const inp = { ...NO_INPUT };
    if (ai.timer <= 0) {
      ai.timer = 0.6 + Math.random() * 1.6;
      const r = Math.random();
      if (r < 0.3) {
        ai.x = 0;
        ai.y = 0;
      } else {
        const a = Math.random() * Math.PI * 2;
        ai.x = Math.cos(a);
        ai.y = Math.sin(a);
      }
      if (Math.random() < 0.5) inp.jumpPressed = true;
      if (Math.random() < 0.08) inp.actionPressed = true;
    }
    // スタート地点から離れすぎないように
    const dx = pos.x - home.x;
    const dz = pos.z - home.z;
    if (Math.hypot(dx, dz) > 3.5) {
      ai.x = -Math.sign(dx) * 0.8;
      ai.y = Math.sign(dz) * 0.8;
    }
    inp.x = ai.x;
    inp.y = ai.y;
    inp.jump = true;
    return inp;
  }

  // ------------------------------------------------------------
  // 毎フレームの処理
  // ------------------------------------------------------------
  frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.time += dt;

    // 入力（ゲームパッドのボタン押下判定のため毎フレーム読む）
    const inputs = this.players.map((p, i) => (this.state === 'demo' ? this.demoInput(p, dt) : this.input.getPlayerInput(i)));
    const pausePressed = this.input.pausePressed() || inputs.some((i) => i.pausePressed);
    if (pausePressed) {
      if (this.state === 'playing' || this.state === 'countdown') this.pause();
      else if (this.state === 'paused' && this.ui.current === 'screen-pause') this.resume();
    }

    // カウントダウン
    if (this.state === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastCount && n > 0) {
        this.lastCount = n;
        this.ui.big(String(n), 900);
        audio.countdown(false);
      }
      if (this.countdown <= 0) {
        this.state = 'playing';
        for (const p of this.players) p.enabled = true;
        this.ui.big('GO!', 800);
        audio.countdown(true);
      }
    }

    const running = this.state === 'demo' || this.state === 'countdown' || this.state === 'playing' || this.state === 'cleared';
    if (running) {
      this.players.forEach((p, i) => p.handleInput(this.state === 'demo' || this.state === 'playing' ? inputs[i] : NO_INPUT));
      if (this.state === 'demo') this.players.forEach((p) => (p.enabled = true));
      if (this.state === 'playing') this.stageTime += dt;

      // 固定時間ステップ：フレームレートに関係なく物理を一定間隔で進める
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= PHYSICS.fixedDt && steps < PHYSICS.maxSubSteps) {
        this.fixedUpdate(PHYSICS.fixedDt);
        this.accumulator -= PHYSICS.fixedDt;
        steps++;
        if (!this.physics) break;
      }
      if (steps >= PHYSICS.maxSubSteps) this.accumulator = 0;
    }

    // 描画（物理ステップ間を補間して滑らかに）
    const alpha = running ? this.accumulator / PHYSICS.fixedDt : 1;
    this.physics.interpolate(alpha);
    for (const p of this.players) p.frameUpdate(dt, this.playerCount > 1 && this.state !== 'demo');
    if (this.state !== 'paused') {
      this.level.frameUpdate(dt, this.time);
      this.effects.update(dt);
    }

    if (this.state !== 'demo' && this.state !== 'loading') {
      this.ui.updateHud({
        stageName: `STAGE ${this.stageIndex + 1}  ${STAGES[this.stageIndex].name}`,
        time: this.stageTime,
        falls: this.falls,
        stars: this.starsCollected,
        starTotal: this.level.stars.length,
        checkpoint: this.checkpoint ? this.checkpoint.index : 0,
        checkpointTotal: this.level.checkpoints.length,
      });
    }

    this.render(dt);
    this.input.endFrame();
  }

  render(dt) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const r = this.renderer;
    const camDt = this.state === 'paused' ? 0 : dt;

    let viewports;
    const focus = new THREE.Vector3();
    let spread = 0;
    if (this.state === 'demo') {
      // タイトル画面：スタート地点の周りをゆっくり回るカメラ
      const c = this.level.spawn;
      const a = this.time * 0.12;
      this.demoCamera.position.set(c.x + Math.sin(a) * 13, c.y + 5.5, c.z + Math.cos(a) * 13 - 2);
      this.demoCamera.lookAt(c.x, c.y + 0.8, c.z - 6);
      this.demoCamera.aspect = w / h;
      this.demoCamera.updateProjectionMatrix();
      viewports = [{ camera: this.demoCamera, x: 0, y: 0, w, h }];
      focus.copy(c);
    } else {
      viewports = this.rig.update(camDt, this.players, this.cameraYaw, this.physics, w, h);
      for (const p of this.players) focus.add(p.renderPosition);
      focus.multiplyScalar(1 / this.players.length);
      if (this.players.length > 1) spread = this.players[0].renderPosition.distanceTo(this.players[1].renderPosition);
    }
    const isSplit = viewports.length > 1;
    if (isSplit !== this.split) {
      this.split = isSplit;
      this.ui.setSplit(isSplit);
    }
    this.env.update(camDt, focus, spread);

    r.shadowMap.needsUpdate = true;
    r.setScissorTest(true);
    for (const vp of viewports) {
      r.setViewport(vp.x, vp.y, vp.w, vp.h);
      r.setScissor(vp.x, vp.y, vp.w, vp.h);
      r.render(this.scene, vp.camera);
    }
    r.setScissorTest(false);
  }
}
