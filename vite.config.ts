import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        content: resolve(__dirname, 'src/content/content.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    emptyOutDir: true
  },
  plugins: [
    {
      name: 'copy-manifest',
      writeBundle() {
        // manifest.jsonをコピー
        copyFileSync('manifest.json', 'dist/manifest.json');
        
        // アイコンをコピー
        mkdirSync('dist/assets/icons', { recursive: true });
        copyFileSync('code-review-extension-icon.jpg', 'dist/assets/icons/icon.jpg');
        
        // スタイルシートをコピー
        copyFileSync('src/content/styles.css', 'dist/styles.css');
      }
    }
  ]
});
