import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'demo',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'demo/index.html'),
      },
    },
  },
  publicDir: '../dist',
});

// CDN bundle config - build this separately with: vite build --config vite.cdn.config.js
export const cdnConfig = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/address-input.ts'),
      name: 'AddressInput',
      fileName: 'address-input-cdn',
      formats: ['es']
    },
    outDir: 'dist-cdn',
    emptyOutDir: true,
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true
      }
    }
  }
});
