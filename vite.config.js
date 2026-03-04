import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    optimizeDeps: {
        include: [
            'framer-motion',
            'three',
            '@react-three/fiber',
            '@react-three/drei'
        ],
    },
})
