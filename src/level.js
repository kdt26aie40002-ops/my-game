// ステージ構築とギミック（動く床・回転障害物・押せる箱・ジャンプ台・スイッチと門・
// チェックポイント・ゴール・スター）の実行時処理
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RAPIER } from './physics.js';
import { getTexture, getTextureRepeat, textTexture } from './textures.js';
import { audio } from './audio.js';

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

const geoCache = new Map();
function roundedBox(w, h, d, r = 0.12) {
  const rr = Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01);
  const key = `${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}_${rr.toFixed(2)}`;
  if (!geoCache.has(key)) geoCache.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.max(0.01, rr)));
  return geoCache.get(key);
}

function shade(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function toQuat(rot) {
  if (!rot) return { x: 0, y: 0, z: 0, w: 1 };
  _e.set(rot.x || 0, rot.y || 0, rot.z || 0);
  _q.setFromEuler(_e);
  return { x: _q.x, y: _q.y, z: _q.z, w: _q.w };
}

// 星形のジオメトリ（スター用）
function starGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
  g.center();
  return g;
}

export class Level {
  constructor(game, def) {
    this.game = game;
    this.def = def;
    this.physics = game.physics;
    this.world = game.physics.world;
    this.theme = def.theme;
    this.group = new THREE.Group();
    game.scene.add(this.group);

    this.kinematics = [];
    this.byBody = new Map();
    this.bounceColliders = new Map();
    this.slipperyColliders = new Set();
    this.checkpoints = [];
    this.goal = null;
    this.stars = [];
    this.crates = [];
    this.plates = [];
    this.gates = [];
    this.animated = [];
    this.timed = [];
    this.extraMats = [];
    this.spawn = new THREE.Vector3(...def.spawn);
    this.spawnYaw = def.spawnYaw ?? Math.PI;
    this.killY = def.killY ?? -14;
    this.time = 0;
    this.matCache = new Map();

    def.build(this);
  }

  // ------------------------------------------------------------
  // マテリアル
  // ------------------------------------------------------------
  mat(kind, color, rx = 1, ry = 1, extra = {}) {
    const key = `${kind}_${color}_${rx.toFixed(1)}_${ry.toFixed(1)}_${JSON.stringify(extra)}`;
    if (this.matCache.has(key)) return this.matCache.get(key);
    const params = { color, roughness: 0.85, metalness: 0, ...extra };
    const texName = { grass: 'speckle', dirt: 'strata', stone: 'strata', crate: 'crate', heavy: 'heavyCrate', checker: 'checker', stripes: 'stripes', candy: 'candy', dots: 'dots', plain: null }[kind];
    if (texName) params.map = getTextureRepeat(texName, Math.max(0.5, rx), Math.max(0.5, ry));
    if (kind === 'crate' || kind === 'heavy' || kind === 'checker' || kind === 'stripes' || kind === 'candy' || kind === 'dots') params.color = 0xffffff;
    const m = new THREE.MeshStandardMaterial(params);
    this.matCache.set(key, m);
    return m;
  }

  // 足場の見た目（土台＋上面）をローカル座標で作る
  platformVisual(w, h, d, style = 'grass') {
    const th = this.theme;
    const g = new THREE.Group();
    const TOPS = { stone: th.stoneTop, wood: th.wood, ice: 0xc9f2ff, checker: 0xffffff, crumble: 0xffb36b, metal: 0xd7dbe6 };
    const BASES = { wood: th.woodDark, ice: 0x8fd8f2, crumble: 0xa5643a, metal: 0x6f7690 };
    const topColor = TOPS[style] ?? th.grass;
    const baseColor = BASES[style] ?? th.dirt;
    const base = shade(new THREE.Mesh(roundedBox(w, h, d, 0.15), this.mat('dirt', baseColor, w / 4, h / 4)));
    g.add(base);
    if (h >= 0.3) {
      const slabH = Math.min(0.32, h * 0.5);
      const kind = style === 'checker' ? 'checker' : 'grass';
      const top = shade(new THREE.Mesh(roundedBox(w + 0.12, slabH, d + 0.12, 0.1), this.mat(kind, topColor, kind === 'checker' ? w / 2 : w / 5, kind === 'checker' ? d / 2 : d / 5)));
      top.position.y = h / 2 - slabH / 2 + 0.02;
      g.add(top);
    }
    return g;
  }

