import { copyFileSync, mkdirSync } from 'fs';

// 静的ファイルをコピーする関数
export function copyStaticFiles() {
  // manifest.jsonをコピー
  copyFileSync('manifest.json', 'dist/manifest.json');
  
  // アイコンをコピー
  mkdirSync('dist/assets/icons', { recursive: true });
  copyFileSync('assets/icons/icon.png', 'dist/assets/icons/icon.png');
  
  // スタイルシートをコピー
  copyFileSync('src/content/styles.css', 'dist/styles.css');
  
  // HTMLファイルをコピー
  copyFileSync('src/popup/popup.html', 'dist/popup.html');
  copyFileSync('src/options/options.html', 'dist/options.html');
  
  // CSSファイルをコピー
  copyFileSync('src/popup/popup.css', 'dist/popup.css');
  copyFileSync('src/options/options.css', 'dist/options.css');
}
