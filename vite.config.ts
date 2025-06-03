import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
        options: resolve(__dirname, 'src/options/options.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        format: 'es'
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
        copyFileSync('assets/icons/icon.jpg', 'dist/assets/icons/icon.jpg');
        
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
});