  // ------------------------------------------------------------
  // 静的な地形
  // ------------------------------------------------------------
  // 上面の高さ top を指定して箱型の足場を置く
  platform(x, top, z, w, h, d, opts = {}) {
    const cy = top - h / 2;
    const rot = opts.rotY ? { y: opts.rotY } : null;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, cy, z).setRotation(toQuat(rot)));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(opts.friction ?? 0.8), body);
    if (opts.style === 'ice') this.slipperyColliders.add(col.handle);
    const vis = this.platformVisual(w, h, d, opts.style);
    vis.position.set(x, cy, z);
    if (rot) vis.rotation.y = rot.y;
    this.group.add(vis);
    return { body, collider: col, mesh: vis };
  }

  // 中心座標で置く単純な箱（壁・柱など）
  block(x, y, z, w, h, d, opts = {}) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z).setRotation(toQuat(opts.rot)));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(opts.friction ?? 0.6), body);
    const mesh = shade(new THREE.Mesh(roundedBox(w, h, d, opts.radius ?? 0.12), opts.material || this.mat(opts.kind || 'stone', opts.color ?? this.theme.stone, Math.max(w, d) / 4, h / 4)));
    mesh.position.set(x, y, z);
    if (opts.rot) mesh.rotation.set(opts.rot.x || 0, opts.rot.y || 0, opts.rot.z || 0);
    this.group.add(mesh);
    return { body, collider: col, mesh };
  }

  // z0 の高さ top0 から z1 の高さ top1 へつながる坂道
  slope(x, z0, top0, z1, top1, w, opts = {}) {
    const thick = opts.thickness ?? 1;
    const dz = z1 - z0;
    const dy = top1 - top0;
    const len = Math.hypot(dz, dy) + 0.6;
    let ux = dy / Math.hypot(dz, dy);
    let uz = dz / Math.hypot(dz, dy);
    if (uz < 0) {
      ux = -ux;
      uz = -uz;
    }
    const theta = Math.atan2(-ux, uz);
    const normal = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta));
    const mid = new THREE.Vector3(x, (top0 + top1) / 2, (z0 + z1) / 2).addScaledVector(normal, -thick / 2);
    const rot = { x: theta };
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(mid.x, mid.y, mid.z).setRotation(toQuat(rot)));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, thick / 2, len / 2).setFriction(opts.friction ?? 0.8), body);
    if (opts.style === 'ice') this.slipperyColliders.add(col.handle);
    const vis = this.platformVisual(w, thick, len, opts.style);
    vis.position.copy(mid);
    vis.rotation.x = theta;
    this.group.add(vis);
    return { body, collider: col };
  }

  // 円柱の足場
  pillar(x, top, z, r, h, opts = {}) {
    const cy = top - h / 2;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, cy, z));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(h / 2, r).setFriction(0.8), body);
    const g = new THREE.Group();
    g.position.set(x, cy, z);
    const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.6, h, 24), this.mat('dirt', opts.baseColor ?? this.theme.dirt, 2, h / 3)));
    g.add(base);
    const cap = shade(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.02, 0.32, 28), this.mat('grass', opts.topColor ?? this.theme.grass, r / 2, r / 2)));
    cap.position.y = h / 2 - 0.14;
    g.add(cap);
    this.group.add(g);
    return { body };
  }

  // ------------------------------------------------------------
  // 動くギミック（キネマティック剛体）
  // ------------------------------------------------------------
  _registerKinematic(obj) {
    this.kinematics.push(obj);
    this.byBody.set(obj.body.handle, obj);
    obj.sync = this.physics.sync(obj.body, obj.object3D);
    return obj;
  }

  // 往復する動く床：offset の分だけ周期 period 秒で往復
  mover({ x, top, z, w = 3.5, h = 0.6, d = 3.5, offset = [4, 0, 0], period = 4, phase = 0, style = 'wood' }) {
    const cy = top - h / 2;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, cy, z));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(1.0), body);
    if (style === 'ice') this.slipperyColliders.add(col.handle);
    const vis = this.platformVisual(w, h, d, style);
    // 進行方向がわかる矢印模様
    const stripe = shade(new THREE.Mesh(roundedBox(w * 0.98, h * 0.4, 0.25, 0.05), this.mat('stripes', 0xffffff, 2, 0.5)), false, true);
    stripe.position.set(0, -h * 0.15, d / 2 + 0.01);
    vis.add(stripe);
    const stripe2 = stripe.clone();
    stripe2.position.z = -d / 2 - 0.01;
    vis.add(stripe2);
    this.group.add(vis);
    const base = new THREE.Vector3(x, cy, z);
    const off = new THREE.Vector3(...offset);
    const vel = new THREE.Vector3();
    const pos = new THREE.Vector3();
    return this._registerKinematic({
      body,
      object3D: vis,
      update(t) {
        const a = Math.PI * 2 * (t / period + phase);
        const s = (1 - Math.cos(a)) / 2;
        pos.copy(base).addScaledVector(off, s);
        body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
        vel.copy(off).multiplyScalar((Math.PI / period) * Math.sin(a));
      },
      pointVelocity() {
        return vel;
      },
    });
  }

  // 回転するギミックの共通処理
  _rotating({ x, y, z, axis = 'y', angle, angVel, colliders, object3D, friction = 0.5, restitution = 0.3 }) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z));
    for (const c of colliders) {
      const desc = c.desc.setFriction(c.friction ?? friction).setRestitution(restitution);
      if (c.offset) desc.setTranslation(...c.offset);
      if (c.rot) desc.setRotation(toQuat(c.rot));
      this.world.createCollider(desc, body);
    }
    object3D.position.set(x, y, z);
    this.group.add(object3D);
    const center = new THREE.Vector3(x, y, z);
    const ax = AXES[axis];
    const omega = new THREE.Vector3();
    const pv = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const obj = {
      body,
      object3D,
      update(t) {
        q.setFromAxisAngle(ax, angle(t));
        body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
        omega.copy(ax).multiplyScalar(angVel(t));
      },
      pointVelocity(p) {
        _v.set(p.x - center.x, p.y - center.y, p.z - center.z);
        return pv.crossVectors(omega, _v);
      },
    };
    obj.update(0);
    return this._registerKinematic(obj);
  }

  // 床の上で回転するバー（ジャンプでかわす）
  sweeper({ x, top, z, length = 9, height = 0.7, thickness = 0.55, speed = 1.5, phase = 0, double = false }) {
    const y = top + height;
    const g = new THREE.Group();
    const hub = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, height * 2 + 0.6, 20), this.mat('stripes', 0xffffff, 2, 1)));
    hub.position.y = -height + (height * 2 + 0.6) / 2 - 0.3;
    g.add(hub);
    const capTop = shade(new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.mat('plain', 0xff5d8f)));
    capTop.position.y = height + 0.3;
    g.add(capTop);
    const colliders = [{ desc: RAPIER.ColliderDesc.cylinder(height + 0.3, 0.6), offset: [0, 0, 0] }];
    const arms = double ? [0, Math.PI / 2] : [0];
    for (const a of arms) {
      const bar = shade(new THREE.Mesh(new THREE.CapsuleGeometry(thickness / 2, length - thickness, 6, 16), this.mat('candy', 0xffffff, 4, 1)));
      bar.rotation.z = Math.PI / 2;
      bar.rotation.y = a;
      g.add(bar);
      colliders.push({ desc: RAPIER.ColliderDesc.capsule((length - thickness) / 2, thickness / 2), rot: { z: Math.PI / 2, y: a } });
    }
    // 回転軸の位置は床の高さ + height
    return this._rotating({ x, y, z, axis: 'y', angle: (t) => speed * t + phase, angVel: () => speed, colliders, object3D: g, restitution: 0.6 });
  }

  // 回転する円盤の足場（上に乗ると運ばれる）
  turntable({ x, top, z, radius = 5, speed = 0.6, pegs = 3 }) {
    const h = 0.8;
    const y = top - h / 2;
    const g = new THREE.Group();
    const disc = shade(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, h, 40), this.mat('dirt', this.theme.dirt, 3, 1)));
    g.add(disc);
    const topDisc = shade(new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.05, radius + 0.05, 0.12, 40), this.mat('candy', 0xffffff, 6, 1)));
    topDisc.position.y = h / 2 - 0.04;
    g.add(topDisc);
    const colliders = [{ desc: RAPIER.ColliderDesc.cylinder(h / 2, radius), friction: 1 }];
    for (let i = 0; i < pegs; i++) {
      const a = (i / pegs) * Math.PI * 2;
      const px = Math.cos(a) * radius * 0.6;
      const pz = Math.sin(a) * radius * 0.6;
      const peg = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.4, 16), this.mat('plain', this.theme.accent)));
      peg.position.set(px, h / 2 + 0.7, pz);
      g.add(peg);
      colliders.push({ desc: RAPIER.ColliderDesc.cylinder(0.7, 0.5), offset: [px, h / 2 + 0.7, pz] });
    }
    return this._rotating({ x, y, z, axis: 'y', angle: (t) => speed * t, angVel: () => speed, colliders, object3D: g, friction: 1, restitution: 0.1 });
  }

  // 振り子ハンマー（axis 回りに揺れる）
  pendulum({ x, pivotY, z, length = 6, amplitude = 1.1, period = 3, phase = 0, axis = 'z', headSize = 1.5 }) {
    const g = new THREE.Group();
    const rod = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, length, 10), this.mat('plain', 0x7a6a9a)));
    rod.position.y = -length / 2;
    g.add(rod);
    const head = shade(new THREE.Mesh(new THREE.CylinderGeometry(headSize * 0.55, headSize * 0.55, headSize * 1.5, 24), this.mat('dots', 0xffffff, 2, 1)));
    head.position.y = -length;
    // 揺れる方向に円柱の軸を向ける
    if (axis === 'z') head.rotation.set(0, 0, Math.PI / 2);
    else head.rotation.set(Math.PI / 2, 0, 0);
    g.add(head);
    const pivot = shade(new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), this.mat('plain', 0xffd23f)));
    g.add(pivot);
    const w = (Math.PI * 2) / period;
    const colliders = [
      {
        desc: RAPIER.ColliderDesc.cylinder(headSize * 0.75, headSize * 0.55),
        offset: [0, -length, 0],
        rot: axis === 'z' ? { z: Math.PI / 2 } : { x: Math.PI / 2 },
      },
      { desc: RAPIER.ColliderDesc.cylinder(length / 2, 0.12), offset: [0, -length / 2, 0] },
    ];
    // 支柱（見た目）
    const beamLen = 6;
    const beam = shade(new THREE.Mesh(roundedBox(axis === 'z' ? 0.5 : beamLen, 0.5, axis === 'z' ? beamLen : 0.5, 0.1), this.mat('stone', this.theme.stone)));
    beam.position.set(x, pivotY + 0.2, z);
    this.group.add(beam);
    return this._rotating({
      x,
      y: pivotY,
      z,
      axis,
      angle: (t) => amplitude * Math.sin(w * t + phase),
      angVel: (t) => amplitude * w * Math.cos(w * t + phase),
      colliders,
      object3D: g,
      restitution: 0.5,
    });
  }

  // 乗ると少し揺れてから落ちる床（数秒後に元の位置へ戻る）
  crumble({ x, top, z, w = 3, h = 0.6, d = 3, delay = 0.55, respawn = 3 }) {
    const cy = top - h / 2;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, cy, z));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(1.0), body);
    const outer = new THREE.Group();
    const inner = this.platformVisual(w, h, d, 'crumble');
    // ひび割れ模様
    const crackMat = this.mat('plain', 0x6b3a1f);
    for (let i = 0; i < 3; i++) {
      const crack = new THREE.Mesh(new THREE.BoxGeometry(w * (0.35 + i * 0.15), 0.03, 0.06), crackMat);
      crack.position.set((i - 1) * w * 0.2, h / 2 + 0.03, (i - 1) * d * 0.25);
      crack.rotation.y = 0.6 - i * 0.7;
      inner.add(crack);
    }
    outer.add(inner);
    this.group.add(outer);
    const vel = new THREE.Vector3();
    const st = { mode: 'idle', timer: 0, y: cy, vy: 0 };
    const level = this;
    const obj = {
      body,
      object3D: outer,
      onStep() {
        if (st.mode !== 'idle') return;
        st.mode = 'shaking';
        st.timer = delay;
        audio.crumble();
      },
      update(t, dt) {
        vel.set(0, 0, 0);
        if (st.mode === 'shaking') {
          st.timer -= dt;
          if (st.timer <= 0) {
            st.mode = 'falling';
            st.y = cy;
            st.vy = 0;
            st.timer = 1.4;
          }
        } else if (st.mode === 'falling') {
          st.vy -= 22 * dt;
          st.y += st.vy * dt;
          vel.y = st.vy;
          body.setNextKinematicTranslation({ x, y: st.y, z });
          st.timer -= dt;
          if (st.timer <= 0) {
            st.mode = 'gone';
            st.timer = respawn;
            col.setEnabled(false);
            outer.visible = false;
          }
        } else if (st.mode === 'gone') {
          st.timer -= dt;
          if (st.timer <= 0) {
            st.mode = 'idle';
            body.setTranslation({ x, y: cy, z }, true);
            body.setNextKinematicTranslation({ x, y: cy, z });
            col.setEnabled(true);
            outer.visible = true;
            level.physics.snap(obj.sync);
            level.game.effects.burst(new THREE.Vector3(x, top, z), 0xffb36b, 10, 3);
          }
        }
      },
      pointVelocity() {
        return vel;
      },
    };
    // 揺れは見た目だけ（物理の足場は動かさない）
    this.animated.push((dt, time) => {
      if (st.mode === 'shaking') inner.position.set(Math.sin(time * 70) * 0.06, Math.sin(time * 53) * 0.03, Math.cos(time * 61) * 0.06);
      else inner.position.set(0, 0, 0);
    });
    return this._registerKinematic(obj);
  }

  // 一定のリズムで現れたり消えたりする床。消える直前に点滅して知らせる
  blink({ x, top, z, w = 3, h = 0.5, d = 3, period = 3, on = 0.6, phase = 0, color = 0x7fe3ff }) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, top - h / 2, z));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setFriction(1.0), body);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.35, transparent: true });
    this.extraMats.push(mat);
    const mesh = shade(new THREE.Mesh(roundedBox(w, h, d, 0.12), mat));
    mesh.position.set(x, top - h / 2, z);
    this.group.add(mesh);
    const obj = {
      solid: true,
      f: 0,
      update(t) {
        obj.f = (((t / period + phase) % 1) + 1) % 1;
        const solid = obj.f < on;
        if (solid !== obj.solid) {
          obj.solid = solid;
          col.setEnabled(solid);
        }
      },
    };
    obj.update(0);
    this.timed.push(obj);
    this.animated.push((dt, time) => {
      if (!obj.solid) {
        mat.opacity = 0.12;
        mesh.castShadow = false;
        return;
      }
      mesh.castShadow = true;
      const remain = (on - obj.f) * period;
      mat.opacity = remain < 0.7 && Math.sin(time * 35) < 0 ? 0.35 : 0.95;
    });
    return obj;
  }

  // 回転する丸太（上を歩くと横へ運ばれる）。コースの向き（Z軸）に沿って置く
  roller({ x, top, z, length = 10, radius = 0.8, speed = 1.5 }) {
    const g = new THREE.Group();
    const log = shade(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 24), this.mat('candy', 0xffffff, 3, Math.max(1, length / 4))));
    log.rotation.x = Math.PI / 2;
    g.add(log);
    for (const s of [-1, 1]) {
      const cap = shade(new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.08, radius + 0.08, 0.2, 24), this.mat('plain', this.theme.accent)));
      cap.rotation.x = Math.PI / 2;
      cap.position.z = (s * length) / 2;
      g.add(cap);
    }
    const colliders = [{ desc: RAPIER.ColliderDesc.cylinder(length / 2, radius), rot: { x: Math.PI / 2 }, friction: 1 }];
    return this._rotating({ x, y: top - radius, z, axis: 'z', angle: (t) => speed * t, angVel: () => speed, colliders, object3D: g, friction: 1, restitution: 0.05 });
  }

  // ------------------------------------------------------------
  // 動的オブジェクト
  // ------------------------------------------------------------
  // 押せる箱（heavy: 重い箱。2人で押すと楽）
  crate(x, y, z, size = 1.2, heavy = false) {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setCcdEnabled(true).setLinearDamping(0.3).setAngularDamping(0.5),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
        .setDensity(heavy ? 0.9 : 0.35)
        .setFriction(0.55)
        .setRestitution(0.05),
      body,
    );
    const mesh = shade(new THREE.Mesh(roundedBox(size, size, size, 0.08), this.mat(heavy ? 'heavy' : 'crate', 0xffffff)));
    this.group.add(mesh);
    const sync = this.physics.sync(body, mesh);
    const c = { body, mesh, sync, home: new THREE.Vector3(x, y, z), size };
    this.crates.push(c);
    return c;
  }

  // ジャンプ台
  bouncePad(x, top, z, r = 1.2) {
    // 床より少しだけ高くして、接地判定でジャンプ台を確実に検出する
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, top - 0.15, z));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cylinder(0.2, r).setFriction(0.8), body);
    const g = new THREE.Group();
    g.position.set(x, top - 0.2, z);
    const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.15, 0.4, 28), this.mat('plain', 0xf4f0ff)));
    g.add(base);
    const cap = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.mat('dots', 0xffffff, 3, 1.5)));
    cap.scale.y = 0.35;
    cap.position.y = 0.18;
    g.add(cap);
    this.group.add(g);
    const pad = { collider: col, cap, squash: 0, x, z, top };
    this.bounceColliders.set(col.handle, pad);
    this.animated.push((dt) => {
      pad.squash = Math.max(0, pad.squash - dt * 4);
      cap.scale.y = 0.35 * (1 - Math.sin(pad.squash * Math.PI) * 0.6);
    });
    return pad;
  }

  // ------------------------------------------------------------
  // トリガー（チェックポイント・ゴール・スター・スイッチ）
  // ------------------------------------------------------------
  checkpoint(x, top, z, opts = {}) {
    const index = this.checkpoints.length + 1;
    const g = new THREE.Group();
    g.position.set(x, top, z);
    const halfW = opts.halfWidth ?? 5;
    // 旗を両端に
    const flags = [];
    for (const sx of [-1, 1]) {
      const pole = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 10), this.mat('plain', 0xffffff)));
      pole.position.set(sx * (halfW - 0.3), 1.7, 0);
      g.add(pole);
      const ball = shade(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), this.mat('plain', 0xffd23f)));
      ball.position.set(sx * (halfW - 0.3), 3.45, 0);
      g.add(ball);
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xb8b3c9, roughness: 0.6, side: THREE.DoubleSide });
      const flag = shade(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8, 8, 1), flagMat), true, false);
      flag.position.set(sx * (halfW - 0.3) - sx * 0.62, 2.9, 0);
      g.add(flag);
      flags.push(flag);
    }
    // 地面のライン
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, emissive: 0x000000 });
    const line = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 - 0.6, 0.06, 0.5), lineMat);
    line.position.y = 0.03;
    line.receiveShadow = true;
    g.add(line);
    this.group.add(g);
    const cp = { index, pos: new THREE.Vector3(x, top, z), halfW, active: false, flags, lineMat, yaw: opts.yaw ?? Math.PI };
    this.checkpoints.push(cp);
    const base = flags.map((f) => f.geometry.attributes.position.array.slice());
    this.animated.push((dt, t) => {
      flags.forEach((f, i) => {
        const arr = f.geometry.attributes.position.array;
        for (let k = 0; k < arr.length; k += 3) {
          const ox = base[i][k];
          arr[k + 2] = Math.sin(t * 6 + ox * 4) * 0.12 * (ox + 0.6);
        }
        f.geometry.attributes.position.needsUpdate = true;
      });
    });
    return cp;
  }

  activateCheckpoint(cp) {
    cp.active = true;
    for (const f of cp.flags) f.material.color.set(0x2fd36b);
    cp.lineMat.color.set(0x7dffaf);
    cp.lineMat.emissive.set(0x1f8a47);
    this.game.effects.confetti(cp.pos.clone().add(new THREE.Vector3(0, 2, 0)), 40);
  }

  goalGate(x, top, z, opts = {}) {
    const halfW = opts.halfWidth ?? 3.2;
    const g = new THREE.Group();
    g.position.set(x, top, z);
    const colors = [0xff5d8f, 0xffd23f, 0x4fd18b, 0x4fb4ff, 0xa77bff];
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const seg = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1, 16), this.mat('plain', colors[(i + (sx > 0 ? 2 : 0)) % 5])));
        seg.position.set(sx * halfW, 0.5 + i, 0);
        g.add(seg);
      }
      const ball = shade(new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), this.mat('plain', 0xffd23f, 1, 1, { metalness: 0.3, roughness: 0.35 })));
      ball.position.set(sx * halfW, 5.4, 0);
      g.add(ball);
      // 柱の物理（ぶつかれる）
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x + sx * halfW, top + 2.5, z));
      this.world.createCollider(RAPIER.ColliderDesc.cylinder(2.5, 0.42), body);
    }
    const bannerTex = textTexture('GOAL!', { width: 512, height: 128, bg: '#ffffff', fg: '#ff4f7b', border: '#ffd23f', font: 80 });
    const banner = shade(new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 + 0.4, 1.2, 0.3), [
      this.mat('plain', 0xffd23f), this.mat('plain', 0xffd23f), this.mat('plain', 0xffd23f), this.mat('plain', 0xffd23f),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.6 }),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.6 }),
    ]));
    banner.position.y = 4.7;
    g.add(banner);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2, 0.05, 2.4), this.mat('checker', 0xffffff, 3, 1));
    floor.position.y = 0.03;
    floor.receiveShadow = true;
    g.add(floor);
    // きらきら回るリング
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
    ring.position.y = 2.2;
    g.add(ring);
    this.animated.push((dt, t) => {
      ring.rotation.y = t * 2;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
      banner.position.y = 4.7 + Math.sin(t * 2) * 0.08;
    });
    this.group.add(g);
    this.goal = { pos: new THREE.Vector3(x, top, z), halfW: halfW - 0.3, halfD: 1.4 };
    return this.goal;
  }

  star(x, y, z) {
    if (!Level._starGeo) Level._starGeo = starGeometry();
    const mesh = shade(new THREE.Mesh(Level._starGeo, this.mat('plain', 0xffd23f, 1, 1, { emissive: 0x8a5a00, metalness: 0.2, roughness: 0.3 })), true, false);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    const s = { mesh, pos: new THREE.Vector3(x, y, z), collected: false, phase: Math.random() * 6 };
    this.stars.push(s);
    this.animated.push((dt, t) => {
      if (s.collected) {
        mesh.scale.multiplyScalar(Math.max(0, 1 - dt * 6));
        mesh.position.y += dt * 4;
        mesh.rotation.y += dt * 20;
        return;
      }
      mesh.rotation.y = t * 2.2 + s.phase;
      mesh.position.y = y + Math.sin(t * 2.5 + s.phase) * 0.15;
    });
    return s;
  }

  // 踏むと門が開くスイッチ
  pressurePlate(x, top, z, id, r = 1.1) {
    const g = new THREE.Group();
    g.position.set(x, top, z);
    const ringMesh = shade(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.2, r + 0.3, 0.16, 28), this.mat('plain', 0x6b5a8a)), false, true);
    ringMesh.position.y = 0.06;
    g.add(ringMesh);
    const btnMat = new THREE.MeshStandardMaterial({ color: 0xff4f6b, roughness: 0.4, emissive: 0x330000 });
    const btn = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.22, 28), btnMat));
    btn.position.y = 0.2;
    g.add(btn);
    this.group.add(g);
    const p = { id, x, z, top, r, pressed: false, btn, btnMat };
    this.plates.push(p);
    return p;
  }

  // スイッチ連動の門（plates のどれかが押されている間＋holdTime 秒だけ開く）
  gate({ x, top, z, w = 3, h = 4, d = 0.6, plates = [], holdTime = 2.5 }) {
    const cy = top + h / 2;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, cy, z));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2), body);
    const g = new THREE.Group();
    const mat = this.mat('stripes', 0xffffff, w / 2, h / 2);
    const panel = shade(new THREE.Mesh(roundedBox(w, h, d, 0.1), mat));
    g.add(panel);
    this.group.add(g);
    const gate = { body, plates, holdTime, hold: 0, open: false, openAmount: 0, closedY: cy, h, x, z, object3D: g };
    const vel = new THREE.Vector3();
    gate.update = (t, dt) => {
      const pressed = this.plates.some((p) => plates.includes(p.id) && p.pressed);
      if (pressed) gate.hold = holdTime;
      else gate.hold -= dt;
      const wantOpen = gate.hold > 0;
      if (wantOpen !== gate.open) {
        gate.open = wantOpen;
        audio.gate();
      }
      const prev = gate.openAmount;
      gate.openAmount = THREE.MathUtils.clamp(gate.openAmount + (wantOpen ? 1 : -1) * dt * 1.6, 0, 1);
      const y = cy - gate.openAmount * (h + 0.1);
      body.setNextKinematicTranslation({ x, y, z });
      vel.set(0, (-(gate.openAmount - prev) * (h + 0.1)) / dt, 0);
    };
    gate.pointVelocity = () => vel;
    this.gates.push(gate);
    this.kinematics.push(gate);
    this.byBody.set(body.handle, gate);
    this.physics.sync(body, g);
    return gate;
  }

  // ------------------------------------------------------------
  // 装飾
  // ------------------------------------------------------------
  sign(x, top, z, lines, opts = {}) {
    const g = new THREE.Group();
    g.position.set(x, top, z);
    g.rotation.y = opts.rotY ?? 0;
    const w = opts.width ?? 3.2;
    const h = opts.height ?? 1.6;
    for (const sx of [-1, 1]) {
      const post = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.2 + h, 8), this.mat('plain', 0x8a5a33)));
      post.position.set(sx * (w / 2 - 0.25), (1.2 + h) / 2, -0.05);
      g.add(post);
    }
    const tex = textTexture(lines, { width: 512, height: Math.round((512 * h) / w), font: opts.font ?? 46 });
    const board = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [
      this.mat('plain', 0xc9874b), this.mat('plain', 0xc9874b), this.mat('plain', 0xc9874b), this.mat('plain', 0xc9874b),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }),
      this.mat('plain', 0xc9874b),
    ]));
    board.position.y = 1.2 + h / 2;
    g.add(board);
    this.group.add(g);
  }

  tree(x, top, z, s = 1, collide = true) {
    const g = new THREE.Group();
    g.position.set(x, top, z);
    const trunk = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 1.6 * s, 8), this.mat('plain', 0x9a6338)));
    trunk.position.y = 0.8 * s;
    g.add(trunk);
    const leafMat = this.mat('grass', this.theme.leaf ?? 0x4fc46a, 1, 1);
    const blobs = [
      [0, 2.1, 0, 1.0],
      [0.5, 1.8, 0.2, 0.7],
      [-0.45, 1.85, -0.15, 0.72],
      [0.1, 2.7, -0.1, 0.65],
    ];
    for (const [bx, by, bz, br] of blobs) {
      const m = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(br * s, 1), leafMat));
      m.position.set(bx * s, by * s, bz * s);
      g.add(m);
    }
    this.group.add(g);
    if (collide) {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, top + 0.8 * s, z));
      this.world.createCollider(RAPIER.ColliderDesc.cylinder(0.8 * s, 0.28 * s), body);
    }
  }

  rock(x, top, z, s = 1, color) {
    const m = shade(new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 * s, 0), this.mat('stone', color ?? this.theme.stone, 1, 1)));
    m.position.set(x, top + 0.25 * s, z);
    m.rotation.set(Math.random(), Math.random() * 3, Math.random());
    m.scale.set(1, 0.7, 1);
    this.group.add(m);
  }

  flowers(x, top, z, n = 6, spread = 1.5) {
    const colors = [0xff6b9a, 0xffd23f, 0xffffff, 0xa77bff, 0x6bd5ff];
    for (let i = 0; i < n; i++) {
      const fx = x + (Math.random() - 0.5) * spread * 2;
      const fz = z + (Math.random() - 0.5) * spread * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), this.mat('plain', 0x3d9a4f));
      stem.position.set(fx, top + 0.17, fz);
      this.group.add(stem);
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), this.mat('plain', colors[i % colors.length]));
      head.position.set(fx, top + 0.38, fz);
      this.group.add(head);
    }
  }

  mushroom(x, top, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, top, z);
    const stem = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 0.6 * s, 10), this.mat('plain', 0xfff3dc)));
    stem.position.y = 0.3 * s;
    g.add(stem);
    const cap = shade(new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), this.mat('dots', 0xffffff, 2, 1)));
    cap.position.y = 0.55 * s;
    g.add(cap);
    this.group.add(g);
  }

  // 浮島（背景の装飾、当たり判定なし）
  floatingIsland(x, y, z, s = 1) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const rockM = shade(new THREE.Mesh(new THREE.ConeGeometry(2.2 * s, 3.5 * s, 7), this.mat('dirt', this.theme.dirt, 2, 2)), false, false);
    rockM.rotation.x = Math.PI;
    rockM.position.y = -1.75 * s;
    g.add(rockM);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.3 * s, 2.2 * s, 0.5 * s, 7), this.mat('grass', this.theme.grass, 2, 2));
    g.add(top);
    const tr = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 1), this.mat('grass', this.theme.leaf ?? 0x4fc46a));
    tr.position.set(0.5 * s, 1.1 * s, 0);
    g.add(tr);
    this.group.add(g);
    const phase = Math.random() * 6;
    this.animated.push((dt, t) => {
      g.position.y = y + Math.sin(t * 0.5 + phase) * 0.4;
    });
  }

  // ------------------------------------------------------------
  // 実行時
  // ------------------------------------------------------------
  getPointVelocity(collider, p) {
    const body = collider.parent();
    if (!body) return null;
    const k = this.byBody.get(body.handle);
    if (k) return k.pointVelocity(p);
    if (body.isDynamic()) {
      const v = body.linvel();
      return _v.set(v.x, v.y, v.z);
    }
    return null;
  }

  isBouncePad(collider) {
    return this.bounceColliders.has(collider.handle);
  }

  onBouncePad(collider) {
    const pad = this.bounceColliders.get(collider.handle);
    if (pad) {
      pad.squash = 1;
      this.game.effects.burst(new THREE.Vector3(pad.x, pad.top + 0.3, pad.z), 0xff5050, 10, 5);
    }
  }

  isSlippery(collider) {
    return this.slipperyColliders.has(collider.handle);
  }

  // 固定ステップごとに呼ぶ
  fixedUpdate(dt, players) {
    this.time += dt;
    const tNext = this.time;
    // スイッチの判定（プレイヤーか箱が乗っているか）
    for (const p of this.plates) {
      const occupants = [...players.map((pl) => pl.body.translation()), ...this.crates.map((c) => c.body.translation())];
      const pressed = occupants.some((o) => Math.abs(o.x - p.x) < p.r + 0.3 && Math.abs(o.z - p.z) < p.r + 0.3 && o.y > p.top - 0.2 && o.y < p.top + 2.2);
      if (pressed && !p.pressed) audio.switchOn();
      p.pressed = pressed;
      p.btn.position.y = pressed ? 0.08 : 0.2;
      p.btnMat.color.set(pressed ? 0x4fd18b : 0xff4f6b);
      p.btnMat.emissive.set(pressed ? 0x0d4a26 : 0x330000);
    }
    // くずれる床：プレイヤーが乗ったら崩れ始める
    for (const pl of players) {
      const body = pl.ground && pl.ground.collider.parent();
      const k = body && this.byBody.get(body.handle);
      if (k && k.onStep) k.onStep();
    }
    for (const k of this.kinematics) k.update(tNext, dt);
    for (const b of this.timed) b.update(tNext);
    // 落ちた箱は元の位置へ戻す
    for (const c of this.crates) {
      if (c.body.translation().y < this.killY) {
        c.body.setTranslation({ x: c.home.x, y: c.home.y, z: c.home.z }, true);
        c.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        c.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        c.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        this.physics.snap(c.sync);
        this.game.effects.burst(c.home.clone(), 0xd9954a, 10, 3);
      }
    }
  }

  // 描画フレームごとに呼ぶ（装飾アニメーション）
  frameUpdate(dt, time) {
    for (const a of this.animated) a(dt, time);
  }

  // プレイヤー位置 p が通過したチェックポイントを返す
  checkpointAt(p) {
    for (const cp of this.checkpoints) {
      if (Math.abs(p.x - cp.pos.x) < cp.halfW && Math.abs(p.z - cp.pos.z) < 1.6 && p.y > cp.pos.y - 1 && p.y < cp.pos.y + 4) return cp;
    }
    return null;
  }

  inGoal(p) {
    const g = this.goal;
    if (!g) return false;
    return Math.abs(p.x - g.pos.x) < g.halfW && Math.abs(p.z - g.pos.z) < g.halfD && p.y > g.pos.y - 1 && p.y < g.pos.y + 5;
  }

  dispose() {
    this.game.scene.remove(this.group);
    for (const m of this.matCache.values()) m.dispose();
    for (const m of this.extraMats) m.dispose();
    this.matCache.clear();
  }
}
