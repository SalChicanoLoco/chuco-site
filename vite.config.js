import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@babylonjs/core')) return 'vendor-babylon';
          if (id.includes('node_modules')) return 'vendor';
        }
      }
    }
  }
});
