import http from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const LMSTUDIO_HOST = process.env.LMSTUDIO_HOST ?? 'localhost';
const LMSTUDIO_PORT = Number(process.env.LMSTUDIO_PORT ?? 1234);
const PROXY_PREFIX = '/api/lmstudio';

// Dev-only middleware: forwards /api/lmstudio/* to the local LM Studio
// server so the browser can talk to it without CORS issues.
function lmstudioProxy(): Plugin {
  return {
    name: 'lmstudio-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith(PROXY_PREFIX)) {
          next();
          return;
        }
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }
        const upstream = http.request(
          {
            hostname: LMSTUDIO_HOST,
            port: LMSTUDIO_PORT,
            path: req.url.slice(PROXY_PREFIX.length) || '/',
            method: req.method,
            headers: { ...req.headers, host: `${LMSTUDIO_HOST}:${LMSTUDIO_PORT}` },
          },
          (upstreamRes) => {
            res.statusCode = upstreamRes.statusCode ?? 502;
            for (const [key, value] of Object.entries(upstreamRes.headers)) {
              if (value !== undefined) {
                res.setHeader(key, value as string | number | readonly string[]);
              }
            }
            upstreamRes.pipe(res);
          },
        );
        upstream.on('error', (err) => {
          if (!res.headersSent) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(
            JSON.stringify({
              error: {
                message: `Cannot reach LM Studio at ${LMSTUDIO_HOST}:${LMSTUDIO_PORT} (${err.message}). Is the local server running?`,
              },
            }),
          );
        });
        req.pipe(upstream);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), lmstudioProxy()],
});
