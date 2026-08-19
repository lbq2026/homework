import { defineConfig } from 'vitest/config';
import path from 'path';

// Vitest 独立配置（不继承 vite.config 的插件，避免加载开发期 inspectAttr 插件）
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
