# 小勇士积分王国

一个专为 **6~12 岁儿童**设计的作业任务管理应用，通过游戏化的积分、连击、徽章系统激励孩子主动完成作业。家长可配置作业库、审核兑换、查看孩子成长数据。

> 当前版本：**v2.1.2**（详见 [docs/CHANGELOG.md](./docs/CHANGELOG.md)）

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
| 路由 | React Router 7 |
| 开发语言 | TypeScript（strict） |
| 构建工具 | Vite 7 |
| UI 组件 | shadcn/ui（Radix UI） |
| 样式方案 | Tailwind CSS 3 + CSS 变量 Token |
| 表单 | React Hook Form + Zod |
| 动画库 | Framer Motion |
| 图表 | Recharts |
| 后端服务 | Supabase（Auth + Postgres + RLS） |
| 图标库 | Lucide React |
| 单元测试 | Vitest |
| 包管理器 | pnpm |

---

## 🚀 快速开始

### 0. 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Node.js | ≥ 20（推荐 22 LTS） | CI 环境使用 Node 22 |
| pnpm | ≥ 9（推荐 11） | 项目锁定的包管理器，请勿与 npm/yarn 混用 |
| Supabase 账号 | 任意 | 免费版即可运行 |

检查本地环境：

```bash
node -v    # 应为 v20.x 及以上
pnpm -v    # 应为 9.x 及以上
```

如未安装 pnpm，任选一种方式：

```bash
# 方式一：Corepack（Node 20+ 自带，推荐）
corepack enable

# 方式二：npm 全局安装
npm install -g pnpm
```

### 1. 克隆并安装依赖

```bash
git clone <repository-url>
cd homework-main
pnpm install
```

安装完成后可先做一次验证（类型检查通过说明依赖完整）：

```bash
pnpm exec tsc -b
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

在 Supabase SQL Editor **按顺序**执行以下脚本（均为幂等脚本，可重复执行）：

```bash
# 全新环境：先建基线表（10 张业务表 + RLS + 积分触发器）
sql/full-schema.sql                 # 或 supabase/migrations/…initial_schema.sql（含 data_backups）
# 然后依次补齐增量（均有 IF NOT EXISTS / OR REPLACE 保护）
sql/now-phase-trust-fix.sql         # P0：redemptions.status 审核状态机 + is_parent() + 家长 RLS
sql/next-phase-growth-retention.sql # P1：临时任务 / 重复规则 / 多孩子 RLS
sql/later-phase-scale-compliance.sql # Later：custom_badges 表 + RLS
sql/username-login.sql              # 用户名→邮箱映射函数
sql/create-child-account.sql        # 家长代创建子账号 RPC（绕过 signUp 限流）
```

> 存量库若报 `Could not find the 'status' column of 'redemptions'`：先执行 `sql/fix-redemption-status-only.sql` 急救补列，再补跑 `now-phase-trust-fix.sql` 获得家长审核完整 RLS。脚本与表结构全览见 [docs/项目总览.md](./docs/项目总览.md)。

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

## 📖 使用示例

以下是一次完整的家庭使用流程，帮助你快速理解应用的核心玩法。

### 场景一：首次使用（家长侧配置）

1. **注册家长账号**：打开应用 → 登录页选择「家长」角色 → 邮箱注册（或直接使用用户名登录）
2. **创建孩子账号**：进入「我的 → 我的孩子」→ 点击「添加孩子」→ 填写用户名和密码
   - 系统通过 RPC 直插方式创建子账号，**无需真实邮箱**，也不会触发邮件验证
3. **配置作业库**：进入「作业管理」→ 新建分类（如：学习 → 语文 → 阅读打卡）→ 设置任务积分与重复规则
   - 重复规则示例：「每天」或「每周一、三、五」
4. **配置奖品库**：进入「奖品兑换」→ 家长模式 → 添加奖品（如：看一集动画片，30 积分，分类：娱乐）

### 场景二：孩子每日打卡

```text
孩子登录 → 首页看到「今日清单」
  ├─ ✅ 阅读打卡（+5 分）
  ├─ ✅ 数学口算（+10 分）
  └─ ⬜ 背诵古诗（+8 分）→ 点击完成

