// キャラクターの3Dモデル（Three.js の基本形状を組み合わせたオリジナルデザイン）と
// 物理状態に連動した手足・頭・つぶれ（スカッシュ&ストレッチ）のアニメーション
import * as THREE from 'three';

const geoCache = {};
function geo(key, make) {
  if (!geoCache[key]) geoCache[key] = make();
  return geoCache[key];
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0, ...opts });
}

function shadowed(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class CharacterModel {
  constructor(style) {
    this.style = style;
    this.root = new THREE.Group();        // 物理剛体の位置・回転に一致
    this.squash = new THREE.Group();      // つぶれ・伸び用（足元を支点に）
    this.squash.position.y = -0.85;
    this.root.add(this.squash);
    this.inner = new THREE.Group();
    this.inner.position.y = 0.85;
    this.squash.add(this.inner);

    const bodyMat = mat(style.body);
    const bellyMat = mat(style.belly);
    const darkMat = mat(0x2b2140, { roughness: 0.4 });
    const whiteMat = mat(0xffffff, { roughness: 0.25 });
    const cheekMat = mat(0xff8fb1, { roughness: 0.7, transparent: true, opacity: 0.85 });
    const accentMat = mat(style.accent);

    // 胴体
    const body = shadowed(new THREE.Mesh(geo('sphere32', () => new THREE.SphereGeometry(0.5, 32, 24)), bodyMat));
    body.scale.set(1.0, 0.95, 0.92);
    body.position.y = -0.3;
    this.inner.add(body);
    const belly = new THREE.Mesh(geo('sphere32', () => new THREE.SphereGeometry(0.5, 32, 24)), bellyMat);
    belly.scale.set(0.68, 0.62, 0.5);
    belly.position.set(0, -0.33, 0.25);
    this.inner.add(belly);

    // 頭（バネで揺れる）
    this.head = new THREE.Group();
    this.head.position.y = 0.38;
    this.inner.add(this.head);
    const headMesh = shadowed(new THREE.Mesh(geo('sphere32', () => new THREE.SphereGeometry(0.5, 32, 24)), bodyMat));
    headMesh.scale.set(0.94, 0.88, 0.9);
    headMesh.position.y = 0.08;
    this.head.add(headMesh);

    // 目
    this.eyes = [];
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(0.16 * sx, 0.14, 0.37);
      const white = new THREE.Mesh(geo('eyeW', () => new THREE.SphereGeometry(0.12, 20, 16)), whiteMat);
      white.scale.set(0.9, 1.1, 0.55);
      eye.add(white);
      const pupil = new THREE.Mesh(geo('eyeP', () => new THREE.SphereGeometry(0.075, 16, 12)), darkMat);
      pupil.position.set(0, -0.005, 0.055);
      pupil.scale.set(1, 1.15, 0.6);
      eye.add(pupil);
      const shine = new THREE.Mesh(geo('eyeS', () => new THREE.SphereGeometry(0.025, 8, 6)), whiteMat);
      shine.position.set(0.025, 0.035, 0.1);
      eye.add(shine);
      this.head.add(eye);
      this.eyes.push({ group: eye, pupil });
    }
    // ほっぺ
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(geo('cheek', () => new THREE.SphereGeometry(0.07, 12, 8)), cheekMat);
      cheek.scale.set(1.2, 0.7, 0.3);
      cheek.position.set(0.29 * sx, -0.02, 0.33);
      cheek.rotation.y = 0.5 * sx;
      this.head.add(cheek);
    }
    // 口
    const mouth = new THREE.Mesh(geo('mouth', () => new THREE.TorusGeometry(0.06, 0.018, 8, 16, Math.PI)), darkMat);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 0.0, 0.43);
    this.head.add(mouth);
    this.mouth = mouth;

    // 耳（1Pは丸い耳、2Pは長い耳で区別）
    this.ears = [];
    for (const sx of [-1, 1]) {
      const ear = new THREE.Group();
      if (style.ears === 'long') {
        ear.position.set(0.18 * sx, 0.45, -0.05);
        ear.rotation.z = -0.22 * sx;
        const e = shadowed(new THREE.Mesh(geo('earLong', () => new THREE.CapsuleGeometry(0.1, 0.38, 6, 12)), bodyMat));
        e.position.y = 0.24;
        e.scale.z = 0.6;
        ear.add(e);
        const inner = new THREE.Mesh(geo('earLongIn', () => new THREE.CapsuleGeometry(0.055, 0.3, 4, 10)), cheekMat);
        inner.position.set(0, 0.24, 0.045);
        inner.scale.z = 0.4;
        ear.add(inner);
      } else {
        ear.position.set(0.3 * sx, 0.42, -0.02);
        ear.rotation.z = -0.5 * sx;
        const e = shadowed(new THREE.Mesh(geo('earRound', () => new THREE.SphereGeometry(0.16, 16, 12)), bodyMat));
        e.scale.set(1, 1, 0.55);
        e.position.y = 0.06;
        ear.add(e);
        const inner = new THREE.Mesh(geo('earRoundIn', () => new THREE.SphereGeometry(0.1, 12, 8)), cheekMat);
        inner.scale.set(1, 1, 0.3);
        inner.position.set(0, 0.06, 0.06);
        ear.add(inner);
      }
      this.head.add(ear);
      this.ears.push(ear);
    }
    // 頭の飾り（1Pは葉っぱ、2Pは星のアンテナ）
    const deco = new THREE.Group();
    deco.position.set(0, 0.5, 0);
    if (style.ears === 'long') {
      const stem = new THREE.Mesh(geo('stem', () => new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6)), darkMat);
      stem.position.y = 0.08;
      deco.add(stem);
      const ball = shadowed(new THREE.Mesh(geo('antBall', () => new THREE.IcosahedronGeometry(0.09, 0)), accentMat));
      ball.position.y = 0.22;
      deco.add(ball);
    } else {
      const leaf = shadowed(new THREE.Mesh(geo('leaf', () => new THREE.SphereGeometry(0.12, 12, 8)), accentMat));
      leaf.scale.set(1.4, 0.35, 0.7);
      leaf.position.set(0.08, 0.05, 0);
      leaf.rotation.z = 0.5;
      deco.add(leaf);
      const leaf2 = leaf.clone();
      leaf2.position.set(-0.08, 0.04, 0);
      leaf2.rotation.z = -0.5;
      deco.add(leaf2);
    }
    this.head.add(deco);
    this.deco = deco;

    // 腕
    this.arms = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.44 * sx, -0.18, 0);
      const arm = shadowed(new THREE.Mesh(geo('arm', () => new THREE.CapsuleGeometry(0.11, 0.26, 6, 12)), bodyMat));
      arm.position.y = -0.2;
      pivot.add(arm);
      const hand = shadowed(new THREE.Mesh(geo('hand', () => new THREE.SphereGeometry(0.13, 14, 10)), bellyMat));
      hand.position.y = -0.4;
      pivot.add(hand);
      this.inner.add(pivot);
      this.arms.push(pivot);
    }
    // 脚
    this.legs = [];
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(0.21 * sx, -0.62, 0);
      const leg = shadowed(new THREE.Mesh(geo('leg', () => new THREE.CapsuleGeometry(0.12, 0.1, 6, 12)), bodyMat));
      leg.position.y = -0.08;
      pivot.add(leg);
      const foot = shadowed(new THREE.Mesh(geo('foot', () => new THREE.SphereGeometry(0.15, 14, 10)), accentMat));
      foot.scale.set(0.95, 0.6, 1.3);
      foot.position.set(0, -0.17, 0.06);
      pivot.add(foot);
      this.inner.add(pivot);
      this.legs.push(pivot);
    }

    // 転倒時の目を回す星
    this.stars = new THREE.Group();
    this.stars.position.y = 0.85;
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(geo('dizzy', () => new THREE.OctahedronGeometry(0.09, 0)), starMat);
      const a = (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4);
      this.stars.add(s);
    }
    this.stars.visible = false;
    this.head.add(this.stars);

    // アニメーション状態
    this.time = Math.random() * 10;
    this.walkPhase = 0;
    this.squashY = 1;
    this.squashV = 0;
    this.headTilt = new THREE.Vector2();
    this.headTiltV = new THREE.Vector2();
    this.blinkTimer = 2 + Math.random() * 3;
    this.prevVel = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }

  // つぶれ・伸びを発生させる（着地: 負の値、ジャンプ: 正の値）
  impulseSquash(v) {
    this.squashV += v;
  }

  // state: { vel: Vector3, grounded, stunned, diving, speed }
  update(dt, state) {
    this.time += dt;
    const t = this.time;

    // --- スカッシュ&ストレッチ（バネ） ---
    const k = 260;
    const d = 14;
    this.squashV += (-(this.squashY - 1) * k - this.squashV * d) * dt;
    this.squashY += this.squashV * dt;
    this.squashY = THREE.MathUtils.clamp(this.squashY, 0.55, 1.5);
    const sxz = 1 / Math.sqrt(this.squashY);
    this.squash.scale.set(sxz, this.squashY, sxz);

    // --- 頭の揺れ：加速度をローカル座標に変換してバネで遅れさせる ---
    const acc = this._tmp.copy(state.vel).sub(this.prevVel).divideScalar(Math.max(dt, 1e-3));
    this.prevVel.copy(state.vel);
    this._q.copy(this.root.quaternion).invert();
    acc.applyQuaternion(this._q);
    const targetX = THREE.MathUtils.clamp(acc.z * 0.006, -0.35, 0.35); // 前後
    const targetZ = THREE.MathUtils.clamp(-acc.x * 0.006, -0.35, 0.35); // 左右
    const hk = 120;
    const hd = 9;
    this.headTiltV.x += ((targetX - this.headTilt.x) * hk - this.headTiltV.x * hd) * dt;
    this.headTiltV.y += ((targetZ - this.headTilt.y) * hk - this.headTiltV.y * hd) * dt;
    this.headTilt.x += this.headTiltV.x * dt;
    this.headTilt.y += this.headTiltV.y * dt;
    this.head.rotation.x = THREE.MathUtils.clamp(this.headTilt.x, -0.5, 0.5);
    this.head.rotation.z = THREE.MathUtils.clamp(this.headTilt.y, -0.5, 0.5);

    // --- 手足 ---
    const speed = state.speed;
    const lerp = (a, b, f) => a + (b - a) * Math.min(1, f * dt);
    let armX = [0, 0];
    let armZ = [0.25, -0.25];
    let legX = [0, 0];

    if (state.stunned) {
      // じたばた
      armX = [Math.sin(t * 22) * 1.2, Math.sin(t * 22 + 2) * 1.2];
      armZ = [1.6 + Math.sin(t * 17) * 0.6, -1.6 - Math.sin(t * 19) * 0.6];
      legX = [Math.sin(t * 20) * 0.9, Math.sin(t * 20 + Math.PI) * 0.9];
    } else if (state.diving) {
      armX = [-2.8, -2.8];
      armZ = [0.3, -0.3];
      legX = [0.6, 0.6];
    } else if (!state.grounded) {
      // 空中：腕をぱたぱた
      const flap = Math.sin(t * 18) * 0.35;
      armX = [-0.3, -0.3];
      armZ = [2.2 + flap, -2.2 - flap];
      const kick = Math.sin(t * 14) * 0.5;
      legX = [kick - 0.3, -kick - 0.3];
    } else if (speed > 0.6) {
      this.walkPhase += dt * (6 + speed * 1.6);
      const amp = Math.min(1, speed / 6);
      const s = Math.sin(this.walkPhase);
      legX = [s * 0.9 * amp, -s * 0.9 * amp];
      armX = [-s * 1.0 * amp, s * 1.0 * amp];
      armZ = [0.35, -0.35];
      // 走っている時の上下の弾み
      this.inner.position.y = 0.85 + Math.abs(Math.cos(this.walkPhase)) * 0.08 * amp;
    } else {
      // 待機：ゆったり呼吸
      const breathe = Math.sin(t * 2.5) * 0.05;
      armZ = [0.25 + breathe, -0.25 - breathe];
      this.inner.position.y = lerp(this.inner.position.y, 0.85, 10);
    }
    if (!(state.grounded && speed > 0.6)) this.inner.position.y = lerp(this.inner.position.y, 0.85, 10);

    const f = 18;
    for (let i = 0; i < 2; i++) {
      this.arms[i].rotation.x = lerp(this.arms[i].rotation.x, armX[i], f);
      this.arms[i].rotation.z = lerp(this.arms[i].rotation.z, armZ[i], f);
      this.legs[i].rotation.x = lerp(this.legs[i].rotation.x, legX[i], f);
    }
    // 耳もぴょこぴょこ
    for (let i = 0; i < 2; i++) {
      const base = this.style.ears === 'long' ? -0.22 * (i ? 1 : -1) : -0.5 * (i ? 1 : -1);
      this.ears[i].rotation.x = -this.headTilt.x * 2.0 + (state.grounded ? 0 : -0.4);
      this.ears[i].rotation.z = base + this.headTilt.y * 1.5;
    }

    // --- まばたき・目 ---
    this.blinkTimer -= dt;
    let eyeScaleY = 1;
    if (this.blinkTimer < 0) {
      eyeScaleY = 0.1;
      if (this.blinkTimer < -0.12) this.blinkTimer = 2 + Math.random() * 4;
    }
    for (const e of this.eyes) {
      e.group.scale.y = lerp(e.group.scale.y, state.stunned ? 0.35 : eyeScaleY, 30);
      if (state.stunned) {
        e.pupil.position.x = Math.cos(t * 15) * 0.03;
        e.pupil.position.y = Math.sin(t * 15) * 0.03;
      } else {
        e.pupil.position.x = lerp(e.pupil.position.x, 0, 8);
        e.pupil.position.y = lerp(e.pupil.position.y, state.grounded ? 0 : 0.03, 8);
      }
    }
    this.mouth.scale.y = state.stunned || !state.grounded ? -1.2 : 1;
    this.mouth.scale.x = !state.grounded ? 0.8 : 1;

    // 目を回す星
    this.stars.visible = state.stunned;
    if (state.stunned) this.stars.rotation.y += dt * 6;
  }
}
