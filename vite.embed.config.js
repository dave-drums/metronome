import { defineConfig } from 'vite';

// Independent entry: no PWA plugin, standalone entry or external React runtime.
export default defineConfig({
  base: 'https://dave-drums.github.io/metronome/',
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    target: 'es2020',
    outDir: 'dist/embed',
    emptyOutDir: true,
    lib: { entry: 'src/embed.js', formats: ['es'], fileName: () => 'metronome.js', cssFileName: 'metronome' },
    rollupOptions: { output: { banner: '/*! Dave Drums metronome. MIT. Source: https://github.com/dave-drums/metronome; see ../LICENSE */' } }
  }
});
