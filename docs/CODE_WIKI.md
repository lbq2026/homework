(some characters truncated)...
全局能力。

| 视图 | 位置 | 职责与关键逻辑 | 消费的状态/方法 |
|---|---|---|---|
| [Home.tsx](file:///f:/AI-Center/homework-main/src/views/Home.tsx) | :15-365 | 孩子首页：总积分、今日进度、今日清单、快捷入口；完成打卡按任务定义弹积分 toast（:40-62）；全勤彩花庆祝（:317-363）；任务渲染「无 taskDef → 三级分类回退」双分支 | `state, toggleTaskCompletion, completeAllTasks, getStats` |
| [Tasks.tsx](file:///f:/AI-Center/homework-main/src/views/Tasks.tsx) | :41-880 | 作业管理双 Tab（今日清单/分类作业库）；三级分类 CRUD + 重复规则（`buildRepeatRule` :126-133）+ `handleSubmit` 按 6 种 dialogType 分支（:135-195）+ 临时任务对话框；**编辑/删除按钮由 `isParent` 门控** | `isParent` + useAppState 15 项方法 |
| [Rewards.tsx](file:///f:/AI-Center/homework-main/src/views/Rewards.tsx) | :28-570 | 奖品墙 + 兑换审核流；`handleRedeem` 处理 insufficient/no-user/cloud-error 三种失败（:110-134）；pending→approved→fulfilled/rejected 状态徽标（:21-26）；家长审核按钮组（:288-342） | `availablePoints`、奖品 CRUD、兑换四操作 |
| [Achievements.tsx](file:///f:/AI-Center/homework-main/src/views/Achievements.tsx) | :14-417 | 成就页：连击与补签卡（可购/可用判定 :31-36）、Recharts 趋势图、周报（`getNextGoal` 阶梯目标 :57-62）、分类统计、徽章墙 | `state, getStats, buyMakeupCard, useMakeupCard, availablePoints` |
| [Auth.tsx](file:///f:/AI-Center/homework-main/src/views/Auth.tsx) | :14-449 | 登录/注册/忘记密码三合一；邮箱与用户名双模式切换（:29-30）；注册选角色（:392-420）；未配置 Supabase 降级提示（:107-137） | `signIn, signInWithUsername, signUp, resetPassword, isConfigured` |
| [Profile.tsx](file:///f:/AI-Center/homework-main/src/views/Profile.tsx) | :36-378 | 个人中心：资料编辑、3 数据卡、**角色化功能入口**（`actionTiles` 按 `isParent` 过滤 :141-146）、登出 | `state` + `useAuth` + `useProfile` |
| [PointManagement.tsx](file:///f:/AI-Center/homework-main/src/views/PointManagement.tsx) | :36-671 | 家长手动加减分 + 调整流水管理；**家长顶部孩子切换器**（0 孩子空态 / 1 孩子自动选中 / 多孩子 chip），统计与流水按所选孩子读取；扣分按孩子总分截断，编辑校验 `孩子总分 - 原值 + 新值 >= 0`；写操作走 `adjust/update/delete_child_point_adjustment` RPC；孩子端只读自己的 `state.pointAdjustments` | `fetchChildrenResult, fetchChildData, adjustChildPointsRpc, updateChildPointAdjustmentRpc, deleteChildPointAdjustmentRpc` |
| [Children.tsx](file:///f:/AI-Center/homework-main/src/views/Children.tsx) | :14-295 | 家长管理孩子档案：RPC 建子账号（:53-58）+ 只读数据面板（`fetchChildData` 结果拼成伪 AppState 复用纯函数计算 :104-122）；非家长锁定 | 直连 `supabaseApi` + `createChildAccount` |
| [ParentDashboard.tsx](file:///f:/AI-Center/homework-main/src/views/ParentDashboard.tsx) | :16-175 | 家长控制台：4 项数据总览 + 待审兑换就地审核（pending 过滤排序 :27-29）+ 6 快捷入口 | `approveRedemption, rejectRedemption, state` |
| [Badges.tsx](file:///f:/AI-Center/homework-main/src/views/Badges.tsx) | :23-268 | 家长自定义徽章 CRUD（条件 tasks/points/streak）；新建/编辑复用同一表单（:43-69） | `add/edit/deleteCustomBadge` |
| [Settings.tsx](file:///f:/AI-Center/homework-main/src/views/Settings.tsx) | :17-444 | 音效/提醒开关、JSON 导出（Blob 下载 :41-52）/导入（FileReader :54-75）、重置今日/全部（**确认词「确认重置」+ 内部先云备份** :83-97）；数据管理仅家长 | `toggleSound, updateReminder, export/importAppData, resetAll, resetToday` |
| [Privacy.tsx](file:///f:/AI-Center/homework-main/src/views/Privacy.tsx) | :10-118 | 静态隐私政策 5 节（儿童数据保护、家长同意、数据权利） | 无 |
| [ResetPassword.tsx](file:///f:/AI-Center/homework-main/src/views/ResetPassword.tsx) | :17-157 | PKCE 密码重置落地页；状态机 checking/ready/done/invalid（:23），检查 session 与 URL code | `updatePassword` |

**权限模型**：所有配置类操作（分类/奖品 CRUD、兑换审核、手动调分、徽章管理、导入导出、重置）由 `isParent` 门控；孩子端仅可勾任务、加临时任务、兑换、购买/使用补签卡。

---

## 7. 组件层

### 业务组件（src/components/）

| 组件 | 职责 |
|---|---|
| [TaskItem.tsx](file:///f:/AI-Center/homework-main/src/components/TaskItem.tsx) | 任务行：三级分类徽章 + 可选 onToggle/onDelete/onAddToToday 回调 |
| [RewardCard.tsx](file:///f:/AI-Center/homework-main/src/components/RewardCard.tsx) | 奖品卡：`canAfford` 控制禁用 + 锁定遮罩 |
| [PointsDisplay.tsx](file:///f:/AI-Center/homework-main/src/components/PointsDisplay.tsx) | 积分数字，值变化 300ms 弹跳动画 |
| [ProgressBar.tsx](file:///f:/AI-Center/homework-main/src/components/ProgressBar.tsx) | 进度条，progress 钳制 0-100 |
| [BadgeDisplay.tsx](file:///f:/AI-Center/homework-main/src/components/BadgeDisplay.tsx) | 徽章卡：解锁金光动画 / 未解锁灰度 / NEW 角标 |
| [BadgeUnlockModal.tsx](file:///f:/AI-Center/homework-main/src/components/BadgeUnlockModal.tsx) | 解锁弹层：按 id 数组从 allBadges 过滤展示（App 全局挂载） |
| [OnboardingModal.tsx](file:///f:/AI-Center/homework-main/src/components/OnboardingModal.tsx) | 首登 4 步引导，按 `role` 切换家长/孩子文案 |
| [IconPicker.tsx](file:///f:/AI-Center/homework-main/src/components/IconPicker.tsx) | 通用 emoji 图标网格选择器 |

### UI 基础组件（src/components/ui/，60+ 个）

shadcn/ui 约定生成，基于 Radix UI 无头组件 + CVA 变体 + `cn()`（[lib/utils.ts](file:///f:/AI-Center/homework-main/src/lib/utils.ts)，clsx + tailwind-merge）合并类名。含 button/dialog/tabs/select/dropdown/alert-dialog/sonner（Toast）/chart（Recharts 封装）/sidebar 等。

---

## 8. 数据库设计（Supabase）

### 8.1 表清单（12 张）

| 表 | 用途 / 关键字段 | RLS 要点 | 引入阶段 |
|---|---|---|---|
| `profiles` | 用户档案一表双角色：`role`(parent/child)、`parent_id` 亲子关联、`total_points`、`username`、`phone`；id 关联 auth.users | SELECT：本人或家长（`is_parent_of`）；UPDATE/INSERT 仅本人 | 基线 |
| `tasks` | 作业库：`base_points`、三级分类外键、`is_temporary`（临时任务）、`is_active`（软删除） | 本人 CRUD | 基线 + Next |
| `daily_records` | 每日记录：`tasks` JSONB 快照、`total_points`；`UNIQUE(user_id, date)` | 本人 CRUD | 基线 |
| `rewards` | 奖品库：`points`、`category`(娱乐/实物/特权/其他) | 本人可读 + 家长可写 | 基线 + Now |
| `redemptions` | 兑换记录：`status`(pending/approved/fulfilled/rejected)、`reward_name/points` 快照、`reward_id` ON DELETE SET NULL | 孩子 INSERT、家长 UPDATE/DELETE | 基线 + Now |
| `badges` | 已解锁徽章，`UNIQUE(user_id, badge_type)`；自定义徽章解锁复用（`badge_type='custom:<id>'`） | 本人 | 基线 |
| `point_adjustments` | 手动加减分流水：`points`(±)、`reason` 必填 | 本人 CRUD（直接 RLS）；家长写孩子走 `child-points-binding.sql` 的 3 个 RPC（`is_parent_of` 校验） | 基线 + Now + v2.2.0 |
| `primary/secondary/tertiary_categories` | 三级分类；tertiary 含 `default_points`、`repeat_rule` JSONB | 本人；Next 阶段追加 9 条家长读策略 | 基线 + Next |
| `custom_badges` | 家长自定义徽章：`condition_type`(tasks/points/streak)、`condition_value` | 本人可读 + 家长可写 | Later |
| `data_backups` | 云端备份快照：`backup_data` JSONB、`device_info`、`file_size` | 本人 SELECT/INSERT/DELETE | **仅 migrations 基线**（full-schema.sql 无此表） |

### 8.2 函数 / RPC / 触发器

| 名称 | 作用 |
|---|---|
| `is_parent_of(uuid)` / `is_parent(uid)` | RLS 辅助函数（SECURITY DEFINER 防 RLS 递归），判断亲子关系 |
| `get_email_by_username(text)` | 用户名→邮箱反查（用户名登录），anon 可调，精确匹配防枚举 |
| `create_child_account(text,text,uuid)` | 家长代建子账号：启用 pgcrypto，bcrypt 哈希密码，内部生成 `kid<uuid>@example.com` 占位邮箱，一次 RPC 建 auth.users + profiles 并绑 `parent_id`（绕过 GoTrue 邮件校验/限流） |
| `update_child_profile` / `reset_child_password` / `unbind_child` / `bind_existing_child` | 家长管理孩子：编辑昵称/头像、重置密码（旧登录失效）、解绑（保留数据）、绑定已有孩子（校验邮箱存在且未绑定） |
| `approve_redemption(uuid)` | 家长一次确认兑换：校验亲子关系，`pending → fulfilled` 并正式扣分 |
| `dispatch_to_child(child_id, table, items)` / `delete_child_template(child_id, table, item_id)` | 数据下发复制（作业三级分类/奖品/自定义徽章，名称幂等）与孩子模板删除（表名白名单 + 行属主校验） |
| `adjust_child_points(uuid, int, text)` / `update_child_point_adjustment(uuid, int, text)` / `delete_child_point_adjustment(uuid)` | 家长手动调分写孩子账号：`is_parent_of` 校验，单事务写 `point_adjustments` 并同步 `profiles.total_points`（编辑按差值、删除回滚） |
| `handle_new_user` + 触发器 `on_auth_user_created` | 注册自动建 profile + 初始化默认分类 |
| `calculate_user_total_points` / `update_user_total_points` + 3 个积分触发器 | 数据库侧积分兜底计算（=任务+调整−兑换，钳 0）；**以前端计算为准** |
| `set_updated_at`（8 个触发器） | 统一维护 `updated_at`（migrations 第二个文件） |
| 视图 `user_category_hierarchy` | 三级分类层级查询视图 |
| 索引 | 约 20 个，以 `user_id` 为主 |

### 8.3 SQL 脚本执行顺序

全部幂等（`IF NOT EXISTS` / `OR REPLACE`），在 Supabase SQL Editor 依次执行：

```text
① sql/full-schema.sql                        # 基线：10 张业务表 + RLS + 积分触发器
   （或 supabase/migrations/20260814120000_initial_schema.sql，含 data_backups）
② sql/now-phase-trust-fix.sql                # P0：redemptions.status 审核状态机 + is_parent() + 家长 RLS 重建
③ sql/next-phase-growth-retention.sql        # P1：is_temporary / repeat_rule / 多孩子家长读策略
④ sql/later-phase-scale-compliance.sql       # P2：custom_badges 表 + RLS
⑤ sql/username-login.sql                     # get_email_by_username RPC
⑥ sql/create-child-account.sql               # create_child_account RPC
⑦ sql/parent-controls.sql                    # 10 表家长读策略 + 孩子管理 7 个 RPC
⑧ sql/child-points-binding.sql               # 家长调分写孩子账号 3 个 RPC
```

**注意：`full-schema.sql` 不含 data_backups/status/is_temporary/repeat_rule/custom_badges，新库必须补跑 ②③④；家长审核与孩子管理需补跑 ⑦，家长手动调分需补跑 ⑧。** 脚本索引与一次性脚本见 [sql/README.md](../sql/README.md)。

存量库排障矩阵（症状 → 处置）：

| 症状 | 处置 |
|------|------|
| 兑换报 `Could not find the 'status' column of 'redemptions'` | 先跑 `fix-redemption-status-only.sql` 急救（仅补列 + NOTIFY 刷新缓存），再补跑 ② |
| 添加作业报 `column tertiary_categories.repeat_rule does not exist` (42703) | 跑 `fix-tertiary-repeat-rule.sql`（最小化补列），或补跑 ③ |
| 需将全部存量兑换记录归一为「兑换成功」 | 跑 `migrate-redemption-all-fulfilled.sql`（注意：pending 也会转为正式扣分口径） |
| 兑换正常但家长无法审核 | 跑 ②（`is_parent()` + redemptions 家长策略） |
| 想用临时任务/重复规则/多孩子 | 跑 ③ |
| 想用自定义徽章 | 跑 ④ |
| 家长看不到孩子数据 / 无法审批兑换 / 无法编辑解绑孩子 | 跑 ⑦ |
| 家长手动加减分没有记到孩子账号 / RPC 报函数不存在 | 跑 ⑧ |

运维脚本：`query-child-accounts.sql`（子账号核查 5 段查询）。

---

## 9. 关键业务流程

### 9.1 登录数据加载（三级回退）

```text
登录成功（useAuth）
  └→ useSyncedAppState 检测 user + !hasSyncedOnLogin
       ├─ ① 独立表有数据 → buildStateFromDb → setState + saveState + 自动云备份
       ├─ ② 独立表空 → data_backups 最新快照 → 恢复 + 重算 totalPoints
       └─ ③ 均为空但本地有数据 → syncLocalStateToDb 全量上传（本地→云端迁移）
```

### 9.2 积分体系

```text
totalPoints = Σ dailyRecords.totalPoints        # 作业完成
            + Σ pointAdjustments.points          # 家长手动调整（含购买补签卡 -20）
            − Σ redemptions.points (仅 approved/fulfilled)   # 兑换消耗
availablePoints = totalPoints − Σ pending 兑换    # 冻结额度不可再用
```
前端每次相关变更后派生重算校准（useSyncedAppState :83-91），并异步 `updateProfileTotalPoints` 写回 profiles 表。

> 家长端积分管理（v2.2.0）：页面顶部切换所选孩子，孩子数据经 `fetchChildData` 读取（RLS 家长读策略放行），统计用 `calculateTotalPoints(buildStateFromDb(childData))`；加减分/编辑/删除不再写家长自己的账号，而是调用 `adjust/update/delete_child_point_adjustment`，由 RPC 在同一事务内写孩子的 `point_adjustments` 并同步 `profiles.total_points`。

### 9.3 兑换审核状态机

```text
孩子 redeemReward ──→ pending（积分冻结，不扣分）
                        ├─ 家长一次「确认兑换」──→ fulfilled（兑换成功，正式扣分）
                        └─ 家长 reject  ──→ rejected（冻结退还）
```

> v2.1.4（2026-10-30）起兑换为**一次确认**流程：家长确认即 `fulfilled`，无需二次「标记已兑现」；`approved` 仅为历史数据兼容保留在枚举中，积分口径与 `fulfilled` 相同（均按已扣分）。历史存量可用 `sql/migrate-redemption-all-fulfilled.sql` 归一。

云端插入/更新失败的处理：插入失败**阻断本地提交**（防止次日重载记录消失）；更新返回 `count=0` 时回滚并全量 `refreshData()`。

### 9.4 连击与徽章

- **达成日** = 当天完成率 ≥ `streakThreshold`（默认 0.8）的日期 ∪ 补签卡补签的日期。
- **连击**：最新达成日必须是今天或昨天，否则清零；按日历日连续计数。
- **补签卡**：20 积分/张（走积分流水），可补昨天为达成；每日期限用一次。
- **徽章**：每次完成/调分后触发 `checkAndUnlockBadges` + `checkCustomBadges` → 新解锁进入 `newlyUnlockedBadges` → 全局弹窗庆祝 → 异步云同步。

### 9.5 「双轨 id」教训（重要架构决策）

早期 insert 不携带前端 id，由数据库生成主键，导致「本地 id ≠ 云端 id」：
- update/delete 按本地 id 匹配云端 0 行，**静默失败**；
- `redemptions.reward_id` 外键指向不存在的云端奖品 id，兑换插入失败，**次日记录整体丢失**。

根治方案（[supabaseApi.ts :302-307 注释](file:///f:/AI-Center/homework-main/src/services/supabaseApi.ts#L302-L307)）：所有 insert **显式携带前端 `crypto.randomUUID()`**；审核接口返回受影响行数，为 0 时触发全量刷新自愈。

### 9.6 多端实时同步

写操作直写独立表 → Supabase Realtime 推送 postgres_changes（按 `user_id` 过滤）→ 另一端（如家长审核后孩子端）自动 `refreshData()` 全量刷新；profiles 的 `total_points` 变化则轻量直更。

---

## 10. 项目运行方式

### 10.1 环境要求

- Node.js ≥ 20（推荐 22 LTS）、pnpm ≥ 9（推荐 11；Corepack 启用：`corepack enable`）

### 10.2 安装与配置

```bash
git clone <repository-url>
cd homework-main
pnpm install
pnpm exec tsc -b          # 验证依赖完整性（类型检查通过）

cp .env.example .env      # 配置环境变量
```

`.env` 内容：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> 未配置时应用仍可启动，自动降级为 localStorage 本地模式（无登录、无云同步）。

### 10.3 初始化数据库

按 [8.3 节](#83-sql-脚本执行顺序) 顺序在 Supabase SQL Editor 执行脚本（详见 [SUPABASE_SETUP.md](file:///f:/AI-Center/homework-main/SUPABASE_SETUP.md)）。

### 10.4 常用命令

```bash
pnpm dev            # 开发服务器 http://localhost:5173
pnpm build          # 类型检查 + 生产构建（tsc -b && vite build）
pnpm preview        # 预览生产构建
pnpm lint           # ESLint 检查
pnpm test           # Vitest 单元测试（storage.test.ts，23 用例）
pnpm exec tsc -b    # 仅 TypeScript 类型检查
```

### 10.5 CI 流水线（[.github/workflows/ci.yml](file:///f:/AI-Center/homework-main/.github/workflows/ci.yml)）

push main / PR 触发：ubuntu + pnpm 11 + Node 22 → install → **lint（`continue-on-error`，暂不阻塞）→ build（含 tsc -b，强制）→ test（强制）**，超时 15 分钟。

### 10.6 PWA

- [public/manifest.webmanifest](file:///f:/AI-Center/homework-main/public/manifest.webmanifest)：standalone、portrait、zh-CN，图标 192/512（含 maskable）。
- [public/sw.js](file:///f:/AI-Center/homework-main/public/sw.js)：缓存 `little-warrior-v1`；`/auth/ /rest/ /realtime/` 网络优先不缓存动态数据；导航网络优先、离线回退 index.html；静态资源缓存优先；notificationclick 聚焦窗口。
- 图标由 [scripts/gen_pwa_icons.py](file:///f:/AI-Center/homework-main/scripts/gen_pwa_icons.py) 生成。

---

## 11. 开发约定与质量门禁

| 约定 | 说明 |
|---|---|
| 包管理器 | 仅 pnpm，禁止提交 package-lock.json / yarn.lock |
| 样式 | 使用设计系统 Token（[tokens.css](file:///f:/AI-Center/homework-main/src/styles/tokens.css) 6 组色板 + Tailwind 语义类），禁止硬编码色值 |
| ID 生成 | 统一 `crypto.randomUUID()`，禁止 `Date.now().toString()` |
| 日期处理 | 统一走 [utils/date.ts](file:///f:/AI-Center/homework-main/src/utils/date.ts)（本地时区），禁止 `toISOString().split('T')[0]`（UTC 时区陷阱） |
| 类型 | ESLint `no-explicit-any: error` 强制门禁；数据访问层零 any |
| 日志 | 生产代码禁止 `console.log`，错误处理可用 `console.error` |
| SQL | 存放 sql/，自包含可重复执行；**禁止提交关闭 RLS 的脚本** |
| 组件规范 | 新组件放 src/components/，页面放 src/views/；视图命名导出，路由处 lazy 包装 |
| 提交信息 | Conventional Commits（feat/fix/docs/refactor…） |
| 提交前自检 | `pnpm lint` → `pnpm exec tsc -b` → `pnpm test` → `pnpm build` 全部通过 |

---

## 附录 · 相关文档索引

> 2026-10-30 文档收敛：`docs/` 由 5 份合并为 3 份——《项目总览》并入本文档（§8.3 排障矩阵等），《项目历史》并入 CHANGELOG 附录。
> 2026-11-04 新增 `docs/README.md` 与 `sql/README.md` 作为文档/脚本导航索引（不新增正文文档）。

- [README.md](file:///f:/AI-Center/homework-main/README.md) — 功能特性、使用示例、贡献指南
- [docs/README.md](file:///f:/AI-Center/homework-main/docs/README.md) — 文档导航与维护约定
- [sql/README.md](file:///f:/AI-Center/homework-main/sql/README.md) — SQL 脚本分类、执行顺序与运维脚本
- [docs/design-system.md](file:///f:/AI-Center/homework-main/docs/design-system.md) — v2.0 亮色乐园设计系统规范
- [docs/CHANGELOG.md](file:///f:/AI-Center/homework-main/docs/CHANGELOG.md) — 版本演进 + 开发批次详细记录（附录）
- [SUPABASE_SETUP.md](file:///f:/AI-Center/homework-main/SUPABASE_SETUP.md) — Supabase 配置步骤
