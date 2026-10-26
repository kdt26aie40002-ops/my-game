import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages（https://ユーザー名.github.io/リポジトリ名/）でも動くよう相対パスで出力
  base: './',
  server: { port: 5173 },
  build: {
    // 物理エンジン Rapier（WASM 内蔵）が大きいため警告の上限を上げる
    chunkSizeWarningLimit: 4000,
  },
});