连续每日完成任务 → 连击 +1 → 达到 3/7/15 天自动解锁连击徽章 🏅
忘记打卡 → 可用积分兑换「补签卡」补回一天连击
```

### 场景三：积分兑换（孩子申请 → 家长审核）

1. 孩子在「奖品兑换」页看到可用余额，点击奖品发起兑换 → 记录进入 `pending` 状态
2. 家长在「家长控制台」收到待审核提醒 → 选择**通过 / 驳回**
3. 通过后家长线下兑现奖品 → 标记**已兑现**，积分正式扣除

### 场景四：家长手动调整积分

孩子在考试中表现优异，家长想额外奖励：

进入「积分管理」→「手动调整」→ 选择孩子 → 填写调整分值（+20）与原因（**必填**）→ 积分流水记录留痕，孩子端实时可见。

### 核心概念速查

| 概念 | 说明 |
|------|------|
| **积分** | 完成任务获得 + 家长手动调整 − 兑换消耗，实时汇总 |
| **连击（Streak）** | 连续每日完成全部任务的天数，中断清零（可用补签卡挽救） |
| **补签卡** | 用积分兑换的道具，可补回漏掉的一天，保住连击 |
| **徽章** | 内置 12 种（连击/分类大师/积分里程碑等）+ 家长自定义 |
| **今日清单** | 按作业库重复规则自动生成，也支持添加临时任务 |
| **兑换状态机** | `pending`（待审核）→ `approved`（已通过）→ `fulfilled`（已兑现）/ `rejected`（驳回） |

### 数据安全示例

- **备份**：「设置 → 数据备份」导出 JSON 文件到本地，或使用云端备份
- **重置**：重置前系统会自动做一次备份并要求二次确认，防止误操作
- **离线模式**：未配置 Supabase 时应用自动降级为本地存储模式，数据仅存于当前浏览器

---

## 📂 项目结构

```
src/
├── components/          # 组件目录
│   ├── ui/             # UI 基础组件（shadcn/ui）
│   ├── BadgeDisplay.tsx
│   ├── BadgeUnlockModal.tsx
│   ├── IconPicker.tsx
│   ├── OnboardingModal.tsx    # 新用户引导弹窗
│   ├── PointsDisplay.tsx
│   ├── ProgressBar.tsx
│   ├── RewardCard.tsx
│   └── TaskItem.tsx
├── contexts/           # React Context
│   └── AppStateContext.tsx   # 全局应用状态（状态同步封装）
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
│   ├── Auth.tsx            # 登录/注册
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

表结构明细、函数/RPC、触发器与脚本执行顺序见 **[docs/项目总览.md](./docs/项目总览.md)**（汇总自 `docs/` 与 `sql/`）。

---

## 📋 开发命令

```bash
pnpm dev          # 启动开发服务器（http://localhost:5173）
pnpm build        # 类型检查 + 构建生产版本（tsc -b && vite build）
pnpm preview      # 预览生产构建
pnpm lint         # 运行 ESLint 检查
pnpm test         # 运行单元测试（Vitest）
pnpm exec tsc -b  # 仅 TypeScript 类型检查
```

---

## 🤝 贡献指南

欢迎通过 Issue 和 Pull Request 参与贡献！这是一个面向儿童的产品，请特别留意 [儿童数据安全](./src/views/Privacy.tsx) 相关约束。

### 报告问题（Issue）

提交 Issue 前请先搜索是否已有同类问题。新建时请包含：

- **环境信息**：Node 版本、pnpm 版本、浏览器、是否配置了 Supabase
- **复现步骤**：最小化的操作路径
- **预期行为 vs 实际行为**：必要时附截图或控制台报错
- **数据库相关**：涉及 SQL 的问题请注明执行的脚本版本

