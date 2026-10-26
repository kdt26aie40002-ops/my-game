// Rapier 3D 物理ワールドのラッパー
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PHYSICS } from './config.js';

export { RAPIER };

let initialized = false;
export async function initPhysics() {
  if (initialized) return;
  await RAPIER.init();
  initialized = true;
}

export class PhysicsWorld {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: PHYSICS.gravity, z: 0 });
    this.world.timestep = PHYSICS.fixedDt;
    // 見た目と物理を同期させるオブジェクト（補間描画用）
    this.synced = [];
    this._ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  }

  step() {
    for (const s of this.synced) {
      s.prevPos.copy(s.currPos);
      s.prevQuat.copy(s.currQuat);
    }
    this.world.step();
    for (const s of this.synced) {
      const t = s.body.translation();
      const r = s.body.rotation();
      s.currPos.set(t.x, t.y, t.z);
      s.currQuat.set(r.x, r.y, r.z, r.w);
    }
  }

  // 剛体と Three.js オブジェクトを紐付け、描画時に補間して滑らかに表示
  sync(body, object3D) {
    const t = body.translation();
    const r = body.rotation();
    const entry = {
      body,
      object3D,
      prevPos: new THREE.Vector3(t.x, t.y, t.z),
      currPos: new THREE.Vector3(t.x, t.y, t.z),
      prevQuat: new THREE.Quaternion(r.x, r.y, r.z, r.w),
      currQuat: new THREE.Quaternion(r.x, r.y, r.z, r.w),
    };
    this.synced.push(entry);
    if (object3D) {
      object3D.position.copy(entry.currPos);
      object3D.quaternion.copy(entry.currQuat);
    }
    return entry;
  }

  // テレポート時（リスポーン等）に補間をリセット
  snap(entry) {
    const t = entry.body.translation();
    const r = entry.body.rotation();
    entry.prevPos.set(t.x, t.y, t.z);
    entry.currPos.copy(entry.prevPos);
    entry.prevQuat.set(r.x, r.y, r.z, r.w);
    entry.currQuat.copy(entry.prevQuat);
  }

  interpolate(alpha) {
    for (const s of this.synced) {
      if (!s.object3D) continue;
      s.object3D.position.lerpVectors(s.prevPos, s.currPos, alpha);
      s.object3D.quaternion.slerpQuaternions(s.prevQuat, s.currQuat, alpha);
    }
  }

  // レイキャスト（法線付き）
  rayCast(origin, dir, maxDist, { excludeBody = null, flags = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, predicate } = {}) {
    this._ray.origin = { x: origin.x, y: origin.y, z: origin.z };
    this._ray.dir = { x: dir.x, y: dir.y, z: dir.z };
    const hit = this.world.castRayAndGetNormal(this._ray, maxDist, true, flags, undefined, undefined, excludeBody || undefined, predicate);
    if (!hit) return null;
    return { collider: hit.collider, distance: hit.timeOfImpact, normal: hit.normal };
  }

  dispose() {
    this.synced.length = 0;
    this.world.free();
  }
}
