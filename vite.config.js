import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  // 开发服务器配置 - 支持SPA路由
  server: {
    historyApiFallback: true,
  },
  // 预览服务器配置
  preview: {
    historyApiFallback: true,
  }
});