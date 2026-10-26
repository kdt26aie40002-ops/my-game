// 三人称追従カメラ（1人：追従 / 2人：共有カメラ⇔画面分割を自動切替）
import * as THREE from 'three';
import { RAPIER } from './physics.js';
import { CAMERA } from './config.js';

export class FollowCamera {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, 0.1, 900);
    this.focus = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.zoom = 1;
    this.initialized = false;
    this._desired = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  reset(target, yaw) {
    this.focus.copy(target);
    this.initialized = false;
    this.update(0, target, yaw, null, 1);
  }

  // target: 注視したい位置, yaw: カメラの向き, physics: 壁めり込み防止のレイキャスト用
  update(dt, target, yaw, physics, zoom = 1) {
    const k = (s) => (dt <= 0 ? 1 : 1 - Math.exp(-s * dt));
    if (!this.initialized) {
      this.focus.copy(target);
      this.zoom = zoom;
    } else {
      // 水平方向と垂直方向で追従の速さを変え、ジャンプ時にカメラが揺れすぎないように
      this.focus.x += (target.x - this.focus.x) * k(CAMERA.followSharpness);
      this.focus.z += (target.z - this.focus.z) * k(CAMERA.followSharpness);
      this.focus.y += (target.y - this.focus.y) * k(CAMERA.heightSharpness);
      this.zoom += (zoom - this.zoom) * k(2.5);
    }
    const back = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const dist = CAMERA.distance * this.zoom;
    const height = CAMERA.height * this.zoom;
    this.lookAt.copy(this.focus).addScaledVector(back, -CAMERA.lookAhead).add(new THREE.Vector3(0, 1.0, 0));
    const desired = this._desired.copy(this.focus).addScaledVector(back, dist).add(new THREE.Vector3(0, height, 0));

    // 壁や地形にカメラがめり込まないよう、注視点からカメラへレイを飛ばす
    if (physics) {
      const origin = this._dir.copy(this.focus).add(new THREE.Vector3(0, 1.2, 0));
      const toCam = desired.clone().sub(origin);
      const len = toCam.length();
      toCam.normalize();
      const hit = physics.rayCast(origin, toCam, len, {
        flags: RAPIER.QueryFilterFlags.EXCLUDE_SENSORS | RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC | RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC,
      });
      if (hit) {
        const d = Math.max(1.5, hit.distance - 0.4);
        desired.copy(origin).addScaledVector(toCam, d);
      }
    }

    if (!this.initialized) {
      this.camera.position.copy(desired);
      this.initialized = true;
    } else {
      this.camera.position.lerp(desired, k(8));
    }
    this.camera.lookAt(this.lookAt);
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

// 1人・2人のカメラ構成を管理
export class CameraRig {
  constructor() {
    this.cams = [new FollowCamera(1), new FollowCamera(1)];
    this.shared = new FollowCamera(1);
    this.split = false;
    this.mode = 'auto';
  }

  reset(players, yaw) {
    if (players.length === 1) {
      this.cams[0].reset(players[0].renderPosition, yaw);
    } else {
      const mid = players[0].renderPosition.clone().add(players[1].renderPosition).multiplyScalar(0.5);
      this.shared.reset(mid, yaw);
      this.cams[0].reset(players[0].renderPosition, yaw);
      this.cams[1].reset(players[1].renderPosition, yaw);
    }
    this.split = this.mode === 'split' && players.length > 1;
  }

  // ビューポート一覧を返す: [{camera, x, y, w, h, player}]
  update(dt, players, yaw, physics, width, height) {
    if (players.length === 1) {
      this.cams[0].update(dt, players[0].renderPosition, yaw, physics, 1);
      this.cams[0].setAspect(width / height);
      return [{ camera: this.cams[0].camera, x: 0, y: 0, w: width, h: height, player: 0 }];
    }
    const a = players[0].renderPosition;
    const b = players[1].renderPosition;
    const horiz = Math.hypot(a.x - b.x, a.z - b.z);
    const vert = Math.abs(a.y - b.y);
    const sep = Math.max(horiz, vert * 1.6);

    const wasSplit = this.split;
    if (this.mode === 'split') this.split = true;
    else if (this.mode === 'shared') this.split = false;
    else if (!this.split && sep > CAMERA.splitDistance) this.split = true;
    else if (this.split && sep < CAMERA.mergeDistance) this.split = false;

    // 共有カメラは常に更新しておき、切り替え時に急に飛ばないようにする
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const zoom = THREE.MathUtils.clamp(1 + sep / 16, 1, this.mode === 'shared' ? 2.6 : 1.9);
    this.shared.update(dt, mid, yaw, physics, zoom);
    if (this.split) {
      if (!wasSplit) {
        // 分割へ切り替えた瞬間は共有カメラの位置から滑らかに移動
        for (const c of this.cams) {
          c.camera.position.copy(this.shared.camera.position);
          c.focus.copy(mid);
          c.zoom = this.shared.zoom;
        }
      }
      this.cams[0].update(dt, a, yaw, physics, 1);
      this.cams[1].update(dt, b, yaw, physics, 1);
      const hw = Math.floor(width / 2);
      this.cams[0].setAspect(hw / height);
      this.cams[1].setAspect((width - hw) / height);
      return [
        { camera: this.cams[0].camera, x: 0, y: 0, w: hw, h: height, player: 0 },
        { camera: this.cams[1].camera, x: hw, y: 0, w: width - hw, h: height, player: 1 },
      ];
    }
    if (wasSplit) {
      this.shared.camera.position.lerpVectors(this.cams[0].camera.position, this.cams[1].camera.position, 0.5);
    }
    // 共有時も個別カメラを追従させておく
    this.cams[0].update(dt, a, yaw, null, 1);
    this.cams[1].update(dt, b, yaw, null, 1);
    this.shared.setAspect(width / height);
    return [{ camera: this.shared.camera, x: 0, y: 0, w: width, h: height, player: -1 }];
  }
}
