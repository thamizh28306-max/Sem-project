/// <reference types="vitest" />
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function cspPlugin(apiBaseUrl: string): Plugin {
  return {
    name: 'html-csp-transform',
    transformIndexHtml(html) {
      // Leaflet requires 'unsafe-inline' for style-src because its engine dynamically assigns
      // CSS transform, width, height, and display inline styles to tile panes and divIcons.
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
        `connect-src 'self' ${apiBaseUrl}`,
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; ');

      return html.replace(
        /%VITE_CSP_META%/g,
        `<meta http-equiv="Content-Security-Policy" content="${csp};">`
      );
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [react(), cspPlugin(apiBase)],
    server: {
      port: 5173,
      // Optional reverse-proxy for local development if CORS is undesirable:
      // proxy: {
      //   '/api': {
      //     target: apiBase,
      //     changeOrigin: true
      //   }
      // }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/leaflet')) {
              return 'leaflet-vendor';
            }
          }
        }
      }
    }
  };
});
