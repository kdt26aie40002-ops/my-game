// ステージ4：くずれる岩の谷（上級）
// くずれる床・回る丸太・小さな柱・高速の動く床
export default {
  id: 'stage4',
  name: 'くずれる岩の谷',
  subtitle: '【上級】立ち止まると床がくずれる！',
  spawn: [0, 1.3, 4],
  killY: -12,
  bgmTheme: 4,
  theme: {
    grass: 0xf2c46b,
    dirt: 0xc9714a,
    stone: 0xa0624a,
    stoneTop: 0xe8b37c,
    wood: 0xe8b277,
    woodDark: 0xae6f3d,
    accent: 0x3fb6a8,
    leaf: 0x7cbf5a,
    skyTop: 0x5aa8ff,
    skyBottom: 0xffdcb0,
    seaY: -24,
  },
  build(L) {
    // --- スタート ---
    L.platform(0, 0, 2, 12, 3, 12);
    L.sign(-3.6, 0, 3, ['くずれる床！', '立ち止まらずに進め'], { width: 3.4 });
    L.rock(5, 0, 6, 1.4);
    L.rock(-5.2, 0, -2.6, 1.0);
    L.tree(5, 0, -2.5, 0.9);

    // --- くずれる床の連続 ---
    L.crumble({ x: 0, top: 0, z: -6.5 });
    L.crumble({ x: 1.5, top: 0, z: -11 });
    L.crumble({ x: -1.5, top: 0, z: -15.5 });
    L.crumble({ x: 0, top: 0.6, z: -20 });
    L.star(1.5, 1.4, -11);
    L.platform(0, 1, -25, 6, 3, 6);

    // --- 回る丸太 ---
    L.sign(-1.8, 1, -24, ['丸太は回ってる！', '流されないように'], { width: 2.4, height: 1.2, font: 38 });
    L.roller({ x: 0, top: 1, z: -37, length: 13, radius: 1.1, speed: 1.0 });
    L.star(0, 2.4, -40);

    // --- チェックポイント1 ---
    L.platform(0, 1, -49.5, 8, 3, 9);
    L.checkpoint(0, 1, -47.5, { halfWidth: 4 });
    L.rock(-3, 1, -52.5, 0.9);

    // --- 細い柱をのぼる ---
    L.pillar(2, 2.2, -57.5, 1.2, 8);
    L.pillar(-1.5, 3.4, -61, 1.2, 9);
    L.pillar(1.8, 4.6, -64.5, 1.2, 10);
    L.star(-1.5, 4.8, -61);

    // --- 速い回転バー ---
    L.platform(0, 5, -71.5, 8, 3, 9);
    L.sweeper({ x: 0, top: 5, z: -71.5, length: 8.6, speed: 2.2, height: 0.6, double: true });

    // --- 速い動く床 ---
    L.mover({ x: -4, top: 5, z: -79.5, w: 3, d: 3, offset: [8, 0, 0], period: 3.2 });
    L.platform(0, 5, -86, 8, 3, 8);
    L.checkpoint(0, 5, -84, { halfWidth: 4 });

    // --- くずれる階段 ---
    L.crumble({ x: 0, top: 6, z: -93.5, delay: 0.45 });
    L.crumble({ x: -1.5, top: 7.2, z: -97.5, delay: 0.45 });
    L.crumble({ x: 1.5, top: 8.4, z: -101.5, delay: 0.45 });
    L.star(1.5, 9.8, -101.5);

    // --- ゴール ---
    L.platform(0, 9, -109, 10, 3, 10);
    L.goalGate(0, 9, -110);
    L.rock(-4, 9, -112.5, 1.2);
    L.tree(4, 9, -113, 1.1);

    // --- 背景 ---
    L.floatingIsland(-24, -2, -30, 1.8);
    L.floatingIsland(27, 5, -70, 2.2);
    L.floatingIsland(-26, 12, -110, 1.8);
  },
};
