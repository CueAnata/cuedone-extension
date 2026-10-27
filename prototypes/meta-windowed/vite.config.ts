import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 8082,
    strictPort: true,
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    rollupOptions: {
      input: './index.html',
      output: {
        // Bump the release prefix to invalidate previously cached build URLs.
        entryFileNames: 'assets/[name]-20261026-cache1-[hash].js',
        chunkFileNames: 'assets/[name]-20261026-cache1-[hash].js',
        assetFileNames: 'assets/[name]-20261026-cache1-[hash][extname]',
      },
    },
  },
  esbuild: { target: 'es2022' },
  base: './',
});
