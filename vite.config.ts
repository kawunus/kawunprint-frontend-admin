import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }: { mode: string }) => {
  // load .env files so VITE_API_BASE_URL is available here
  const env = loadEnv(mode, process.cwd(), '');
  const API_BASE = env.VITE_API_BASE_URL || 'http://localhost:8080';

  return defineConfig({
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        // Proxy API requests to the backend to avoid CORS in dev
        '/api': {
          target: API_BASE,
          changeOrigin: true,
          secure: false,
          // keep path as-is, rewrite not needed when backend prefix is /api
        },
      },
    },
  });
}