# 小勇士积分王国

一个专为 **6~12 岁儿童**设计的作业任务管理应用，通过游戏化的积分、连击、徽章系统激励孩子主动完成作业。家长可配置作业库、审核兑换、查看孩子成长数据。

> 当前版本：**v2.1.0**（亮色乐园设计系统全站落地）

---

## ✨ 功能特性

### 🧒 双角色体系（P0-1）
| 角色 | 权限 |
|------|------|
| **家长** | 配置作业库、创建孩子账号、调整积分、审核兑换、数据备份/重置、徽章管理 |
| **孩子** | 查看今日作业、打卡完成、兑换奖品、查看成就徽章 |

### 📚 作业管理
- 三级分类系统（一级分类 → 二级分类 → 三级分类/任务）
- 任务积分、图标、重复规则（每天/每周指定星期）
- 今日清单 + 一键生成（按重复规则自动填充）+ 临时任务
- 一键完成所有任务

### ⭐ 积分系统
- 完成任务获得积分，实时显示
- 自动计算总积分（作业完成 + 手动调整 - 兑换消耗）
- 积分流水记录（家长可手动加减分，需填写原因）
- 补签卡：用积分兑换，可补回一天连击

### 🎁 奖品兑换
- 家长自定义奖品库（分类：娱乐/实物/特权/其他）
- 孩子用积分发起兑换 → **家长审核**（通过/驳回/标记兑现）
- 兑换记录追踪

### 🏅 成就徽章
- 内置 12 种徽章（连击 3/7/15 天、分类大师、积分里程碑等）
- **家长自定义徽章**（P2-2）：名称/图标/解锁条件（完成任务/积分/连击）
- 成长趋势图（7 天/30 天）、本周周报、分类统计

### 🔐 账号体系
- **邮箱登录 + 用户名登录**（兼容，用户名登录走 RPC 反查）
- 手机号登录（需配置短信服务商，见配置指南）
- 家长代创建子账号（RPC 直插 auth.users，无需真实邮箱）
- 密码找回（重置邮件）

### 👨👩👧 多孩子支持（P0-5）
- 家长创建多个孩子档案，独立账号、独立数据
- 家长控制台：孩子列表 + 数据面板 + 兑换审核 + 管理入口

### 📱 PWA + 本地提醒（P1-4）
- 可安装到主屏幕、离线可用（Service Worker 缓存）
- 作业提醒：设置时间，浏览器通知提醒未完成任务

### 🔒 数据安全
- Supabase 云端同步 + 本地存储双模式
- 数据备份（导出 JSON）/ 恢复 / 重置（二次确认 + 自动备份）
- 隐私政策页（儿童数据保护、家长同意机制、数据权利）

---

## 🎨 设计系统（v2.0 亮色乐园版）

面向小学生的**高饱和度亮色**视觉体系，详见 [docs/design-system.md](./docs/design-system.md)。

| 维度 | 规范 |
|------|------|
| 主品牌色 | 天蓝 `#0284C7`（`brand-500`） |
| 辅助色 | 柠檬黄 / 嫩绿 / 棉花糖粉 / 香芋紫 / 蜜桔橙 |
| 页面底色 | 奶油白 `neutral-50`（`#FAFAF9`） |
| 角色色 | 孩子亮粉 `#EC4899` · 家长天蓝 `#0EA5E9` |
| 圆角 | 卡片 20px / 容器 24px / 按钮 14px |
| 字体 | 正文 16px/500/1.6，儿童可读 |

Token 定义：`src/styles/tokens.css` + `tailwind.config.js`

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 |
| 开发语言 | TypeScript |
| 构建工具 | Vite 6 |
| UI 组件 | shadcn/ui（Radix UI） |
| 样式方案 | Tailwind CSS 4 + CSS 变量 Token |
| 动画库 | Framer Motion |
| 图表 | Recharts |
| 后端服务 | Supabase（Auth + Postgres + RLS） |
| 图标库 | Lucide React |
| 包管理器 | pnpm |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
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

> 📖 详细的 Supabase 配置步骤请参考 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

### 3. 初始化数据库

在 Supabase SQL Editor 按顺序执行以下脚本（**均已自包含，不依赖前置脚本**）：

```bash
sql/now-phase-trust-fix.sql        # P0 信任基础：RLS 策略、备份表、多孩子 parent_id
sql/next-phase-growth-retention.sql # P1 增长留存：连击、补签卡、周报视图
sql/later-phase-scale-compliance.sql # Later 规模合规：custom_badges 表 + RLS
sql/username-login.sql             # 用户名→邮箱映射函数
sql/create-child-account.sql       # 家长代创建子账号 RPC（绕过 signUp 限流）
```

### 4. 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:5173 启动

### 5. 构建生产版本

