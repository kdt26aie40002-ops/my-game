// ステージ1：はじまりの草原（基本操作とジャンプの練習）
// 座標の目安：コースは -Z 方向へ進む。platform(x, 上面の高さ, z, 幅, 厚さ, 奥行き)
export default {
  id: 'stage1',
  name: 'はじまりの草原',
  subtitle: 'ジャンプの練習をしよう！',
  spawn: [0, 1.3, 4],
  killY: -14,
  bgmTheme: 0,
  theme: {
    grass: 0x86da5c,
    dirt: 0xd09a64,
    stone: 0xb9b2c9,
    stoneTop: 0xd8d2e6,
    wood: 0xe8b277,
    woodDark: 0xae6f3d,
    accent: 0xff7a9a,
    leaf: 0x4fc46a,
    skyTop: 0x4fb0ff,
    skyBottom: 0xffeaf3,
    seaY: -26,
  },
  build(L) {
    // --- スタート地点 ---
    L.platform(0, 0, 2, 14, 3, 12);
    L.sign(-4.2, 0, 3.5, ['WASD：いどう', 'スペース：ジャンプ'], { width: 3.4 });
    L.sign(4.2, 0, 3.5, ['Shift：ダイブ', 'R：チェックポイントへ'], { width: 3.4 });
    L.tree(-6, 0, 7, 1.1);
    L.tree(6, 0, 6.5, 1.3);
    L.tree(-6.2, 0, -2.5, 0.9);
    L.flowers(-3, 0, 6.5, 8, 1.6);
    L.flowers(3, 0, -2.5, 6, 1.2);
    L.rock(5.8, 0, -3, 1.2);

    // --- 平坦な道と押せる箱 ---
    L.platform(0, 0, -14, 7, 3, 20);
    L.crate(-2, 0.7, -9, 1.2);
    L.crate(2.2, 0.7, -14, 1.2);
    L.crate(2.2, 1.95, -14, 1.2);
    L.star(-2.6, 1.3, -18);
    L.rock(-3.2, 0, -21, 0.8);
    L.flowers(2.8, 0, -20, 4, 0.5);

    // --- 段差 ---
    L.platform(0, 1.2, -26.5, 7, 4.2, 5);
    L.star(0, 3.6, -26.5);
    L.platform(0, 0, -32, 7, 3, 6);
    L.sign(-2.4, 0, -30.5, ['穴はジャンプで', 'とびこえよう！'], { width: 2.6, height: 1.3, font: 40 });

    // --- 穴（3.5m）とチェックポイント1 ---
    L.platform(0, 0, -43, 9, 3, 9);
    L.checkpoint(0, 0, -41, { halfWidth: 4.5 });
    L.mushroom(-3.8, 0, -45.5, 1.2);
    L.mushroom(3.6, 0, -46, 0.9);

    // --- 坂道をのぼって台地へ ---
    L.slope(0, -47.5, 0, -56, 3, 6);
    L.platform(0, 3, -60, 10, 3, 8);
    L.sweeper({ x: 0, top: 3, z: -60, length: 9.6, speed: 1.1, height: 0.6 });
    L.crate(-3.5, 3.7, -57.5, 1.2);
    L.tree(4.2, 3, -63, 0.8);
    L.star(-4, 4.2, -63);

    // --- 高低差のある柱ジャンプ ---
    L.pillar(-2, 3.8, -66.8, 1.4, 7);
    L.pillar(1.5, 4.8, -70.6, 1.3, 8);
    L.pillar(-1.2, 5.6, -74.4, 1.3, 8);
    L.star(1.5, 6.3, -70.6);

    // --- チェックポイント2とジャンプ台 ---
    L.platform(0, 6.2, -82, 9, 3, 10);
    L.checkpoint(0, 6.2, -79.5, { halfWidth: 4.5 });
    L.bouncePad(0, 6.2, -83.6, 1.3);
    L.sign(-3.2, 6.2, -82.5, ['キノコに乗ると', '大ジャンプ！'], { width: 2.6, height: 1.3, font: 40 });
    L.platform(0, 10.2, -91, 9, 4, 8);
    L.tree(-3.5, 10.2, -93.5, 0.9);
    L.flowers(3, 10.2, -90, 6, 1);

    // --- 細い橋 ---
    L.platform(0, 10.2, -102, 2, 1, 14);
    L.star(0, 11.5, -104);

    // --- 動く床をわたってゴールへ ---
    L.mover({ x: -3, top: 10.2, z: -112, offset: [6, 0, 0], period: 5 });
    L.platform(0, 10.2, -121, 11, 3, 12);
    L.goalGate(0, 10.2, -122);
    L.tree(-4.5, 10.2, -126, 1.1);
    L.tree(4.5, 10.2, -126.5, 1.3);
    L.flowers(-3, 10.2, -117, 6, 1.2);
    L.flowers(3, 10.2, -117, 6, 1.2);

    // --- 背景の浮島 ---
    L.floatingIsland(-26, -4, -20, 1.5);
    L.floatingIsland(30, 2, -55, 2);
    L.floatingIsland(-34, 8, -95, 1.8);
    L.floatingIsland(28, 14, -130, 1.4);
    L.floatingIsland(-10, 22, -175, 3);
  },
};
