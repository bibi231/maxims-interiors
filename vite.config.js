import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2019',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy/independent groups so the public site loads lean
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('react-router')) return 'router'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor'
          }
          // Admin pages are lazy-loaded; keep them out of the public bundle
          if (id.includes('/src/pages/admin/') || id.includes('/src/components/admin/')) {
            return 'admin'
          }
        },
      },
    },
  },
})
