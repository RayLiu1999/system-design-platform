import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 設定：資深後端系統設計學習平台
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // 允許外部存取（Docker 環境需要）
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
