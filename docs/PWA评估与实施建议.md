# PWA 离线能力评估与实施建议

> 生成日期：2026-08-14 ｜ 阶段三·工程化建设 ｜ 状态：**方案就绪，待安装依赖后启用**

---

## 一、评估结论

| 维度 | 评估 |
|---|---|
| 业务价值 | **高**——儿童作业应用的使用场景多为平板/手机、家庭环境，弱网与离线场景常见（通勤、户外、Wi-Fi 不稳定） |
| 当前基础 | 应用已有完整的本地优先架构（localStorage 全量状态 + Supabase 云同步），**天然适配 PWA**；离线时本地数据仍可用 |
| 改动成本 | 低——仅需接入 `vite-plugin-pwa`（Workbox 驱动），无需改业务代码 |
| 风险 | 低——Service Worker 仅在 HTTPS 或 localhost 生效，不影响开发调试 |

**结论：建议实施。** 收益集中在「离线可用 + 可安装到桌面/主屏 + 首屏加载加速」。

---

## 二、实施步骤（依赖安装后执行）

### 1. 安装依赖

```bash
pnpm add -D vite-plugin-pwa
```

### 2. vite.config.ts 启用插件

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: '小勇士积分王国',
        short_name: '小勇士',
        description: '专为儿童设计的作业任务管理应用',
        theme_color: '#3b82f6',       // 主色：蓝
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 应用为纯前端 + Supabase 云同步，API 请求走网络优先（不缓存动态数据）
        navigateFallback: '/index.html',
      },
    }),
  ],
});
```

### 3. 图标资源

需要准备 `public/icons/icon-192.png` 与 `icon-512.png`（主题色蓝底 + 奖杯/星星元素，与现有 UI 一致），放入 `public/` 目录。可用任一在线 PWA 图标生成器产出。

### 4. 离线策略说明

- **静态资源**（JS/CSS/字体/图标）：Workbox 预缓存（precache），首屏二次访问离线可用
- **应用数据**（任务/积分/兑换）：不走 SW 缓存，维持现有「localStorage 本地优先 + Supabase 同步」架构——离线操作先落本地，联网后自动同步
- **Auth 会话**：Supabase Auth 的 `persistSession` 已启用，离线期间会话保持

### 5. 验证清单

- [ ] `pnpm build` 后 `dist/` 出现 `sw.js`、`manifest.webmanifest`、`registerSW.js`
- [ ] Lighthouse PWA 审计 ≥ 90（可安装 + 离线可用）
- [ ] 断网刷新页面仍可用（本地数据可见）
- [ ] 手机浏览器「添加到主屏幕」后可独立启动

---

## 三、不做 PWA 的替代方案（低优先级）

若暂不引入 SW 复杂度，可先做 **Vite 预构建优化 + 缓存策略**：
- 路由级代码分割已实施（阶段三 T16），首屏体积已显著下降
- 接入 `vite-plugin-compression`（gzip/brotli）减少传输体积

---

## 四、实施依赖项汇总（阶段三全部新增依赖）

| 依赖 | 用途 | 命令 |
|---|---|---|
| `react-router-dom` | 路由 + 代码分割（T16 已用） | `pnpm add react-router-dom` |
| `vitest` | 单元测试（T14 已用） | `pnpm add -D vitest` |
| `vite-plugin-pwa` | PWA 离线能力（本方案） | `pnpm add -D vite-plugin-pwa` |
