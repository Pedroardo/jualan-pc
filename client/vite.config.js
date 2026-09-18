import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
  },
  esbuild: {
    // Buang console.log/debugger dari bundle produksi — lebih kecil & tidak
    // membocorkan log internal ke DevTools pengunjung. Tetap aktif saat dev.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Pisahkan library pihak ketiga (react, react-dom, router) ke chunk
        // sendiri. Kode aplikasi kita sendiri sering berubah, tapi ketiga
        // library ini jarang — jadi browser bisa cache chunk vendor ini
        // walau kita deploy update lain di kemudian hari.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}));
