// ステージ7：つるつる氷河すべり（上級）
// 氷の下り坂からの大ジャンプ・氷のジグザグ一本橋・氷の上の回転バーと振り子・氷の小さな足場
export default {
  id: 'stage7',
  name: 'つるつる氷河すべり',
  subtitle: '【上級】止まれない！氷の上で勝負',
  spawn: [0, 7.3, 4],
  killY: -10,
  bgmTheme: 7,
  theme: {
    grass: 0xeaf8ff,
    dirt: 0x7fb3d9,
    stone: 0x9cc3e0,
    stoneTop: 0xe6f4ff,
    wood: 0xb9e2ff,
    woodDark: 0x6aa6cf,
    accent: 0x3f7bff,
    leaf: 0x2f9e7a,
    skyTop: 0x6cbcff,
    skyBottom: 0xf0fbff,
    seaY: -24,
  },
  build(L) {
    // --- スタート（高い所から）---
    L.platform(0, 6, 2, 12, 3, 12);
    L.sign(-3.6, 6, 3, ['氷はつるつる！', '早めにブレーキ'], { width: 3.4 });
    L.tree(5, 6, 6, 1.2);
    L.tree(-5, 6, -2.5, 1);

    // --- 氷の下り坂 → 勢いで大ジャンプ ---
    L.slope(0, -4, 6, -16, 2, 5, { style: 'ice' });
    L.platform(0, 2, -20, 5, 3, 8, { style: 'ice' });
    L.star(0, 4, -25.5);
    L.platform(0, 2, -31, 6, 3, 7);
    L.checkpoint(0, 2, -30, { halfWidth: 3 });

    // --- 氷のジグザグ一本橋 ---
    L.platform(0, 2, -40, 1.8, 1, 10, { style: 'ice' });
    L.platform(3, 2, -45.9, 7.8, 1, 1.8, { style: 'ice' });
    L.platform(6, 2, -51.8, 1.8, 1, 10, { style: 'ice' });
    L.star(6, 3.3, -52);

    // --- 氷の広場と回転バー ---
    L.platform(3, 2, -61, 8, 3, 8, { style: 'ice' });
    L.sweeper({ x: 3, top: 2, z: -61, length: 7.4, speed: 1.6, height: 0.6 });
    L.platform(3, 2, -69, 6, 3, 6);
    L.checkpoint(3, 2, -68, { halfWidth: 3 });

    // --- 氷の動く床 → 氷の振り子広場 ---
    L.mover({ x: 3, top: 2, z: -76, w: 3, d: 3, offset: [0, 0, -6], period: 3.5, style: 'ice' });
    L.platform(3, 2, -89, 6, 3, 8, { style: 'ice' });
    L.pendulum({ x: 3, pivotY: 9.2, z: -89, length: 6.2, period: 2.4, axis: 'z' });

    // --- 上り坂（氷ではない）---
    L.slope(3, -93, 2, -100, 4.5, 4);
    L.platform(3, 4.5, -104, 6, 3, 8);

    // --- 氷の小さな足場 ---
    L.platform(1, 5.3, -111.5, 2.6, 0.8, 2.6, { style: 'ice' });
    L.platform(4, 6.1, -115.5, 2.6, 0.8, 2.6, { style: 'ice' });
    L.platform(1, 6.9, -119.5, 2.6, 0.8, 2.6, { style: 'ice' });
    L.star(4, 7.5, -115.5);

    // --- ゴール ---
    L.platform(3, 7.5, -127, 10, 3, 10);
    L.goalGate(3, 7.5, -128);
    L.tree(-0.5, 7.5, -130.5, 1.1);
    L.tree(6.5, 7.5, -131, 1.3);

    // --- 背景 ---
    L.floatingIsland(-22, 0, -40, 1.8);
    L.floatingIsland(28, 8, -85, 2.2);
    L.floatingIsland(-20, 16, -130, 2);
  },
};
