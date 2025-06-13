import { execSync } from 'child_process';
import { rmSync, mkdirSync, copyFileSync } from 'fs';

// distディレクトリをクリーンアップ
try {
  rmSync('dist', { recursive: true, force: true });
} catch (e) {
  // ディレクトリが存在しない場合は無視
}

// distディレクトリを作成
mkdirSync('dist', { recursive: true });

// 各設定ファイルでビルドを実行
const configs = [
  'vite.config.content.ts',
  'vite.config.popup.ts',
  'vite.config.options.ts',
  'vite.config.background.ts'
];

console.log('Building Chrome extension...');

for (const config of configs) {
  console.log(`Building with ${config}...`);
  try {
    execSync(`vite build --config ${config}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to build with ${config}`);
    process.exit(1);
  }
}

// 静的ファイルをコピー
console.log('Copying static files...');

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

console.log('Build completed successfully!');
