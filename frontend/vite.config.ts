import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',  // Escutar em todas as interfaces
    port: 5173,
    strictPort: true,  // Fail if port is already in use
    allowedHosts: [
      'dev.agentp.website',
      'localhost',
      '203.0.113.12',  // IP público do servidor
    ],
    proxy: {
      // Backend API
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // UI Test Agent API
      '/agent': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      // UI Test static assets (screenshots/videos)
      '/tests': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        secure: false,
      },
      // AI Service API
      '/ai-api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ai-api/, '/api'),
      },
    },
  },
});
