
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createServiceProxy } from './src/config/serviceRoutes.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '', '');
  const BACKEND_URL = (env.VITE_API_BASE_URL || 'http://localhost:58082').replace(/\/+$/, '');
  return {
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 55173,
    strictPort: true,

    proxy: createServiceProxy(BACKEND_URL),
  },
  };
});
