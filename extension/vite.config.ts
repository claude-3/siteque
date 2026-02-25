import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, defineManifest } from '@crxjs/vite-plugin'
import manifestJson from './manifest.json'
import tailwindcss from '@tailwindcss/vite'

const manifest = defineManifest((env) => {
  const baseManifest = { ...manifestJson } as any

  if (env.command === 'build' && baseManifest.host_permissions) {
    baseManifest.host_permissions = baseManifest.host_permissions.filter(
      (url: string) => !url.includes('localhost') && !url.includes('127.0.0.1')
    )
  }

  return baseManifest
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
    cors: true,
  },
})
