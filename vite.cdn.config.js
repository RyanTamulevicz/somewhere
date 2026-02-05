import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/address-input.ts'),
      name: 'AddressInput',
      fileName: 'address-input',
      formats: ['es']
    },
    outDir: 'dist-cdn',
    emptyOutDir: true,
    rollupOptions: {
      // Bundle everything - no external deps
      external: [],
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined
      }
    }
  }
});
