// プレイヤー：Rapier の動的剛体（カプセル）に力・速度・角速度を与えて操作する
// 位置を直接ワープさせず、物理演算で移動・ジャンプ・転倒・起き上がりを行います。
import * as THREE from 'three';
import { RAPIER } from './physics.js';
import { PLAYER, PHYSICS } from './config.js';
import { settings } from './settings.js';
import { CharacterModel } from './character.js';
import { audio } from './audio.js';

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = { x: 0, y: -1, z: 0 };
const RAY_OFFSETS = [
  [0, 0],
  [0.28, 0],
  [-0.28, 0],
  [0, 0.28],
  [0, -0.28],
];

// カプセルの体積 × 密度 = 質量（Rapier と同じ計算）
const MASS =
  PLAYER.density *
  (Math.PI * PLAYER.radius * PLAYER.radius * PLAYER.halfHeight * 2 + (4 / 3) * Math.PI * Math.pow(PLAYER.radius, 3));

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function makeNameTag(text, color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(8, 8, 112, 48, 24);
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 64, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(0.9, 0.45, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export class Player {
  constructor(game, index, style, spawn, yaw = Math.PI) {
    this.game = game;
    this.index = index;
    this.style = style;
    const world = game.physics.world;

    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawn.x, spawn.y, spawn.z)
      .setCcdEnabled(true) // 高速移動時のすり抜け防止
      .setLinearDamping(0.05)
      .setAngularDamping(0.8)
      .setCanSleep(false);
    this.body = world.createRigidBody(desc);
    const cdesc = RAPIER.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius)
      .setFriction(0) // 移動は速度制御で行うので摩擦なし（壁に張り付くのも防ぐ）
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(PLAYER.restitution)
      .setDensity(PLAYER.density);
    this.collider = world.createCollider(cdesc, this.body);
    this.mass = MASS;

    this.model = new CharacterModel(style);
    game.scene.add(this.model.root);
    this.sync = game.physics.sync(this.body, this.model.root);

    this.tag = makeNameTag(style.name, style.label);
    game.scene.add(this.tag);

    // 状態
    this.grounded = false;
    this.wasGrounded = false;
    this.ground = null;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.actionBuffer = 0;
    this.jumpHeld = false;
    this.jumpLock = 0;
    this.jumping = false;
    this.stunTimer = 0;
    this.recoverTimer = 0;
    this.diveTimer = 0;
    this.diveCooldown = 0;
    this.grace = 0.5;
    this.lastAirVy = 0;
    this.facingYaw = yaw;
    this.moveInput = new THREE.Vector2();
    this.carryVel = new THREE.Vector3();
    this.expected = new THREE.Vector3();
    this.hasExpected = false;
    this.finished = false;
    this.fallCount = 0;
    this.footstepTimer = 0;
    this.enabled = true;
    this.ai = null;

    this._v = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._fw = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._tmp = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this.setYaw(yaw);
  }

  get position() {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  // 描画用（補間済み）の位置
  get renderPosition() {
    return this.model.root.position;
  }

  get stunned() {
    return this.stunTimer > 0;
  }

  get diving() {
    return this.diveTimer > 0;
  }

  setYaw(yaw) {
    this.facingYaw = yaw;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    this.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
  }

  // フレームごとの入力（押した瞬間の入力はバッファに貯めて固定ステップで消費）
  handleInput(input) {
    if (!this.enabled) {
      this.moveInput.set(0, 0);
      this.jumpHeld = false;
      return;
    }
    this.moveInput.set(input.x, input.y);
    this.jumpHeld = input.jump;
    if (input.jumpPressed) this.jumpBuffer = PLAYER.jumpBuffer;
    if (input.actionPressed) this.actionBuffer = 0.12;
    if (input.resetPressed) this.game.requestRespawn(this);
  }

  checkGround() {
    const t = this.body.translation();
    const reach = PLAYER.halfHeight + PLAYER.radius + 0.2;
    let best = null;
    for (const [ox, oz] of RAY_OFFSETS) {
      const hit = this.game.physics.rayCast({ x: t.x + ox, y: t.y, z: t.z + oz }, DOWN, reach, { excludeBody: this.body });
      if (hit && hit.normal.y > 0.5 && (!best || hit.distance < best.distance)) best = hit;
    }
    return best;
  }

  knockOut(strength = 10) {
    if (this.stunTimer > 0 || this.grace > 0) return;
    this.stunTimer = PLAYER.stunTime;
    this.diveTimer = 0;
    this.jumping = false;
    audio.bump(strength / 10);
    this.model.impulseSquash(-3);
    // ランダムな回転を加えてコミカルに転がる
    const av = this.body.angvel();
    this.body.setAngvel({ x: av.x + (Math.random() - 0.5) * 8, y: av.y + (Math.random() - 0.5) * 6, z: av.z + (Math.random() - 0.5) * 8 }, true);
    const p = this.body.translation();
    this.game.effects.burst(new THREE.Vector3(p.x, p.y + 0.5, p.z), 0xffe14d, 8, 3);
  }

  fixedUpdate(dt) {
    const b = this.body;
    const level = this.game.level;
    const lv = b.linvel();
    const vel = this._v.set(lv.x, lv.y, lv.z);
    const t = b.translation();

    // タイマー
    this.jumpBuffer -= dt;
    this.actionBuffer -= dt;
    this.jumpLock -= dt;
    this.diveCooldown -= dt;
    this.grace -= dt;
    if (this.diveTimer > 0) this.diveTimer -= dt;
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      if (this.stunTimer <= 0) {
        this.recoverTimer = 0.5;
        if (this.grounded) b.applyImpulse({ x: 0, y: PLAYER.getUpHop * this.mass, z: 0 }, true);
      }
    }
    if (this.recoverTimer > 0) this.recoverTimer -= dt;

    // --- 外部からの衝撃を検出（障害物や他プレイヤーとの衝突）---
    if (this.hasExpected) {
      const impact = Math.hypot(vel.x - this.expected.x, vel.z - this.expected.z);
      if (impact > PLAYER.stunImpact) this.knockOut(impact);
      else if (impact > 4.5) audio.bump(0.35);
    }

    // --- 接地判定 ---
    this.wasGrounded = this.grounded;
    this.ground = this.jumpLock > 0 ? null : this.checkGround();
    this.grounded = !!this.ground;
    if (this.grounded) {
      this.coyote = PLAYER.coyoteTime;
      if (!this.wasGrounded) {
        const fallSpeed = -this.lastAirVy;
        if (fallSpeed > 3.5) {
          audio.land(fallSpeed / 14);
          this.model.impulseSquash(-Math.min(9, fallSpeed * 0.45));
          this.game.effects.dust(new THREE.Vector3(t.x, t.y - 0.8, t.z), Math.min(10, 3 + fallSpeed * 0.4));
        }
        this.jumping = false;
      }
    } else {
      this.coyote -= dt;
      this.lastAirVy = vel.y;
    }

    // 足場の速度（動く床に乗っている時に一緒に運ばれる）
    const platVel = this._tmp.set(0, 0, 0);
    if (this.ground) {
      const pv = level.getPointVelocity(this.ground.collider, t);
      if (pv) platVel.copy(pv);
      this.carryVel.set(platVel.x, 0, platVel.z);
    } else {
      this.carryVel.multiplyScalar(Math.max(0, 1 - dt * 0.6));
    }

    // --- 移動入力をカメラ基準のワールド方向に変換 ---
    const camYaw = this.game.cameraYaw;
    const fwX = -Math.sin(camYaw);
    const fwZ = -Math.cos(camYaw);
    const rtX = Math.cos(camYaw);
    const rtZ = -Math.sin(camYaw);
    const dir = this._dir.set(rtX * this.moveInput.x + fwX * this.moveInput.y, 0, rtZ * this.moveInput.x + fwZ * this.moveInput.y);
    const hasInput = dir.lengthSq() > 0.01;

    const s = settings.values;
    const stunned = this.stunTimer > 0;
    const diving = this.diveTimer > 0;
    const speed = PLAYER.moveSpeed * s.speedMul;
    const target = this._target.copy(dir).multiplyScalar(stunned ? 0 : speed).add(this.carryVel);

    let accel;
    if (this.grounded) accel = hasInput ? PLAYER.groundAccel : PLAYER.groundDecel;
    else accel = (hasInput ? PLAYER.airAccel : PLAYER.airDecel) * s.airMul;
    if (this.grounded && this.ground.normal.y < PLAYER.slopeSlideNormalY) accel *= hasInput ? 0.5 : 0.06; // 急な坂では滑る
    if (this.grounded && level.isSlippery(this.ground.collider)) accel *= 0.15; // つるつる床
    if (stunned) accel = this.grounded ? 10 : 0;
    if (diving) accel = this.grounded ? 6 : 1.5;

    let dvx = target.x - vel.x;
    let dvz = target.z - vel.z;
    const dvLen = Math.hypot(dvx, dvz);
    const maxDv = accel * dt;
    if (dvLen > maxDv && dvLen > 0) {
      dvx *= maxDv / dvLen;
      dvz *= maxDv / dvLen;
    }
    b.applyImpulse({ x: dvx * this.mass, y: 0, z: dvz * this.mass }, true);
    vel.x += dvx;
    vel.z += dvz;

    // --- ジャンプ台 ---
    if (this.grounded && level.isBouncePad(this.ground.collider) && vel.y < 2) {
      vel.y = PLAYER.bounceVelocity;
      b.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
      this.jumpLock = 0.2;
      this.coyote = 0;
      this.jumping = false;
      this.grounded = false;
      this.lastAirVy = vel.y;
      level.onBouncePad(this.ground.collider);
      audio.boing();
      this.model.impulseSquash(6);
    }

    // --- ジャンプ（接地中 or コヨーテタイム中のみ。空中で無限ジャンプはできない）---
    if (this.jumpBuffer > 0 && this.coyote > 0 && !stunned && !diving) {
      vel.y = PLAYER.jumpVelocity * s.jumpMul + Math.max(0, platVel.y);
      b.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.jumpLock = 0.18;
      this.jumping = true;
      this.grounded = false;
      this.lastAirVy = vel.y;
      audio.jump(this.index === 0 ? 1 : 1.2);
      this.model.impulseSquash(5);
      this.game.effects.dust(new THREE.Vector3(t.x, t.y - 0.8, t.z), 4);
    }

    // --- ダイブ（Shift）：前方へ飛び込む。他プレイヤーを突き飛ばせる ---
    if (this.actionBuffer > 0 && this.diveCooldown <= 0 && !stunned && !diving) {
      const d = hasInput ? this._fw.copy(dir).normalize() : this._fw.set(Math.sin(this.facingYaw), 0, Math.cos(this.facingYaw));
      vel.x = d.x * PLAYER.diveSpeed * s.speedMul + this.carryVel.x;
      vel.z = d.z * PLAYER.diveSpeed * s.speedMul + this.carryVel.z;
      vel.y = this.grounded ? PLAYER.diveUp : Math.max(vel.y, PLAYER.diveUp * 0.6);
      b.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
      this.diveTimer = PLAYER.diveTime;
      this.diveCooldown = PLAYER.diveCooldown;
      this.actionBuffer = 0;
      this.jumpLock = 0.15;
      this.facingYaw = Math.atan2(d.x, d.z);
      audio.dive();
    }

    // --- 重力の調整（小ジャンプ・落下を速く）---
    if (!this.grounded) {
      let extra = 0;
      if (this.jumping && vel.y > 0 && !this.jumpHeld) extra = PLAYER.jumpCutGravity;
      else if (vel.y < 0) extra = PLAYER.fallGravity;
      if (extra > 0) {
        const dvy = PHYSICS.gravity * extra * dt;
        b.applyImpulse({ x: 0, y: dvy * this.mass, z: 0 }, true);
        vel.y += dvy;
      }
      if (vel.y < 0) this.jumping = false;
    }

    // --- 速度の上限 ---
    const sp = vel.length();
    if (sp > PHYSICS.maxSpeed) {
      vel.multiplyScalar(PHYSICS.maxSpeed / sp);
      b.setLinvel({ x: vel.x, y: vel.y, z: vel.z }, true);
    }

    // --- 姿勢制御（起き上がり＋向き直り）---
    this.updateRotation(dt, dir, hasInput, vel);

    // 次のステップで外力を検出するため、制御後の速度を記録
    const after = b.linvel();
    this.expected.set(after.x, after.y, after.z);
    this.hasExpected = true;

    // 足音
    if (this.grounded && hasInput && !stunned) {
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.28;
        if (Math.random() < 0.5) this.game.effects.dust(new THREE.Vector3(t.x, t.y - 0.8, t.z), 1);
      }
    }
  }

  updateRotation(dt, dir, hasInput, vel) {
    const b = this.body;
    if (this.stunTimer > 0) return; // 転倒中は物理に任せて転がる

    const r = b.rotation();
    const q = this._q.set(r.x, r.y, r.z, r.w);
    const up = this._up.copy(UP).applyQuaternion(q);

    // 目標の「上方向」：走行中は少し前傾、ダイブ中は腹ばい
    const desiredUp = new THREE.Vector3();
    if (this.diveTimer > 0) {
      desiredUp.set(Math.sin(this.facingYaw) * 1.6, 0.6, Math.cos(this.facingYaw) * 1.6).normalize();
    } else {
      const lean = PLAYER.runLean;
      desiredUp.set(THREE.MathUtils.clamp((vel.x - this.carryVel.x) * lean, -0.3, 0.3), 1, THREE.MathUtils.clamp((vel.z - this.carryVel.z) * lean, -0.3, 0.3)).normalize();
    }
    const err = new THREE.Vector3().crossVectors(up, desiredUp);
    if (up.dot(desiredUp) < 0) err.normalize(); // 逆さまの時は最大の力で起き上がる

    let strength = PLAYER.uprightStrength;
    if (this.recoverTimer > 0) strength *= 1 - this.recoverTimer; // 起き上がりは徐々に
    const targetAng = err.multiplyScalar(strength);

    // 向き直り（ヨー回転）
    if (hasInput && this.diveTimer <= 0) this.facingYaw = Math.atan2(dir.x, dir.z);
    if (up.y > 0.4) {
      const fw = this._fw.set(0, 0, 1).applyQuaternion(q);
      const curYaw = Math.atan2(fw.x, fw.z);
      const yawErr = wrapAngle(this.facingYaw - curYaw);
      targetAng.y += THREE.MathUtils.clamp(yawErr * PLAYER.turnRate * settings.values.turnMul, -16, 16);
    }

    const av = b.angvel();
    const k = 1 - Math.exp(-PLAYER.angularBlend * dt);
    b.setAngvel(
      {
        x: av.x + (targetAng.x - av.x) * k,
        y: av.y + (targetAng.y - av.y) * k,
        z: av.z + (targetAng.z - av.z) * k,
      },
      true,
    );
  }

  // チェックポイント等へ復帰：位置・向き・速度・状態をすべて初期化
  respawn(pos, yaw = Math.PI) {
    const b = this.body;
    b.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    b.resetForces(true);
    b.resetTorques(true);
    this.setYaw(yaw);
    this.game.physics.snap(this.sync);
    this.model.root.position.set(pos.x, pos.y, pos.z);
    this.stunTimer = 0;
    this.recoverTimer = 0;
    this.diveTimer = 0;
    this.jumpBuffer = 0;
    this.actionBuffer = 0;
    this.jumping = false;
    this.grounded = false;
    this.wasGrounded = false;
    this.lastAirVy = 0;
    this.carryVel.set(0, 0, 0);
    this.hasExpected = false;
    this.grace = 0.6;
    this.model.impulseSquash(6);
    this.model.prevVel.set(0, 0, 0);
    this.game.effects.burst(new THREE.Vector3(pos.x, pos.y, pos.z), this.style.body, 14, 4);
  }

  frameUpdate(dt, showTag) {
    const lv = this.body.linvel();
    const vel = new THREE.Vector3(lv.x, lv.y, lv.z);
    const rel = Math.hypot(lv.x - this.carryVel.x, lv.z - this.carryVel.z);
    this.model.update(dt, {
      vel,
      speed: rel,
      grounded: this.grounded,
      stunned: this.stunTimer > 0,
      diving: this.diveTimer > 0,
    });
    this.tag.visible = showTag;
    this.tag.position.copy(this.model.root.position);
    this.tag.position.y += 1.55;
  }

  dispose() {
    this.game.scene.remove(this.model.root);
    this.game.scene.remove(this.tag);
    this.tag.material.map.dispose();
    this.tag.material.dispose();
  }
}
