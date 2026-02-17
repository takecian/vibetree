import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
const envDir = path.resolve(__dirname, '..')
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  // Read version from package.json
  const packageJsonPath = path.resolve(__dirname, '../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  process.env.VITE_APP_VERSION = packageJson.version

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    },
    envDir,
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Terminal emulator in its own chunk
            'xterm': ['@xterm/xterm', '@xterm/addon-fit'],
            // Diff viewer libraries in their own chunk
            'diff-view': ['react-diff-view', 'diff'],
            // Router in its own chunk
            'router': ['react-router-dom'],
            // Socket.io in its own chunk
            'socket': ['socket.io-client'],
            // React Query and tRPC in their own chunk
            'query': ['@tanstack/react-query', '@trpc/client', '@trpc/react-query'],
            // i18n in its own chunk
            'i18n': ['i18next', 'react-i18next'],
            // UI libraries
            'ui-icons': ['lucide-react'],
          },
        },
      },
    },
  }
})
