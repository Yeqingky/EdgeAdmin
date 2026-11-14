import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const backend = process.env.VITE_DEV_BACKEND || 'http://192.168.5.30:7788'

const bypass: ProxyOptions['bypass'] = (req) => {
  const url = req.url || ''
  if (
    url.startsWith('/spa') ||
    url.startsWith('/src') ||
    url.startsWith('/@') ||
    url.startsWith('/node_modules')
  ) {
    return req.url
  }
  const accept = String(req.headers.accept || '')
  if (req.method === 'GET' && accept.includes('text/html') && !url.includes('_format=json')) {
    return req.url
  }
  return undefined
}

export default defineConfig({
  base: '/spa/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/': { target: backend, changeOrigin: true, bypass },
    },
  },
  build: {
    outDir: '../web/public/spa',
    emptyOutDir: true,
    cssMinify: false,
  },
})
