// エントリーポイント
import './style.css';
import { Game } from './game.js';

const game = new Game(document.getElementById('game-container'));
game.init().catch((err) => {
  console.error(err);
  const box = document.querySelector('#screen-loading .loading-box p');
  if (box) box.textContent = '読み込みに失敗しました。ページを再読み込みしてください。';
});
