# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.3] - 2026-09-04

### Changed（兑换记录按时间倒序）
- Rewards 兑换记录列表与 ParentDashboard 待审核列表均改为**最新在上**（`redeemedAt`/`created_at` 降序）
- `supabaseApi.ts` 两处 redemptions 查询补 `.order('created_at', { ascending: false })`；渲染层兜底排序覆盖 localStorage 恢复等一切来源

### Docs（项目文档梳理与收敛）
- 新增 `docs/项目总览.md`：一页式总览（模块地图 / 数据库全景 / SQL 脚本执行矩阵 / 核心业务规则 / 文档导航），汇总 `docs/` 与 `sql/` 全部内容，取代此前多份散落的分析报告
- 归档已完成使命的 6 份文档（项目分析报告、项目结构梳理与优化建议、PWA 评估与实施建议、手机号登录配置指南、产品优化建议书、上传 GitHub 指南）与 7 个 RLS 历史排障脚本（fix-infinite-recursion(-v2)/fix-rls-full/fix-rls-infinite-recursion/safe-fix-all/safe-rls-setup/fix-missing-functions）至 `.workbuddy/archive/2026-09-04-docs-sql-cleanup/`（git 亦有历史可恢复）
- `docs/` 收敛为 4 份长期文档：设计规范 / 变更日志 / 项目历史 / 项目总览；`sql/` 收敛为 8 个现行脚本
- README 同步修正：版本号 v2.1.0→v2.1.2、移除「手机号登录」特性行、初始化数据库补基线顺序与 status 急救指引、Schema 章节与文档索引指向项目总览、版本表补 v2.1.1/v2.1.2
- SUPABASE_SETUP 同步修正：npm→pnpm、修复脚本引用改为项目总览执行矩阵、表清单补 custom_badges/data_backups/status 等现行结构

## [2.1.2] - 2026-09-04

### Removed（登录页移除手机号验证码登录）
- 移除 Auth 页「手机登录」tab（发送验证码 / 验证码登录流程），原因：Supabase Phone provider 需付费短信服务，与邮箱登录并行存在增加了登录入口的复杂度
- 移除项：`Smartphone`/`MessageSquareText` 图标 import、phoneData/isSendingOtp/otpSent/otpCountdown 状态、`handleSendOtp`/`handlePhoneLogin` 处理器、`<TabsTrigger value="phone">`、`<TabsContent value="phone">` 完整表单、`sendPhoneOtp`/`verifyPhoneOtp` 解构
- 保留：`useAuth.tsx` 中的 `sendPhoneOtp`/`verifyPhoneOtp` 方法（接口未变），`docs/手机号登录配置指南.md`（随时可按指南恢复）
- 注意：登录页其他功能（邮箱/用户名登录、注册、忘记密码、角色选择）保持不变

## [2.1.1] - 2026-09-04

### Fixed（兑换记录次日丢失 · ID 双轨错位根治）
- **根因**：`addReward`/`redeemReward` 等本地生成 UUID，但云端 insert 不携带 id（由数据库另生成主键），造成「本地 id ≠ 云端 id」系统性错位：
  - 兑换记录插入云端时 `reward_id` 外键指向不存在的本地 reward id → FK 违规 → 记录从未入库（仅 console.error，UI 无感知），次日从独立表重建 state 时兑换记录整体消失、积分重算"复原"
  - 家长审核 `updateRedemptionStatus` 按本地 id 匹配云端 0 行 → 状态永远停在 pending，同样被次日重载覆盖
- **修复 1（根治）**：所有 insert（tasks/categories/rewards/redemptions）显式携带前端生成的 id，本地与云端主键永久一致
- **修复 2（阻断）**：`redeemReward` 云端插入失败时返回 false 阻断本地提交，杜绝"本地有、云端无"的脏状态
- **修复 3（兜底）**：`updateRedemptionStatus` 返回 affected rows 数量，审核 0 行时自动触发 `refreshData()` 全量刷新对齐云端
- **修复 4（实时）**：新增 redemptions 表 Realtime 订阅（此前缺失），家长审核后孩子端即时同步状态流转
- 附带：`refreshData` 定义上移至兑换区块前（消除 TDZ 引用隐患）；单测夹具修复 `calculateTotalPoints` 快路径短路问题（18/18 通过）

