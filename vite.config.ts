import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig(({ mode }) => {
  // content script用の設定
  if (mode === 'content') {
    return {
      build: {
        target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
        outDir: 'dist',
        lib: {
          entry: resolve(__dirname, 'src/content/content.ts'),
          name: 'ContentScript',
          fileName: 'content',
          formats: ['iife']
        },
        rollupOptions: {
          external: ['chrome'],
          output: {
            globals: {
              chrome: 'chrome'
            }
          }
        },
        emptyOutDir: false
      }
    };
  }

  // その他のスクリプト用の設定（ES modules）
  return {
    build: {
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      outDir: 'dist',
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/background.ts'),
          popup: resolve(__dirname, 'src/popup/popup.ts'),
          options: resolve(__dirname, 'src/options/options.ts')
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          format: 'es',
          manualChunks: undefined
        }
      },
      emptyOutDir: true
    },
    plugins: [
      {
        name: 'copy-static-files',
        writeBundle() {
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
      }
    ]
  };
});