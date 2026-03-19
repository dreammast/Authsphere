import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@authsphere/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',  // auth-server port
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.error(`[vite-proxy] ❌ Error forwarding ${req.method} ${req.url}:`, err.message);
          });
          proxy.on('proxyReq', (_, req) => {
            console.log(`[vite-proxy] ➡️  ${req.method} ${req.url}`);
          });
          proxy.on('proxyRes', (res, req) => {
            const color = (res.statusCode ?? 0) >= 400 ? '🔴' : '🟢';
            console.log(`[vite-proxy] ${color} ${res.statusCode} ← ${req.method} ${req.url}`);
          });
        },
      },
    },
  },
});