```bash
pnpm build
```

### 6. 预览生产构建

```bash
pnpm preview
```

---

## 📂 项目结构

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
│   ├── useSyncedAppState.ts  # 核心状态同步 Hook
│   ├── useAuth.tsx           # 认证（邮箱/用户名/手机号/RPC）
│   ├── useDataBackup.ts      # 数据备份与恢复
│   ├── useReminder.ts        # PWA 本地提醒
│   ├── useSupabaseData.ts
│   └── use-mobile.ts
├── lib/                # 工具库
│   ├── supabase.ts     # Supabase 客户端配置
│   └── utils.ts        # 通用工具函数
├── styles/             # 样式
│   └── tokens.css      # 设计系统 CSS 变量层
├── types/              # TypeScript 类型定义
│   ├── database.ts     # 数据库类型（含 RPC 函数类型）
│   └── index.ts        # 通用类型
├── utils/              # 工具函数
│   ├── date.ts         # 日期工具（本地时区）
│   ├── sound.ts        # 音效管理
│   └── storage.ts      # 本地存储 + 连击/徽章计算
├── views/              # 页面视图
│   ├── Home.tsx            # 孩子首页
│   ├── Auth.tsx            # 登录/注册/手机登录
│   ├── Tasks.tsx           # 作业管理（今日清单 + 作业库）
│   ├── Rewards.tsx         # 奖品兑换
│   ├── Achievements.tsx    # 成就徽章
│   ├── Profile.tsx         # 个人中心
│   ├── PointManagement.tsx # 积分管理
│   ├── Children.tsx        # 我的孩子
│   ├── ParentDashboard.tsx # 家长控制台
│   ├── Badges.tsx          # 徽章管理（家长自定义）
│   ├── Settings.tsx        # 设置
│   ├── Privacy.tsx         # 隐私政策
│   └── ResetPassword.tsx   # 密码重置
├── App.tsx             # 主应用组件 + 路由
├── main.tsx            # 应用入口（PWA 注册）
└── index.css           # Tailwind 入口
```

---

## 🗄️ 数据库 Schema

应用使用 Supabase 作为后端服务，主要数据表包括：

| 表 | 说明 |
|----|------|
| `profiles` | 用户资料（含 `role` 家长/孩子、`parent_id` 亲子关联、手机号） |
| `tasks` | 作业任务库（三级分类 + 重复规则） |
| `primary_categories` / `secondary_categories` / `tertiary_categories` | 三级分类表 |
| `daily_records` | 每日作业完成记录 |
| `rewards` | 奖品库 |
| `redemptions` | 奖品兑换记录（pending/approved/fulfilled/rejected） |
| `badges` | 用户解锁的徽章记录 |
| `custom_badges` | 家长自定义徽章定义（P2-2） |
| `point_adjustments` | 积分调整记录 |
| `data_backups` | 云端备份记录（P0-2） |

**RPC 函数**：
- `get_email_by_username(text)` — 用户名反查邮箱（用户名登录）
- `create_child_account(text, text, uuid)` — 家长代创建子账号（密码 bcrypt 哈希，绕过 signUp 邮件限流）

完整 Schema 请查看 [sql/full-schema.sql](./sql/full-schema.sql)，所有迁移脚本见 `sql/` 目录。

---

## 📋 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm preview      # 预览生产构建
pnpm lint         # 运行 ESLint 检查
pnpm exec tsc -b  # TypeScript 类型检查
```

---

## 📄 相关文档

- [设计系统规范（v2.0 亮色乐园）](./docs/design-system.md)
- [产品优化建议与路线图](./docs/产品优化建议-小勇士积分王国.md)
- [手机号登录配置指南](./docs/手机号登录配置指南.md)
- [PWA 评估与实施建议](./docs/PWA评估与实施建议.md)
- [Supabase 设置指南](./SUPABASE_SETUP.md)
- [更新日志 CHANGELOG](./docs/CHANGELOG.md)
- [Supabase 官方文档](https://supabase.com/docs)
- [React 文档](https://react.dev)
- [Vite 文档](https://vite.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [shadcn/ui 文档](https://ui.shadcn.com)

---

## 📌 版本历史

| 版本 | 内容 |
|------|------|
| v2.1.0 | 亮色乐园设计系统全站落地（11 页面 + 2 组件） |
| v2.0.0 | 设计系统升级为亮色系（天蓝主色 + 高饱和辅助色） |
| v1.4.1 | 用户名密码登录（兼容邮箱）、子账号 RPC 创建 |
| v1.4.0 | 三阶段产品优化 15 项全部落地（信任基础/增长留存/规模合规） |
| v1.0.0 | 基础版：作业/积分/奖品/徽章 |

---

## 许可证

MIT License