### Fixed（补充：兑换"确认"按钮静默无反应）
- **现象**：修复 2 的"云端失败即阻断"暴露后，兑换存量奖品（修复前创建、本地 id 与云端错位，或云端奖品缺失）时 `reward_id` 外键 23503 违规 → `redeemReward` 返回 false → UI 无任何提示（弹窗不关、无 toast）
- **修复 A（FK 兜底）**：`insertRedemption` 首次带 `reward_id` 插入失败且错误码为 23503 时，自动降级为 `reward_id = NULL` 重插——表内已冗余 `reward_name`/`points` 快照且 `reward_id` 可空（ON DELETE SET NULL），兑换记录与积分口径不受影响，仅牺牲云端奖品关联（本地 UI 仍按本地 state 匹配显示）
- **修复 B（失败可见）**：`redeemReward` 返回结构化结果 `{ ok, reason: 'no-user' | 'insufficient' | 'cloud-error', message }`，Rewards 页失败时分别 toast 提示（未登录/积分不足/云端保存失败原因），不再静默

## [2.1.0] - 2026-08-19

### Changed（亮色乐园设计系统全站落地 · UI Designer）
- **P0 Profile 个人中心**：天蓝渐变头部 + 圆润卡片、3 列数据卡（积分/连击/徽章）、2×2 操作网格、角色标签亮粉/天蓝
- **P1 Home 首页**：天蓝渐变头部、嫩绿进度、柠檬黄积分、任务卡圆润化、快捷操作亮色渐变
- **P1 Auth 登录注册**：天蓝主按钮、角色选择（家长天蓝/孩子亮粉）、奶油白背景
- **P1 ParentDashboard 家长控制台**：家长角色色入口、数据卡、圆润卡片
- **P2 设置/隐私/徽章/我的孩子/成就/作业管理/奖品/积分管理**：全部应用亮色 token 与圆角规范
- 组件同步更新：`TaskItem`、`RewardCard` 使用亮色语义色
- 所有页面背景统一为奶油白 `neutral-50`，圆角统一 `rounded-card/surface/button`

## [2.0.0] - 2026-08-19

### Design System（亮色乐园版 · UI Designer）
- **整体色调由深海蓝升级为亮色系**，面向小学生用户优化视觉吸引力
- 新增品牌主色 **天蓝**（`#0284C7` / `brand-500`），传递清澈、探索感
- 新增高饱和度辅助色：柠檬黄、嫩绿、棉花糖粉、香芋紫、蜜桔橙
- 新增中性奶油白底色（`neutral-50`），柔和不刺眼
- 角色色更新：孩子 `role-child` 改为亮粉 `#EC4899`，家长 `role-parent` 改为天蓝 `#0EA5E9`
- 等级色更新为更亮的 Bronze/Silver/Gold/Platinum
- 圆角加大（surface 24px / card 20px / button 14px），更符合圆润卡通风格
- 新增卡通按钮阴影（`shadow-button` 按下效果）
- 字体规范调整：正文字号放大至 16px，字重 500，行高 1.6，提升儿童可读性
- 文档重写：`docs/design-system.md`（v2.0）
- Token/CSS 同步更新：`src/styles/tokens.css`、`tailwind.config.js`

## [1.4.1] - 2026-08-19

### Added（用户名登录 + 子账号创建修复）
- **用户名密码登录（兼容原邮箱登录）**
  - Auth 登录页新增「账号类型」切换：邮箱登录 / 用户名登录
  - 新增 RPC `get_email_by_username`（SECURITY DEFINER，匿名可调，精确匹配反查邮箱）
  - `useAuth.signInWithUsername`：用户名 → 邮箱映射 → 标准密码登录
- **子账号自动邮箱修复**
  - 自动生成邮箱域名改为 `@example.com`（GoTrue 只接受真实 TLD，`.local`/`.test` 均被拒）
  - local-part 去除非字母数字字符
- 新增 SQL `sql/username-login.sql`（映射函数）、更新 `sql/query-child-accounts.sql`（@example.com）
- **子账号创建改走 RPC（彻底绕过 signUp）**
  - 新增 RPC `create_child_account(username, password, parent_id)`（SECURITY DEFINER，一次完成 auth.users + profiles 插入）
  - `useAuth.createChildAccount` + Children.tsx 改用 RPC，**彻底去除邮箱字段与 signUp 邮件校验**
  - 不再触发 `email rate limit exceeded`

## [1.4.0] - 2026-08-18

### Added（产品优化 Later 阶段 · 规模与合规）
- **隐私合规（P2-6）**
  - 新增 `/privacy` 隐私政策页：儿童数据保护、最小化收集、家长同意机制、数据权利说明
  - 设置页新增「隐私政策」入口
