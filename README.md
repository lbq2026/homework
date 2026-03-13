# 小勇士积分王国

一个专为儿童设计的作业任务管理应用，通过游戏化的积分系统激励孩子完成作业任务。

## 功能特性

- 任务管理
  - 创建、编辑、删除作业任务
  - 设置任务积分和图标
  - 添加任务到今日计划
  - 一键完成所有任务
  - 三级分类系统（一级→二级→三级）
  - 临时任务支持

- 积分系统
  - 完成任务获得积分
  - 实时积分显示
  - 积分历史记录
  - 积分手动调整功能
  - 自动计算总积分（作业完成 + 积分调整 - 兑换消耗）

- 奖品兑换
  - 自定义奖品库
  - 使用积分兑换奖品
  - 兑换记录追踪

- 成就徽章
  - 多种成就徽章解锁
  - 连续完成任务统计
  - 分类任务统计

- 用户资料
  - 邮箱密码登录
  - 手机号绑定
  - 支持 Supabase 云端同步
  - 本地数据存储支持

- 数据管理
  - 导出应用数据
  - 导入恢复数据
  - 重置今日任务
  - 清空所有数据

## 技术栈

- 前端框架：React 19
- 开发语言：TypeScript
- 构建工具：Vite
- UI 组件库：Radix UI + shadcn/ui
- 样式方案：Tailwind CSS
- 动画库：Framer Motion
- 后端服务：Supabase
- 表单管理：React Hook Form
- 状态管理：React Hooks
- 图标库：Lucide React

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 Supabase 连接信息：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

详细的 Supabase 配置步骤请参考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动

### 4. 构建生产版本

```bash
npm run build
```

### 5. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
src/
├── components/          # 组件目录
│   ├── ui/             # UI 基础组件（shadcn/ui）
│   ├── BadgeDisplay.tsx
│   ├── BadgeUnlockModal.tsx
│   ├── IconPicker.tsx
│   ├── PointsDisplay.tsx
│   ├── ProgressBar.tsx
│   ├── RewardCard.tsx
│   └── TaskItem.tsx
├── hooks/              # 自定义 Hooks
│   ├── useAppState.ts
│   ├── useAuth.tsx
│   ├── useMobile.ts
│   ├── useDataBackup.ts
│   ├── useSupabaseData.ts
│   └── useSyncedAppState.ts
├── lib/                # 工具库
│   ├── supabase.ts     # Supabase 客户端配置
│   └── utils.ts        # 通用工具函数
├── types/              # TypeScript 类型定义
│   ├── database.ts     # 数据库类型
│   └── index.ts        # 通用类型
├── utils/              # 工具函数
│   ├── sound.ts        # 音效管理
│   └── storage.ts      # 本地存储管理
├── views/              # 页面视图
│   ├── Achievements.tsx
│   ├── Auth.tsx
│   ├── Home.tsx
│   ├── PointManagement.tsx
│   ├── Profile.tsx
│   ├── Rewards.tsx
│   ├── Settings.tsx
│   └── Tasks.tsx
├── App.tsx             # 主应用组件
├── main.tsx            # 应用入口
├── App.css             # 全局样式
└── index.css           # Tailwind 入口
```

## 数据库 Schema

应用使用 Supabase 作为后端服务，主要数据表包括：

- `profiles` - 用户资料表（包含手机号字段）
- `tasks` - 作业任务库（支持三级分类）
- `daily_records` - 每日作业完成记录
- `rewards` - 奖品库
- `redemptions` - 奖品兑换记录
- `badges` - 用户解锁的徽章记录
- `point_adjustments` - 积分调整记录
- `primary_categories` - 一级分类表
- `secondary_categories` - 二级分类表
- `tertiary_categories` - 三级分类表

完整的数据库 Schema 请查看 [sql/full-schema.sql](./sql/full-schema.sql)

### 最新数据库迁移

- [sql/fix-infinite-recursion.sql](./sql/fix-infinite-recursion.sql) - 修复无限递归问题
- [sql/fix-missing-functions.sql](./sql/fix-missing-functions.sql) - 修复缺失的函数
- [sql/safe-fix-all.sql](./sql/safe-fix-all.sql) - 安全修复所有问题

## 开发命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 运行 ESLint 检查
```

## 配置说明

### ESLint 配置

项目使用 ESLint 进行代码检查。如需启用类型感知的 lint 规则，可以更新配置：

```js
export default define {
  files: ['**/*.{ts,tsx}'],
  extends: [
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

### React Compiler

React Compiler 目前未启用，因为会影响开发和构建性能。如需启用，请参考 [React Compiler 文档](https://react.dev/learn/react-compiler/installation)。

## 相关文档

- [Supabase 设置指南](./SUPABASE_SETUP.md)
- [Supabase 官方文档](https://supabase.com/docs)
- [React 文档](https://react.dev)
- [Vite 文档](https://vite.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [shadcn/ui 文档](https://ui.shadcn.com)

## 许可证

MIT License
