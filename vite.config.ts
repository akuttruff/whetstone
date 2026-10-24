import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import api from './server/api.ts'

// Any name on the tailnet, not one machine's: `tailscale serve` is what
// actually limits who can reach this, so a rename shouldn't break it.
const TAILNET = '.ts.net'

export default defineConfig(({ command, isPreview }) => {
  // `vite preview` is the one real instance (local and, via Tailscale,
  // remote). `vite dev` runs against a separate scratch database, so trying
  // something out while developing never touches real drafts and scores.
  const usingRealData = command === 'build' || isPreview
  const dir = usingRealData ? undefined : path.resolve(process.cwd(), '.data-dev')

  return {
    plugins: [react(), api({ dir })],
    server: {
      // Loopback only: `tailscale serve` proxies to 127.0.0.1, and the API
      // runs code without a login, so nothing else on the LAN may reach it.
      host: '127.0.0.1',
      port: 8300,
      strictPort: true,
      allowedHosts: [TAILNET],
      watch: { ignored: ['**/coverage/**', '**/.data/**', '**/.data-dev/**'] },
    },
    // A separate port from `server` above: the persistent, built instance
    // Tailscale points at, so it can run alongside `npm run dev`. Loopback
    // only, like `server`.
    preview: { host: '127.0.0.1', port: 8310, strictPort: true, allowedHosts: [TAILNET] },
  }
})
