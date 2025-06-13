import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/background/background.ts'),
      formats: ['es'],
      fileName: () => 'background.js'
    },
    rollupOptions: {
      external: ['chrome'],
      output: {
        format: 'es'
      }
    }
  }
});
