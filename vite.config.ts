import { defineConfig } from 'vite';

// Relative base so the build works on any GitHub Pages path
// (https://<user>.github.io/<any-forked-repo-name>/) without configuration.
export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
  },
});
