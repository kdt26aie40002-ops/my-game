// ステージ5：またたく星の回廊（上級）
// 消える床のリズムジャンプ・ななめに動く床・振り子の連続・ダイブ必須の大穴
export default {
  id: 'stage5',
  name: 'またたく星の回廊',
  subtitle: '【上級】消える床をリズムよく！',
  spawn: [0, 1.3, 4],
  killY: -12,
  bgmTheme: 5,
  theme: {
    grass: 0xb9a8ff,
    dirt: 0x4b3f8a,
    stone: 0x5d4fa0,
    stoneTop: 0xc9c0ff,
    wood: 0xffd27a,
    woodDark: 0xb98a3a,
    accent: 0xffe066,
    leaf: 0x7a6cff,
    skyTop: 0x2a2470,
    skyBottom: 0xb07ac9,
    seaY: -24,
  },
  build(L) {
    // --- スタート ---
    L.platform(0, 0, 2, 12, 3, 12);
    L.sign(-3.6, 0, 3, ['光る床は消える！', '点滅したら急いで'], { width: 3.4 });
    L.mushroom(4.5, 0, 6, 1.3);
    L.mushroom(-5, 0, -2.5, 1);

    // --- 消える床（青とピンクが交互に現れる）---
    L.blink({ x: 0, top: 0, z: -6.5, period: 2.6, phase: 0 });
    L.blink({ x: 0, top: 0, z: -11, period: 2.6, phase: 0.5, color: 0xff8ad8 });
    L.blink({ x: 0, top: 0, z: -15.5, period: 2.6, phase: 0 });
    L.blink({ x: 0, top: 0, z: -20, period: 2.6, phase: 0.5, color: 0xff8ad8 });
    L.star(0, 1.4, -15.5);
    L.platform(0, 0, -25, 6, 3, 6);

    // --- ななめに動く床 ---
    L.mover({ x: -3, top: 0, z: -31.5, w: 3, d: 3, offset: [6, 2, 0], period: 3.2 });
    L.mover({ x: 3, top: 1.5, z: -36.5, w: 3, d: 3, offset: [-6, 1, 0], period: 3.2 });
    L.platform(0, 3, -43, 8, 3, 6);
    L.checkpoint(0, 3, -42, { halfWidth: 4 });

    // --- 振り子の一本橋 ---
    L.platform(0, 3, -57, 1.4, 1, 20);
    L.pendulum({ x: 0, pivotY: 10.2, z: -50.5, length: 6.2, period: 2.2, axis: 'z' });
    L.pendulum({ x: 0, pivotY: 10.2, z: -56.5, length: 6.2, period: 2.2, phase: Math.PI * 0.66, axis: 'z' });
    L.pendulum({ x: 0, pivotY: 10.2, z: -62.5, length: 6.2, period: 2.2, phase: Math.PI * 1.33, axis: 'z' });
    L.star(0, 4.4, -59.5);

    // --- 速く回る円盤 ---
    L.platform(0, 3, -71, 7, 3, 8);
    L.turntable({ x: 0, top: 3, z: -81, radius: 5, speed: 1.1, pegs: 4 });
    L.star(3.2, 4.6, -81);

    // --- 消える床 ---
    L.blink({ x: 0, top: 3.5, z: -89.5, period: 2.2, on: 0.55, phase: 0 });
    L.blink({ x: 0, top: 4, z: -94.5, period: 2.2, on: 0.55, phase: 0.5, color: 0xff8ad8 });

    // --- チェックポイント2とダイブの大穴（6m）---
    L.platform(0, 4, -100, 8, 3, 6);
    L.checkpoint(0, 4, -99, { halfWidth: 4 });
    L.sign(-2.6, 4, -101.6, ['大きな穴！ ジャンプして', 'すぐShiftでダイブ！'], { width: 2.8, height: 1.3, font: 36 });
    L.star(0, 6.2, -106);

    // --- ゴール ---
    L.platform(0, 4, -115, 10, 3, 12);
    L.goalGate(0, 4, -117);
    L.mushroom(-4, 4, -119.5, 1.4);
    L.mushroom(4, 4, -120, 1.1);

    // --- 背景 ---
    L.floatingIsland(-24, -2, -35, 1.8);
    L.floatingIsland(26, 6, -80, 2.2);
    L.floatingIsland(-22, 14, -125, 2);
  },
};
