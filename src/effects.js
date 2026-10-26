// パーティクル演出（土ぼこり・はじける粒・紙吹雪）
import * as THREE from 'three';

const MAX = 260;

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.pool = [];
    this.dustGeo = new THREE.IcosahedronGeometry(0.16, 0);
    this.burstGeo = new THREE.OctahedronGeometry(0.1, 0);
    this.confettiGeo = new THREE.PlaneGeometry(0.18, 0.1);
  }

  _spawn(geo, color, opts) {
    if (this.particles.length >= MAX) {
      const old = this.particles.shift();
      this._release(old);
    }
    let p = this.pool.find((q) => q.mesh.geometry === geo);
    if (p) this.pool.splice(this.pool.indexOf(p), 1);
    else {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false });
      p = { mesh: new THREE.Mesh(geo, mat) };
    }
    p.mesh.material.color.set(color);
    p.mesh.material.opacity = 1;
    p.mesh.position.copy(opts.pos);
    p.mesh.scale.setScalar(opts.scale ?? 1);
    p.mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    p.vel = opts.vel;
    p.life = opts.life;
    p.maxLife = opts.life;
    p.gravity = opts.gravity ?? 0;
    p.drag = opts.drag ?? 1;
    p.grow = opts.grow ?? 0;
    p.spin = opts.spin ?? 0;
    p.flutter = opts.flutter ?? 0;
    this.scene.add(p.mesh);
    this.particles.push(p);
    return p;
  }

  _release(p) {
    this.scene.remove(p.mesh);
    this.pool.push(p);
  }

  dust(pos, n = 4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 2;
      this._spawn(this.dustGeo, 0xfff8ec, {
        pos: pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3)),
        vel: new THREE.Vector3(Math.cos(a) * s, 0.6 + Math.random(), Math.sin(a) * s),
        life: 0.45 + Math.random() * 0.3,
        drag: 4,
        grow: 1.5,
        scale: 0.6 + Math.random() * 0.6,
      });
    }
  }

  burst(pos, color, n = 10, speed = 4) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this._spawn(this.burstGeo, color, { pos: pos.clone(), vel: v, life: 0.6 + Math.random() * 0.4, gravity: -12, drag: 1, spin: 10, scale: 0.8 + Math.random() });
    }
  }

  confetti(pos, n = 60) {
    const colors = [0xff5d8f, 0xffd23f, 0x4fd18b, 0x4fb4ff, 0xa77bff, 0xffffff];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 2 + Math.random() * 5;
      this._spawn(this.confettiGeo, colors[i % colors.length], {
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2)),
        vel: new THREE.Vector3(Math.cos(a) * s, 5 + Math.random() * 6, Math.sin(a) * s),
        life: 2 + Math.random() * 1.5,
        gravity: -9,
        drag: 1.6,
        spin: 8,
        flutter: 1,
        scale: 1.2 + Math.random(),
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this._release(p);
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      if (p.flutter) p.vel.y = Math.max(p.vel.y, -2.2);
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.spin) {
        p.mesh.rotation.x += p.spin * dt;
        p.mesh.rotation.y += p.spin * 0.7 * dt;
      }
      if (p.grow) p.mesh.scale.multiplyScalar(1 + p.grow * dt);
      const f = p.life / p.maxLife;
      p.mesh.material.opacity = Math.min(1, f * 2);
    }
  }

  clear() {
    for (const p of this.particles) this._release(p);
    this.particles.length = 0;
  }
}
