// Canvas で生成するテクスチャ（外部画像ファイル不要）
import * as THREE from 'three';

const cache = {};

function canvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return [c, c.getContext('2d')];
}

function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finish(c, { srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 白ベースの細かい模様（マテリアルの色で着色して使う）
function speckle() {
  const [c, g] = canvas(256);
  const r = rand(7);
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const v = 205 + Math.floor(r() * 50);
    g.fillStyle = `rgb(${v},${v},${v})`;
    const x = r() * 256;
    const y = r() * 256;
    g.beginPath();
    g.ellipse(x, y, 2 + r() * 5, 1 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 120; i++) {
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(r() * 256, r() * 256, 2, 5);
  }
  return finish(c);
}

// 土・岩の側面（地層のしま模様）
function strata() {
  const [c, g] = canvas(256);
  const r = rand(13);
  g.fillStyle = '#e8e8e8';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 4 + r() * 6);
    g.lineTo(256, y + 16);
    g.lineTo(0, y + 16);
    g.fill();
  }
  for (let i = 0; i < 70; i++) {
    const v = 180 + Math.floor(r() * 50);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 4 + r() * 10, 3 + r() * 6, 0, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c);
}

// 木箱
function crate() {
  const [c, g] = canvas(256);
  g.fillStyle = '#d9954a';
  g.fillRect(0, 0, 256, 256);
  const r = rand(3);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i % 2 ? '#cf8a3f' : '#e2a157';
    g.fillRect(0, i * 51, 256, 49);
    g.fillStyle = 'rgba(120,60,20,0.25)';
    for (let k = 0; k < 6; k++) g.fillRect(r() * 256, i * 51 + r() * 45, 30 + r() * 60, 2);
  }
  g.strokeStyle = '#8a4e1c';
  g.lineWidth = 26;
  g.strokeRect(13, 13, 230, 230);
  g.lineWidth = 22;
  g.beginPath();
  g.moveTo(20, 20);
  g.lineTo(236, 236);
  g.stroke();
  g.fillStyle = '#5b3412';
  for (const [x, y] of [[13, 13], [243, 13], [13, 243], [243, 243]]) {
    g.beginPath();
    g.arc(x, y, 7, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c);
}

// 重い箱（鉄の補強）
function heavyCrate() {
  const [c, g] = canvas(256);
  g.fillStyle = '#8a7cc9';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#4b3f8a';
  g.lineWidth = 30;
  g.strokeRect(15, 15, 226, 226);
  g.fillStyle = '#ffd34d';
  g.font = 'bold 120px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('★', 128, 136);
  g.fillStyle = '#d6d0f0';
  for (const [x, y] of [[15, 15], [241, 15], [15, 241], [241, 241], [128, 15], [128, 241], [15, 128], [241, 128]]) {
    g.beginPath();
    g.arc(x, y, 8, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c);
}

function checker() {
  const [c, g] = canvas(256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = (x + y) % 2 ? '#2d2a4a' : '#ffffff';
      g.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  return finish(c);
}

function stripes() {
  const [c, g] = canvas(256);
  g.fillStyle = '#ffd23f';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#3b2f5c';
  for (let i = -256; i < 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 32, 0);
    g.lineTo(i + 32 + 256, 256);
    g.lineTo(i + 256, 256);
    g.fill();
  }
  return finish(c);
}

function candy() {
  const [c, g] = canvas(256);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#ff5d8f';
  for (let i = -256; i < 512; i += 64) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 32, 0);
    g.lineTo(i + 32 + 256, 256);
    g.lineTo(i + 256, 256);
    g.fill();
  }
  return finish(c);
}

function dots() {
  const [c, g] = canvas(128);
  g.fillStyle = '#ff5050';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff';
  for (const [x, y, rr] of [[30, 30, 14], [90, 50, 10], [50, 95, 12], [110, 110, 8], [10, 80, 7]]) {
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  }
  return finish(c);
}

const MAKERS = { speckle, strata, crate, heavyCrate, checker, stripes, candy, dots };

export function getTexture(name) {
  if (!cache[name]) cache[name] = MAKERS[name]();
  return cache[name];
}

// 同じ画像で繰り返し回数だけ違うテクスチャ
const repCache = {};
export function getTextureRepeat(name, rx, ry) {
  const key = `${name}_${rx.toFixed(1)}_${ry.toFixed(1)}`;
  if (!repCache[key]) {
    const t = getTexture(name).clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    repCache[key] = t;
  }
  return repCache[key];
}

// 看板などの文字テクスチャ
export function textTexture(lines, { width = 512, height = 256, bg = '#fff6df', fg = '#4a2f1b', border = '#c9874b', font = 44 } = {}) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, width, height);
  g.lineWidth = 16;
  g.strokeStyle = border;
  g.strokeRect(8, 8, width - 16, height - 16);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  const lh = font * 1.25;
  const startY = height / 2 - ((arr.length - 1) * lh) / 2;
  arr.forEach((line, i) => {
    let size = font;
    g.font = `bold ${size}px "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Meiryo", sans-serif`;
    while (g.measureText(line).width > width - 50 && size > 16) {
      size -= 2;
      g.font = `bold ${size}px "M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Meiryo", sans-serif`;
    }
    g.fillText(line, width / 2, startY + i * lh);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