- **徽章自定义（P2-2）**
  - 新增 `custom_badges` 表 + 家长管理页 `/profile/badges`（创建/编辑/删除，条件：完成任务/累计积分/连续天数）
  - 成就页新增「专属徽章」展示区；解锁记录复用 badges 表（`custom:<id>`）
- **PWA 基础 + 本地提醒**
  - 手写 Service Worker（`public/sw.js`）：静态资源缓存 + 导航离线回退，Supabase API 网络优先不缓存
  - PWA manifest + 192/512 图标（`scripts/gen_pwa_icons.py` 纯 Python 生成），index.html 注入 PWA 元信息
  - 设置页新增「作业提醒」（Notification API 本地通知 + 时间选择），`useReminder` hook 定时触发
  - 生产环境自动注册 SW（`main.tsx`）
- **手机号登录（P2-5）**
  - Auth 页新增「手机登录」tab：发送验证码 → 验证码登录（`sendPhoneOtp` / `verifyPhoneOtp`）
  - 配置指南：`docs/手机号登录配置指南.md`（需 Supabase 启用 Phone provider + 短信服务商）
- **家长管理后台基础版**
  - 新增 `/parent` 家长控制台：数据总览（孩子数/今日进度/本周积分/待审核兑换）+ 兑换快速审核 + 6 个管理快捷入口
  - 个人中心新增「家长控制台」入口
- 新增 SQL 迁移脚本 `sql/later-phase-scale-compliance.sql`（custom_badges 表 + RLS）

### Changed
- `vite.config.ts` 设置 `build.emptyOutDir: false`（本机安全删除限制，构建前需手动清理 dist）
- tsconfig 的 tsBuildInfoFile 移至 `.tsbuild/` 目录（避免 .cache 目录文件锁导致的 EPERM）
- 修复 node_modules 被 pnpm 安装失败破坏的顶层链接（vite/@vitejs/@hookform 手动重建 junction 与 bin shim）
- Settings 版本号更新至 v1.4.0

## [1.3.0] - 2026-08-18

### Added（产品优化 Next 阶段 · 成长与留存）
- **临时任务入口（P2-1）**
  - 今日清单支持添加一次性临时任务（名称 + 积分），不入作业库
  - tasks 表新增 `is_temporary` 字段（`sql/next-phase-growth-retention.sql`）
- **连击友好化 + 补签卡（P1-5）**
  - 连击达成规则放宽：当日完成率 ≥80%（默认阈值，settings.streakThreshold 可配）即算达成
  - 新增补签卡道具：20 积分兑换（走积分流水审计），可补签"昨天"保住连击
  - 成就页新增「连击守护」卡片（余额/购买/使用），断签时安抚提示
- **成长趋势可视化 + 周报（P1-2）**
  - 成就页新增「成长趋势」：recharts 面积图展示近 7/30 天积分曲线
  - 新增「本周周报」：本周完成数/积分 + 与上周环比（↑/↓）
- **多孩子档案管理（P1-4）**
  - 家长可创建孩子档案（独立子账号，role=child，parent_id 关联）
  - 新增 `/profile/children` 页面：孩子列表 + 添加 + 只读数据面板（积分/徽章/连击/周报）
  - RLS 扩展：家长可读关联孩子数据（`sql/next-phase-growth-retention.sql`）
- **周期性任务计划（P1-3）**
  - 三级分类支持重复规则：不重复 / 每天 / 每周固定日（多选）
  - 今日清单新增「一键生成今日清单」：按重复规则自动填充今日任务（去重）
  - tertiary_categories 表新增 `repeat_rule` jsonb 字段（`sql/next-phase-growth-retention.sql`）
- 新增 SQL 迁移脚本 `sql/next-phase-growth-retention.sql`

### Changed
- `calculateStreak` 改为基于「达成日集合」（完成率≥阈值 ∪ 补签日期）计算
- 新增工具函数：`isDayAchieved` / `getPointsTrend` / `getWeeklyReport` / `isRepeatDueOn` / `getTertiaryDueToday` / `fetchChildren` / `fetchChildData` / `linkChildToParent`
- `signUp` 返回新用户 id（家长创建子账号用）

## [1.2.0] - 2026-08-18

### Added（产品优化 Now 阶段 · 止血与信任修复）
- **角色权限体系（P0-1）**
  - useAuth 新增全局 `role` / `isParent` / `isChild` 状态（登录后从 profiles 表加载，回退注册元数据）
  - 孩子端隐藏规则操作：积分调整（手动加/扣分、编辑/删除记录）、奖品管理（增删改）、数据管理（备份/恢复）、重置操作、分类作业库管理
  - 孩子端保留核心能力：作业打卡、查看积分/徽章、发起兑换
