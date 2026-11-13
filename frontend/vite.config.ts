import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.VITE_DEV_BACKEND || 'http://192.168.5.30:7788'

const bypass: ProxyOptions['bypass'] = (req) => {
  const url = req.url || ''
  if (
    url.startsWith('/spa') ||
    url.startsWith('/src') ||
    url.startsWith('/@') ||
    url.startsWith('/node_modules') ||
    url.startsWith('/favicon')
  ) {
    return req.url
  }
  if (req.method === 'GET' && (url === '/' || url.startsWith('/?'))) {
    return req.url
  }
  return undefined
}

export default defineConfig({
  base: '/spa/',
  plugins: [react()],
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
