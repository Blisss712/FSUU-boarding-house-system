import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { aiSearchProxy } from './scripts/vite-ai-proxy.js'
import { routeProxy } from './scripts/vite-route-proxy.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // AI Student-Needs Search: keeps GEMINI_API_KEY on the dev/preview server
    // instead of shipping it inside the browser bundle.
    aiSearchProxy(),
    // Walking-route proxy: the deployed CSP only allows same-origin calls, so
    // `/api/route` is served here in dev/preview and by api/route.js on Vercel.
    routeProxy()
  ]
})
