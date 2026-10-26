// ステージ6：ぐるぐる歯車工場（上級）
// 回る円盤の連続・逆回転の丸太・回転バー3連・エレベーター上の振り子・細い柱
export default {
  id: 'stage6',
  name: 'ぐるぐる歯車工場',
  subtitle: '【上級】回るものだらけ！流れを読め',
  spawn: [0, 1.3, 4],
  killY: -12,
  bgmTheme: 6,
  theme: {
    grass: 0xd7dbe6,
    dirt: 0x6f7690,
    stone: 0x5a6078,
    stoneTop: 0xb8bfd6,
    wood: 0xffc94a,
    woodDark: 0xc98a1a,
    accent: 0xff6b4a,
    leaf: 0x5fbf7a,
    skyTop: 0x6f9bd6,
    skyBottom: 0xf6e3cf,
    seaY: -26,
  },
  build(L) {
    // --- スタート ---
    L.platform(0, 0, 2, 12, 3, 12, { style: 'metal' });
    L.sign(-3.6, 0, 3, ['回るものだらけ！', '流れを読もう'], { width: 3.4 });

    // --- 回る円盤の連続（交互に逆回転）---
    L.turntable({ x: 0, top: 0, z: -8.5, radius: 3.5, speed: 1.2, pegs: 2 });
    L.turntable({ x: 2.5, top: 0.6, z: -16.5, radius: 3.5, speed: -1.3, pegs: 2 });
    L.turntable({ x: -1, top: 1.2, z: -24.5, radius: 3.5, speed: 1.5, pegs: 2 });
    L.star(2.5, 2.2, -16.5);

    // --- チェックポイント1 ---
    L.platform(0, 1.5, -32, 8, 3, 6, { style: 'metal' });
    L.checkpoint(0, 1.5, -31.5, { halfWidth: 4 });

    // --- 速い丸太 ---
    L.roller({ x: 0, top: 1.5, z: -42, length: 12, radius: 1.1, speed: -1.5 });
    L.star(0, 3, -44);
    L.platform(0, 1.5, -52, 8, 3, 6, { style: 'metal' });

    // --- 回転バー3連 ---
    L.platform(0, 1.5, -66.5, 6, 2, 21, { style: 'metal' });
    L.sweeper({ x: 0, top: 1.5, z: -59.5, length: 7, speed: 2.0, height: 0.6, double: true });
    L.sweeper({ x: 0, top: 1.5, z: -66.5, length: 7, speed: -2.3, height: 0.6, double: true });
    L.sweeper({ x: 0, top: 1.5, z: -73.5, length: 7, speed: 2.6, height: 0.6, double: true });
    L.star(-2.2, 2.6, -70);

    // --- チェックポイント2 ---
    L.platform(0, 1.5, -80.5, 7, 3, 6, { style: 'metal' });
    L.checkpoint(0, 1.5, -80.5, { halfWidth: 3.5 });

    // --- エレベーターと振り子 ---
    L.mover({ x: 0, top: 1.5, z: -87, w: 3.5, d: 3.5, offset: [0, 6, 0], period: 4.5, style: 'metal' });
    L.platform(0, 7.5, -95, 6, 3, 10, { style: 'metal' });
    L.pendulum({ x: 0, pivotY: 14.7, z: -95, length: 6.2, period: 2.0, axis: 'z', headSize: 1.7 });

    // --- 細い柱 ---
    L.pillar(-1.8, 8.5, -103, 1.05, 8, { topColor: 0xb8bfd6, baseColor: 0x6f7690 });
    L.pillar(1.8, 9.5, -106.5, 1.05, 9, { topColor: 0xb8bfd6, baseColor: 0x6f7690 });
    L.star(1.8, 10.9, -106.5);

    // --- ゴール ---
    L.platform(0, 10, -114, 10, 3, 10, { style: 'metal' });
    L.goalGate(0, 10, -115);

    // --- 背景 ---
    L.floatingIsland(-25, -2, -30, 1.8);
    L.floatingIsland(25, 6, -75, 2.2);
    L.floatingIsland(-24, 14, -115, 2);
  },
};
