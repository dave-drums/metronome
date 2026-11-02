import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/reference/',
  build: { target: 'es2022', outDir: '../../.tools/reference', emptyOutDir: true }
});
