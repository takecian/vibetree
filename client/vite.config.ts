import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const envDir = path.resolve(__dirname, '..')
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')
  return {
    plugins: [react()],
    envDir,
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
    },
  }
})