- **兑换审核状态机（P0-2）**
  - redemptions 新增 `status` 字段：`pending → approved → fulfilled` / `rejected`
  - 孩子兑换 → pending（积分冻结不扣分），家长审核通过才正式扣分，驳回退还
  - 可用积分 = 总积分 - 冻结积分（`getAvailablePoints`），奖品墙/兑换判断均基于可用积分
  - 兑换记录展示状态徽标 + 家长审核操作（通过/驳回/标记兑现/撤销）
- **重置数据二次鉴权 + 自动备份（P0-3）**
  - 重置操作仅家长可见；执行前需输入「确认重置」二次确认词
  - resetAll / resetToday 重置前强制创建云端备份快照
- **修复密码重置链路（P2-4）**
  - 新增 `/reset-password` 页面（支持 PKCE recovery 流程），App.tsx 注册路由并绕过登录守卫
  - 登录页新增「忘记密码」入口（发送重置邮件）
- **新手引导（P1-9）**
  - 新增 OnboardingModal 组件：首次登录 4 步引导，家长/孩子差异化文案，localStorage 记忆完成状态
- 新增 SQL 迁移脚本 `sql/now-phase-trust-fix.sql`
  - redemptions.status 字段 + 状态约束 + 索引
  - `is_parent()` SECURITY DEFINER 安全函数（防 RLS 递归）
  - 积分调整/奖品/兑换审核的后端 RLS 双保险策略

### Changed
- `calculateTotalPoints` 仅扣除 `approved/fulfilled` 兑换（pending/rejected 不扣分，旧数据兼容为 approved）
- `redeemReward` 改为冻结制（发起即 pending，不立即扣分）
- Settings / PointManagement / Rewards / Tasks 视图接入角色权限控制

### Fixed
- tsconfig.app.json 排除 `src/utils/__tests__`（vitest 未安装导致的 tsc 阻塞，测试目录保留待补装）

## [1.1.0] - 2026-03-13

### Added
- 积分管理页面
  - 新增 PointManagement.tsx 视图组件
  - 手动加分和扣分功能
  - 积分调整记录展示
  - 调整记录编辑和删除功能
  - 积分统计卡片（累计加分、累计扣分）
  - 按类型筛选调整记录（全部/加分/扣分）
- 新增自定义 Hook
  - useDataBackup.ts - 数据备份 Hook
  - useSyncedAppState.ts - 同步应用状态 Hook
- 新增组件
  - IconPicker.tsx - 图标选择器组件
- 新增 SQL 修复脚本
  - sql/fix-infinite-recursion.sql - 修复无限递归问题
  - sql/fix-missing-functions.sql - 修复缺失的函数
  - sql/safe-fix-all.sql - 安全修复所有问题

### Changed
- 任务分类系统优化
  - 三级分类结构改进
  - 分类管理界面优化
- 积分调整功能增强
  - 支持编辑和删除调整记录
  - 调整记录时间戳优化
- 项目结构优化
  - hooks 目录新增数据同步相关 Hook
  - components 目录新增图标选择器

### Fixed
- 数据库递归查询问题修复
- 缺失数据库函数修复
- 积分同步逻辑优化
- 数据备份和恢复功能改进

### Security
- 积分调整记录操作权限验证
- 三级分类表 RLS 策略优化

## [1.0.0] - 2026-02-05

### Added
- 初始版本发布
- 任务管理功能（创建、编辑、删除任务）
- 任务添加到今日计划
- 任务完成状态切换
- 一键完成所有任务
- 积分系统
  - 完成任务获得积分
  - 实时积分显示
  - 积分历史记录
- 奖品系统
  - 自定义奖品库
  - 使用积分兑换奖品
  - 兑换记录追踪
- 成就徽章系统
  - 多种成就徽章解锁
  - 连续完成任务统计
  - 分类任务统计
- 用户认证
  - 邮箱密码登录
  - 注册功能
- Supabase 云端同步
- 本地数据存储支持
- 数据管理
  - 导出应用数据
  - 导入恢复数据
  - 重置今日任务
  - 清空所有数据
- 音效反馈
- Toast 通知系统
- 响应式设计
- 移动端优化

### Security
- Supabase Row Level Security (RLS) 策略
- 用户数据隔离保护

[Unreleased]: https://github.com/username/repo/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/username/repo/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/username/repo/releases/tag/v1.0.0
