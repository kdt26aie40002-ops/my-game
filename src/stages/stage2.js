// ステージ2：ふわふわ雲の橋（細い足場・動く床・回転する障害物）
export default {
  id: 'stage2',
  name: 'ふわふわ雲の橋',
  subtitle: '動く床と回るジャマものに気をつけて！',
  spawn: [0, 1.3, 4],
  killY: -14,
  bgmTheme: 1,
  theme: {
    grass: 0xf7f1ff,
    dirt: 0xb9a6ec,
    stone: 0x9f8fd6,
    stoneTop: 0xe9e2ff,
    wood: 0xffc4de,
    woodDark: 0xd77fae,
    accent: 0xff6fae,
    leaf: 0xffb3d9,
    skyTop: 0x8a9bff,
    skyBottom: 0xffe0f0,
    seaY: -24,
  },
  build(L) {
    // --- スタート ---
    L.platform(0, 0, 2, 12, 3, 12);
    L.sign(-3.6, 0, 3, ['細い橋はゆっくり！', '落ちても何度でもOK'], { width: 3.4 });
    L.tree(4.8, 0, 6, 1.2);
    L.tree(-5, 0, -2.5, 0.9);
    L.flowers(3.5, 0, -2.5, 6, 1);

    // --- 細い一本橋 ---
    L.platform(0, 0, -11, 1.6, 1, 14);
    L.star(0, 1.3, -12);

    // --- チェックポイント1 ---
    L.platform(0, 0, -22.5, 9, 3, 9);
    L.checkpoint(0, 0, -21, { halfWidth: 4.5 });
    L.sign(3, 0, -24.5, ['動く床に', 'タイミングよく！'], { width: 2.6, height: 1.3, font: 40 });

    // --- 動く床（左右・左右・上下）---
    L.mover({ x: -3, top: 0, z: -30.5, offset: [6, 0, 0], period: 4 });
    L.mover({ x: 3, top: 0.5, z: -35.5, offset: [-6, 0, 0], period: 4 });
    L.mover({ x: 0, top: -1, z: -40.5, w: 4.5, d: 3.5, offset: [0, 2.5, 0], period: 3.5 });
    L.star(0, 3.2, -35.5);

    // --- 回転バーの広場 ---
    L.platform(0, 1, -49, 11, 3, 10);
    L.sweeper({ x: 0, top: 1, z: -49, length: 10, speed: 1.4, height: 0.65 });
    L.mushroom(-4.8, 1, -44.8, 1);
    L.mushroom(4.8, 1, -53.2, 1.1);

    // --- チェックポイント2 ---
    L.platform(0, 1, -57, 7, 3, 6);
    L.checkpoint(0, 1, -56, { halfWidth: 3.5 });

    // --- 回転する円盤 ---
    L.turntable({ x: 0, top: 1, z: -66, radius: 5, speed: 0.55, pegs: 3 });
    L.star(3, 2.6, -66);

    // --- 振り子ハンマーの一本道 ---
    L.platform(0, 1, -82, 2.4, 1, 20);
    L.pendulum({ x: 0, pivotY: 8.2, z: -77.5, length: 6.2, amplitude: 1.15, period: 2.8, axis: 'z' });
    L.pendulum({ x: 0, pivotY: 8.2, z: -86, length: 6.2, amplitude: 1.15, period: 2.8, phase: Math.PI, axis: 'z' });
    L.star(0, 2.4, -82);

    // --- チェックポイント3 ---
    L.platform(0, 1, -96, 8, 3, 8);
    L.checkpoint(0, 1, -94, { halfWidth: 4 });

    // --- 坂道とつるつる氷の広場（回転バー付き）---
    L.slope(0, -100, 1, -106, 3.5, 6);
    L.platform(0, 3.5, -111, 9, 3, 10, { style: 'ice' });
    L.sweeper({ x: 0, top: 3.5, z: -111, length: 8, speed: -1.0, height: 0.6, double: true });
    L.sign(-3.4, 1, -98.5, ['この先 氷！', 'つるつる滑るよ'], { width: 2.6, height: 1.3, font: 40 });

    // --- エレベーターでゴールへ ---
    L.mover({ x: 0, top: 3.5, z: -119.5, w: 3.5, d: 3.5, offset: [0, 5, 0], period: 5 });
    L.platform(0, 8.5, -127, 10, 3, 10);
    L.goalGate(0, 8.5, -128.5);
    L.star(-3.5, 9.8, -125);
    L.tree(-4, 8.5, -131, 1);
    L.tree(4, 8.5, -131.5, 1.2);

    // --- 背景 ---
    L.floatingIsland(-24, -3, -30, 1.6);
    L.floatingIsland(26, 4, -70, 2.2);
    L.floatingIsland(-30, 10, -115, 1.6);
    L.floatingIsland(18, 18, -160, 2.5);
  },
};
