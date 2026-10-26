// 空・ライト・雲・雲海などの背景
import * as THREE from 'three';

export class Environment {
  constructor(scene) {
    this.scene = scene;

    // グラデーションの空
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x5fb8ff) },
      bottomColor: { value: new THREE.Color(0xffe6f2) },
      offset: { value: 20 },
      exponent: { value: 0.55 },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorld;
        void main(){ float h = normalize(vWorld - cameraPosition + vec3(0.0, offset, 0.0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h,0.0), exponent), 0.0)), 1.0); }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    scene.fog = new THREE.Fog(0xffe6f2, 70, 260);

    // ライト
    this.hemi = new THREE.HemisphereLight(0xdff1ff, 0x8a7a6a, 1.25);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d6, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.shadowSize = 28;
    this._setShadowSize(28);
    this.sunOffset = new THREE.Vector3(18, 32, 12);
    scene.add(this.sun);
    scene.add(this.sun.target);

    // 太陽
    const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 12), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }));
    sunDisc.position.set(160, 170, -260);
    scene.add(sunDisc);

    // 雲
    this.clouds = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x606a7a, flatShading: true });
    const puff = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Group();
      const n = 4 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(puff, cloudMat);
        const s = 2 + Math.random() * 2.5;
        m.scale.set(s * 1.3, s * 0.8, s);
        m.position.set((k - n / 2) * 2.6 + Math.random(), Math.random() * 1.2, Math.random() * 2);
        c.add(m);
      }
      const side = Math.random() < 0.5 ? -1 : 1;
      c.position.set(side * (40 + Math.random() * 90), -10 + Math.random() * 50, 30 - Math.random() * 220);
      c.userData.speed = 0.6 + Math.random() * 1.2;
      this.clouds.add(c);
    }
    scene.add(this.clouds);

    // 雲海（落下エリアの下）
    const seaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0x8090b0, flatShading: true });
    this.sea = new THREE.Group();
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(puff, seaMat);
      const s = 6 + Math.random() * 8;
      m.scale.set(s, s * 0.45, s);
      m.position.set((Math.random() - 0.5) * 260, Math.random() * 3, 40 - Math.random() * 260);
      this.sea.add(m);
    }
    this.sea.position.y = -26;
    scene.add(this.sea);
  }

  _setShadowSize(s) {
    const cam = this.sun.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 1;
    cam.far = 120;
    cam.updateProjectionMatrix();
    this.shadowSize = s;
  }

  setTheme(theme) {
    this.skyUniforms.topColor.value.set(theme.skyTop);
    this.skyUniforms.bottomColor.value.set(theme.skyBottom);
    this.scene.fog.color.set(theme.skyBottom);
    this.sea.position.y = theme.seaY ?? -26;
  }

  // 影の範囲をプレイヤーの周りに合わせる
  update(dt, focus, spread = 0) {
    const size = THREE.MathUtils.clamp(24 + spread * 0.6, 24, 48);
    if (Math.abs(size - this.shadowSize) > 2) this._setShadowSize(size);
    this.sun.position.copy(focus).add(this.sunOffset);
    this.sun.target.position.copy(focus);
    this.sky.position.copy(focus);
    // 雲はコースに入らないよう、左右の決まった範囲でゆらゆら漂う
    this.time = (this.time || 0) + dt;
    for (const c of this.clouds.children) {
      if (c.userData.baseX === undefined) c.userData.baseX = c.position.x;
      c.position.x = c.userData.baseX + Math.sin(this.time * 0.05 * c.userData.speed + c.userData.baseX) * 10;
    }
  }
}