### 提交 Pull Request

1. **Fork 并创建分支**：分支名格式 `feat/xxx`（新功能）或 `fix/xxx`（修复）
   ```bash
   git checkout -b feat/your-feature
   ```
2. **本地自检**：提交前确保以下命令全部通过
   ```bash
   pnpm lint           # ESLint 无 error（CI 中 lint 暂不阻塞，但请保持干净）
   pnpm exec tsc -b    # 类型检查通过（强制门禁）
   pnpm test           # 单元测试通过（强制门禁）
   pnpm build          # 构建成功（强制门禁）
   ```
3. **提交信息规范**（Conventional Commits）：
   ```
   feat: 新增补签卡兑换动画
   fix: 修复凌晨 0-8 点今日任务日期偏移
   docs: 补充贡献指南章节
   refactor: 抽离 BadgeCard 公共组件
   ```
4. **更新文档**：涉及新功能或行为变更时，请同步更新 `docs/CHANGELOG.md` 与 `docs/项目历史.md`
5. **PR 描述**：说明改动动机、实现方案、自检结果；有 UI 改动请附截图

### 代码规范约定

| 约定 | 说明 |
|------|------|
| 包管理器 | 仅使用 pnpm，禁止提交 `package-lock.json` / `yarn.lock` |
| 样式 | 使用设计系统 Token（`src/styles/tokens.css` + Tailwind 语义类），禁止硬编码色值 |
| ID 生成 | 统一使用 `crypto.randomUUID()`，禁止 `Date.now().toString()` |
| 日期处理 | 统一使用 `src/utils/date.ts`（本地时区），禁止直接 `toISOString().split('T')[0]`（UTC 时区陷阱） |
| 日志 | 生产代码禁止 `console.log`（历史已清理 93 处），错误处理可用 `console.error` |
| SQL 脚本 | 存放于 `sql/`，需自包含可重复执行；**禁止提交任何关闭 RLS 的脚本** |
| 组件 | 新组件放 `src/components/`，页面放 `src/views/`（命名导出，路由处 lazy 包装） |

### CI 说明

PR 会自动触发 GitHub Actions 质量门禁（`.github/workflows/ci.yml`）：**Lint（暂不阻塞）→ Typecheck & Build → Test**，后三项任一失败将被拦截，请修复后再请求合并。

---

## 📄 相关文档

- [项目总览（模块地图 · 数据库 · 脚本顺序 · 业务规则）](./docs/项目总览.md)
- [设计系统规范（v2.0 亮色乐园）](./docs/design-system.md)
- [Supabase 设置指南](./SUPABASE_SETUP.md)
- [更新日志 CHANGELOG](./docs/CHANGELOG.md)
- [项目历史](./docs/项目历史.md)
- [Supabase 官方文档](https://supabase.com/docs)
- [React 文档](https://react.dev)
- [Vite 文档](https://vite.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [shadcn/ui 文档](https://ui.shadcn.com)

---

## 📌 版本历史

| 版本 | 内容 |
|------|------|
| v2.1.2 | 登录页移除手机号验证码入口（可自 git 历史恢复） |
| v2.1.1 | 修复兑换记录次日丢失：ID 双轨错位根治 + 审核同步 + Realtime 订阅 |
| v2.1.0 | 亮色乐园设计系统全站落地（11 页面 + 2 组件） |
| v2.0.0 | 设计系统升级为亮色系（天蓝主色 + 高饱和辅助色） |
| v1.4.1 | 用户名密码登录（兼容邮箱）、子账号 RPC 创建 |
| v1.4.0 | 三阶段产品优化 15 项全部落地（信任基础/增长留存/规模合规） |
| v1.0.0 | 基础版：作业/积分/奖品/徽章 |

---

## 许可证

MIT License
