// ============================================================
//  Bouncy Buddies - 調整用パラメーター
//  操作感はこのファイルの数値を変えるだけで調整できます。
// ============================================================

// 物理ワールドの設定
export const PHYSICS = {
  gravity: -25,          // 重力（m/s^2）。現実より強めにして、きびきびした動きに
  fixedDt: 1 / 60,       // 物理演算の固定時間ステップ（秒）
  maxSubSteps: 5,        // 1フレームで実行する物理ステップの上限（処理落ち時の暴走防止）
  maxSpeed: 40,          // 速度の上限（すり抜けや暴走を防ぐ）
};

// キャラクターの調整値
export const PLAYER = {
  radius: 0.45,          // カプセルの半径
  halfHeight: 0.4,       // カプセル円柱部の半分の高さ（全高 = 2*(0.4+0.45) = 1.7）
  density: 1.0,
  restitution: 0.15,     // 跳ね返り

  moveSpeed: 7.0,        // 最高移動速度（m/s）
  groundAccel: 55,       // 地上の加速
  groundDecel: 38,       // 地上の減速（入力なし時）
  airAccel: 20,          // 空中制御（加速）
  airDecel: 3,           // 空中の減速
  slopeSlideNormalY: 0.8,// これより急な坂（法線のy成分）では滑る

  jumpVelocity: 10.5,    // ジャンプの初速
  jumpCutGravity: 1.6,   // ジャンプボタンを早く離したときの追加重力（小ジャンプ）
  fallGravity: 0.35,     // 落下中の追加重力（着地をきびきびさせる）
  coyoteTime: 0.12,      // 足場から落ちた直後でもジャンプできる猶予
  jumpBuffer: 0.14,      // 着地直前の入力も受け付ける猶予
  bounceVelocity: 17,    // ジャンプ台の発射速度

  turnRate: 12,          // 移動方向へ向き直る速さ
  uprightStrength: 14,   // 起き上がろうとする力
  angularBlend: 22,      // 角速度が目標に追従する速さ
  runLean: 0.035,        // 走っている時の前傾

  diveSpeed: 10.5,       // ダイブ（Shift）の水平速度
  diveUp: 4.5,           // ダイブの上向き速度
  diveTime: 0.75,        // ダイブ状態の時間
  diveCooldown: 0.9,

  stunImpact: 8.5,       // この速度変化以上の衝撃を受けると転倒
  stunTime: 1.1,         // 転倒時間
  getUpHop: 4.0,         // 起き上がり時の小ジャンプ
};

// カメラ
export const CAMERA = {
  distance: 11,
  height: 6.2,
  lookAhead: 3,
  followSharpness: 5,
  heightSharpness: 3.2,
  splitDistance: 17,     // 2人の距離がこれ以上で画面分割
  mergeDistance: 11,     // これ以下で共有カメラに戻る
  fov: 55,
};

// キー割り当ての初期値（KeyboardEvent.code）。設定画面から変更できます。
export const DEFAULT_BINDINGS = {
  p1: {
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['Space'],
    action: ['ShiftLeft'],
    reset: ['KeyR'],
  },
  p2: {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['Enter', 'NumpadEnter'],
    action: ['ShiftRight'],
    reset: ['Backspace'],
  },
};

export const ACTION_LABELS = {
  up: '前へ',
  down: '後ろへ',
  left: '左へ',
  right: '右へ',
  jump: 'ジャンプ',
  action: 'ダイブ',
  reset: 'チェックポイントへ戻る',
};

// プレイヤーの配色
export const PLAYER_STYLES = [
  { name: '1P', body: 0xff8552, belly: 0xffe2c4, accent: 0x2fbf71, ears: 'round', label: '#ff7a45' },
  { name: '2P', body: 0x4fb4ff, belly: 0xe2f3ff, accent: 0xffc93c, ears: 'long', label: '#2e9bff' },
];
