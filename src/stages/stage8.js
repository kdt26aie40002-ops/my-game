// ステージ8：天空の最終試練（最上級）
// これまでのギミックをすべて組み合わせた最終ステージ
export default {
  id: 'stage8',
  name: '天空の最終試練',
  subtitle: '【最上級】すべてのギミックが襲いかかる！',
  spawn: [0, 1.3, 4],
  killY: -12,
  bgmTheme: 2,
  theme: {
    grass: 0x9fe0a0,
    dirt: 0xb07ad6,
    stone: 0x8a68c2,
    stoneTop: 0xe3d2ff,
    wood: 0xffd27a,
    woodDark: 0xc9874b,
    accent: 0xff4f9a,
    leaf: 0x47b87a,
    skyTop: 0x3a4fd6,
    skyBottom: 0xffb3c7,
    seaY: -24,
  },
  build(L) {
    // --- スタート ---
    L.platform(0, 0, 2, 12, 3, 12);
    L.sign(-3.6, 0, 3, ['最終試練！', 'ここまで来たキミなら…'], { width: 3.4 });
    L.tree(5, 0, 6, 1.3);
    L.flowers(-4, 0, -2.5, 6, 1);

    // --- くずれる床と消える床 ---
    L.crumble({ x: 0, top: 0, z: -6.5 });
    L.blink({ x: 0, top: 0.6, z: -11, period: 2.4, phase: 0 });
    L.crumble({ x: 1.5, top: 1.2, z: -15.5 });
    L.blink({ x: -1.5, top: 1.8, z: -20, period: 2.4, phase: 0.5, color: 0xff8ad8 });
    L.star(0, 2, -11);
    L.platform(0, 2.4, -26, 6, 3, 6);

    // --- 回る丸太 ---
    L.roller({ x: 0, top: 2.4, z: -36, length: 10, radius: 1.1, speed: 1.3 });
    L.platform(0, 2.4, -46, 8, 3, 8);
    L.checkpoint(0, 2.4, -44, { halfWidth: 4 });

    // --- 速い動く床（左右→上下）---
    L.mover({ x: -4, top: 2.4, z: -53, w: 3, d: 3, offset: [8, 0, 0], period: 2.8 });
    L.mover({ x: 0, top: 2.4, z: -58.5, w: 3.5, d: 3.5, offset: [0, 3, 0], period: 2.4 });
    L.star(0, 6.8, -58.5);
    L.platform(0, 5.4, -65, 6, 3, 6);

    // --- 回転バーと振り子の広場 ---
    L.platform(0, 5.4, -77, 10, 3, 14);
    L.sweeper({ x: 0, top: 5.4, z: -77, length: 9, speed: 2.4, height: 0.6, double: true });
    L.pendulum({ x: 0, pivotY: 12.6, z: -72, length: 6.2, period: 2.3, axis: 'z' });
    L.pendulum({ x: 0, pivotY: 12.6, z: -82, length: 6.2, period: 2.3, phase: Math.PI, axis: 'z' });
    L.platform(0, 5.4, -88, 6, 3, 6);
    L.checkpoint(0, 5.4, -88, { halfWidth: 3 });

    // --- ジャンプ台で高い壁の上へ ---
    L.platform(0, 5.4, -95, 6, 3, 6);
    L.bouncePad(0, 5.4, -95, 1.2);
    L.platform(0, 9.6, -103, 6, 4.2, 8);
    L.star(3.5, 12, -96);

    // --- ダイブの大穴（6m）---
    L.sign(-1.8, 9.6, -104.6, ['ジャンプ→ダイブ！'], { width: 2.4, height: 0.8, font: 40 });
    L.platform(0, 9.6, -117, 10, 3, 8);
    L.checkpoint(0, 9.6, -115, { halfWidth: 5 });

    // --- 消える床の階段 ---
    L.blink({ x: 0, top: 10.4, z: -123.5, period: 2.2, on: 0.55, phase: 0 });
    L.blink({ x: 0, top: 11.2, z: -128, period: 2.2, on: 0.55, phase: 0.5, color: 0xff8ad8 });
    L.blink({ x: 0, top: 12, z: -132.5, period: 2.2, on: 0.55, phase: 0 });
    L.star(0, 13.4, -128);

    // --- ゴール ---
    L.platform(0, 12.6, -140, 10, 3, 10);
    L.goalGate(0, 12.6, -141);
    L.tree(-4, 12.6, -143.5, 1.1);
    L.tree(4, 12.6, -144, 1.3);
    L.flowers(0, 12.6, -136.5, 8, 2);

    // --- 背景 ---
    L.floatingIsland(-25, -2, -35, 1.8);
    L.floatingIsland(26, 6, -85, 2.2);
    L.floatingIsland(-26, 16, -130, 2.2);
    L.floatingIsland(14, 26, -180, 3);
  },
};
