import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/roblox-catalog': {
        target: 'https://catalog.roblox.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/roblox-catalog/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      },
      '/api/roblox-thumbnails': {
        target: 'https://thumbnails.roblox.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/roblox-thumbnails/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      },
      '/api/roblox-assetdelivery': {
        target: 'https://assetdelivery.roblox.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/roblox-assetdelivery/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      },
      '/api/roblox-economy': {
        target: 'https://economy.roblox.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/roblox-economy/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      },
    },
  },
})
