#!/usr/bin/env node
import { $ } from 'zx';

// 詳細な出力を有効にする
$.verbose = true;

try {
  // distディレクトリをクリーンアップ
  console.log('Cleaning dist directory...');
  await $`rm -rf dist`;

  // distディレクトリを作成
  await $`mkdir -p dist`;

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
    await $`vite build --config ${config}`;
  }

  // 静的ファイルをコピー
  console.log('Copying static files...');

  // manifest.jsonをコピー
  await $`cp manifest.json dist/manifest.json`;

  // アイコンディレクトリを作成してアイコンをコピー
  await $`mkdir -p dist/assets/icons`;
  await $`cp assets/icons/icon.png dist/assets/icons/icon.png`;

  // スタイルシートをコピー
  await $`cp src/content/styles.css dist/styles.css`;

  // HTMLファイルをコピー
  await $`cp src/popup/popup.html dist/popup.html`;
  await $`cp src/options/options.html dist/options.html`;

  // CSSファイルをコピー
  await $`cp src/popup/popup.css dist/popup.css`;
  await $`cp src/options/options.css dist/options.css`;

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}