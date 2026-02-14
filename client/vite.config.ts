import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
const envDir = path.resolve(__dirname, '..')
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  // Read version from package.json
  const packageJsonPath = path.resolve(__dirname, '../../package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  env.VITE_APP_VERSION = packageJson.version

  return {
    plugins: [react()],
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
  }
})
