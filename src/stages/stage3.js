// ステージ3：そびえる夕焼けの塔（高低差と、2人で協力すると楽になる仕掛け）
// ・スイッチの門：1人がスイッチを押さえ、もう1人が通る（1人なら箱をスイッチに乗せる or 走って間に合わせる）
// ・高い壁：相棒の頭をふみ台にする（1人なら箱を運んで足場にする）
export default {
  id: 'stage3',
  name: 'そびえる夕焼けの塔',
  subtitle: '協力して高い壁をのりこえよう！',
  spawn: [0, 1.3, 4],
  killY: -12,
  bgmTheme: 2,
  theme: {
    grass: 0x95d97c,
    dirt: 0x9b7bb8,
    stone: 0x7e6aa8,
    stoneTop: 0xc9b8ea,
    wood: 0xffcf8a,
    woodDark: 0xc98a4b,
    accent: 0xffb347,
    leaf: 0x5cc48a,
    skyTop: 0x5b6cf0,
    skyBottom: 0xffc8a6,
    seaY: -22,
  },
  build(L) {
    // --- スタート ---
    L.platform(0, 0, 2, 12, 3, 12);
    L.sign(-3.6, 0, 3, ['ジグザグの足場を', 'のぼっていこう'], { width: 3.4 });
    L.tree(5, 0, 6.5, 1.2);
    L.flowers(-4, 0, -2.5, 6, 1);

    // --- 浮かぶ階段 ---
    L.platform(1.5, 1.1, -6.5, 3.5, 0.8, 3.5, { style: 'wood' });
    L.platform(-1.5, 2.2, -10.5, 3.5, 0.8, 3.5, { style: 'wood' });
    L.platform(1.5, 3.3, -14.5, 3.5, 0.8, 3.5, { style: 'wood' });
    L.platform(-1.5, 4.4, -18.5, 3.5, 0.8, 3.5, { style: 'wood' });
    L.star(1.5, 4.6, -14.5);

    // --- スイッチの門（協力ポイント1）---
    L.platform(0, 5, -33, 12, 3, 24);
    // 門の左右の高い壁
    L.block(-3.75, 8, -30, 4.5, 6, 1, { color: 0x7e6aa8 });
    L.block(3.75, 8, -30, 4.5, 6, 1, { color: 0x7e6aa8 });
    L.block(0, 10.25, -30, 3, 1.5, 1, { color: 0x6a5794 });
    L.pressurePlate(-3.5, 5, -25, 'A');
    L.pressurePlate(3.5, 5, -33.5, 'B');
    L.gate({ x: 0, top: 5, z: -30, w: 3, h: 4.5, d: 0.6, plates: ['A', 'B'], holdTime: 2.0 });
    L.crate(3.2, 5.8, -24, 1.4);
    L.sign(-3.8, 5, -22.5, ['スイッチで門が開く！', '1人なら箱をのせよう'], { width: 3.6 });
    L.checkpoint(0, 5, -35.5, { halfWidth: 5.5 });

    // --- 高い壁（協力ポイント2）---
    L.crate(-3.5, 6, -39, 1.6);
    L.crate(3.5, 6, -41, 1.6);
    L.sign(-4, 5, -43.6, ['高い壁！ 相棒の頭か', '箱をふみ台にしよう'], { width: 3.4 });
    L.platform(0, 8.4, -51, 12, 6.8, 12);
    L.star(4.5, 6.2, -44);
    L.checkpoint(0, 8.4, -48.5, { halfWidth: 5.5 });
    L.tree(-4.6, 8.4, -54, 0.9);
    L.tree(4.6, 8.4, -54.5, 1.1);

    // --- 回転バーの通路 ---
    L.platform(0, 8.4, -68, 5, 2, 22, { style: 'stone' });
    L.sweeper({ x: 0, top: 8.4, z: -63, length: 6, speed: 1.6, height: 0.6, double: true });
    L.sweeper({ x: 0, top: 8.4, z: -72.5, length: 6, speed: -1.9, height: 0.6, double: true });
    L.star(-2, 9.6, -67.8);

    // --- 高低差のある柱ジャンプ ---
    L.pillar(-2, 9.6, -81.5, 1.3, 8);
    L.pillar(1.8, 10.8, -85.2, 1.2, 9);
    L.pillar(-1.6, 12, -88.9, 1.2, 10);
    L.star(1.8, 12.2, -85.2);

    // --- ゴール ---
    L.platform(0, 13, -97, 10, 3, 12);
    L.goalGate(0, 13, -99);
    L.tree(-4, 13, -101.5, 1);
    L.tree(4, 13, -102, 1.2);
    L.flowers(0, 13, -93, 8, 2);

    // --- 背景 ---
    L.floatingIsland(-22, 0, -30, 1.8);
    L.floatingIsland(26, 6, -60, 2.0);
    L.floatingIsland(-28, 14, -100, 2.2);
    L.floatingIsland(14, 24, -150, 3);
  },
};
