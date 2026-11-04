# 家长控制与孩子管理优化 · 设计文档

- 日期：2026-10-30
- 状态：已获用户批准（UI mockup + 三节设计逐节确认）
- 项目：小勇士积分王国（React 19 + Vite 7 + TS strict + Supabase）
- 关联 UI：`.superpowers/brainstorm/20261030-parent-controls/layout-detail.html`（已批准的家长中心 mockup）

## 1. 背景与目标

场景：**一个孩子与家长共用设备**（孩子用设备打卡），家长用自己手机管理。

现状问题：

1. 业务表 RLS 全部只认 `auth.uid() = user_id`，家长登录后读不到孩子的任务/记录/兑换数据（仅 `profiles` SELECT 含 `is_parent_of` 放行）。家长中心的「数据总览、待审核」永远为空。
2. 兑换审批逻辑绑定家长自己的 state，看不到孩子的 pending 兑换。
3. Children 页无编辑资料/重置密码/解绑/绑定已有孩子的任何入口。

目标：家长登录后直达家长中心，能查看孩子数据总览、审批兑换，并管理孩子档案（编辑资料 / 重置密码 / 解绑 / 绑定已有孩子）。

## 2. 已确认的产品决策

| 决策点 | 结论 |
|---|---|
| 动线 | 方案 A「家长中心单入口」：家长登录后直接落地 `/parent` |
| 共用设备 | 保留孩子端个人页「家长中心」入口（锁图标 + 品牌色高亮，现状已有） |
| 孩子卡片操作 | 右上「⋯」菜单收纳：编辑资料 / 重置密码 / 解绑 |
| 解绑语义 | 只解绑不物理删除：`parent_id` 置空，孩子账号与数据保留、可重新绑定 |
| 绑定已有孩子 | 「＋绑定已有孩子」按钮，弹窗输入孩子登录邮箱 → 校验存在且未绑定 → 确认 |
| 家长中心结构 | 数据总览 4 卡片（档案/今日进度/本周积分/待审核）→ 我的孩子区 → 待审核兑换区 → 管理入口网格（作业/奖品/积分/徽章/隐私） |
| 编辑资料 | 头像 emoji 选择 + 昵称 |
| 重置密码 | 家长设置新密码，孩子下次登录生效，旧登录立即失效 |
| 不做 | 账号快速切换、PIN 锁、推送通知、孩子端 UI 改动 |

## 3. 数据库层设计（方案 C：读走 RLS、写走 RPC）

新增 SQL 脚本 `sql/parent-controls.sql`，模式沿用已验证的 `sql/create-child-account.sql`（pgcrypto + SECURITY DEFINER + 中文 RAISE EXCEPTION + 尾部验证 SQL）。

### 3.1 家长读策略（10 张业务表各 1 条）

PostgreSQL 同表多条 permissive SELECT 策略为 OR 关系，不修改现有策略，只新增：

```sql
CREATE POLICY "Parents can view children's tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR public.is_parent_of(user_id));
```

覆盖表：`tasks`、`daily_records`、`rewards`、`redemptions`、`badges`、`point_adjustments`、`custom_badges`、`primary_categories`、`secondary_categories`、`tertiary_categories`。`profiles` 已有家长 SELECT 策略（`sql/full-schema.sql:47-52`），不动。

效果：前端现有 `fetchChildData()`（`src/services/supabaseApi.ts`）零改动即可读到孩子全量数据。

### 3.2 动作型 RPC（5 个，SECURITY DEFINER）

通用约束：`SECURITY DEFINER`、`SET search_path = public, extensions`、`GRANT EXECUTE ... TO authenticated`、每个函数第一步校验调用者与目标孩子的亲子关系（`is_parent_of` 语义）、错误用中文 `RAISE EXCEPTION`。

| RPC | 行为 |
|---|---|
| `update_child_profile(p_child_id uuid, p_username text, p_avatar text)` | 校验家长身份 + 用户名非空/不与他人重复 → 更新 `profiles.username / avatar_url` |
| `reset_child_password(p_child_id uuid, p_new_password text)` | 密码 ≥6 位；用 pgcrypto `crypt/gen_salt('bf')` 更新 `auth.users.encrypted_password`（复用 `create_child_account.sql:61-95` 的动态 schema 定位模式）；删除该孩子的 `auth.sessions` 与 `auth.refresh_tokens` 使旧登录立即失效 |
| `unbind_child(p_child_id uuid)` | `profiles.parent_id` 置 NULL；数据保留，可重绑 |
| `bind_existing_child(p_child_email text)` | 按小写 email 查 `auth.users`：不存在 → 报错「未找到该邮箱的账号」；对应 profile 不存在或 `role != 'child'`（家长账号不可被绑定）；已绑定（`parent_id` 非空）→ 报错「该孩子已被绑定」；通过则 `parent_id = auth.uid()` |
| `approve_redemption(p_redemption_id uuid, p_approve boolean)` | 校验兑换属于自己孩子且 `status='pending'`；通过 → `status='fulfilled'` 且 `profiles.total_points -= 兑换 points`；驳回 → `status='rejected'`（冻结退回，不动积分）。非 pending → 报错「该兑换已被处理」 |

关键口径说明：

- 审批积分口径与孩子端一致：孩子端 approve 即「正式扣分」（`useSyncedAppState.ts` 中 `redeemReward` 冻结不扣、`approveRedemption` 正式扣）。RPC 在 DB 直接扣 `profiles.total_points`，孩子设备通过现有 Realtime（profiles `total_points` 通道 + redemptions 通道）自动刷新，无双写逻辑。
- 家长对 `profiles` 不获得写权限：编辑资料/解绑/绑定全走 RPC，写面最小化。
- 绑定的安全边界：仅凭邮箱即可绑定（与已批准 mockup 一致）。孩子账号邮箱多为系统内部生成的 `kid…@example.com`（外部不可猜）；「未绑定才允许」挡住主要误绑场景。

## 4. 前端架构与数据流

### 4.1 登录落地按角色分流

`src/views/Auth.tsx` 登录成功回调处先查一次 `profiles.role`；`onLoginSuccess` 回调改为带回角色；`src/App.tsx` 按角色跳转：**家长 → `/parent`，孩子 → `/`**。查角色失败兜底回 `/`。

### 4.2 共享「孩子区」组件（新目录 `src/components/parent/`）

- `ChildSection.tsx`：孩子列表区（卡片：头像/昵称/积分/「数据面板」按钮 + 右上「⋯」菜单）+「＋绑定已有孩子」按钮。家长中心与 Children 页共用。
- `ChildManageDialogs.tsx`：4 个弹窗
  - **编辑资料**：emoji 头像网格（将 `Profile.tsx` 的头像列表常量抽为 `src/constants/avatars.ts` 共享）+ 昵称输入 → `update_child_profile`
  - **重置密码**：新密码 + 确认密码（前端先校验一致、≥6 位）→ `reset_child_password` → 成功提示「孩子下次登录需使用新密码」
  - **解绑**：红色警示卡片 +「孩子账号与数据将保留，之后可重新绑定」文案 → 二次确认 → `unbind_child`
  - **绑定已有孩子**：输入孩子登录邮箱 → `bind_existing_child` → 成功刷新列表
- 孩子数据面板（点开孩子卡片的只读统计视图）逻辑随 ChildSection 共用（现 `Children.tsx:92-165` 的实现迁入）。

### 4.3 ParentDashboard 重构（按 mockup）

1. **数据总览 4 卡片**：新增聚合纯函数 `aggregateChildOverview(childDataList)`（放 `src/utils/`）——档案数 / 今日进度（Σ已完成/Σ总数）/ 本周积分（Σ孩子）/ 待审核数。加载：`fetchChildren` → 并行 `fetchChildData`。
2. **我的孩子区**：内嵌 `ChildSection`。
3. **待审核兑换区**：`supabaseApi.ts` 新增 `fetchPendingRedemptions(childIds)`——`redemptions.select('*').in('user_id', childIds).eq('status','pending')`（RLS 放行后可行）；孩子名不查库，由前端用已加载的孩子列表按 `user_id` 映射。通过/驳回 → `approve_redemption` RPC → 刷新列表与总览。
4. **管理入口网格**：保留现有 6 项（作业/奖品/积分/我的孩子/徽章/隐私），与已批准 mockup 脚注⑤一致。

### 4.4 Children.tsx 简化

改为薄壳：头部 + `<ChildSection>` + 保留「添加孩子档案」（新建账号，走现有 `createChildAccount`）。

### 4.5 数据流

```
家长登录 → /parent
  ├─ fetchChildren → 孩子卡片
  ├─ fetchChildData × N（并行）→ aggregateChildOverview → 总览 4 卡片
  ├─ fetchPendingRedemptions → 待审核列表（通过/驳回 → RPC → 刷新）
  └─ ChildSection（编辑/重置密码/解绑/绑定 → RPC → 刷新）
孩子设备（共用场景）：Realtime profiles/redemptions 通道自动同步审批结果与积分
```

`/profile` 的「家长中心」入口保留现状（共用设备动线）。

## 5. 错误处理

| 场景 | 处理 |
|---|---|
| RPC 校验失败（身份/重复/邮箱不存在/已绑定等） | SQL 中文 RAISE EXCEPTION → 前端 toast 展示 message（沿用 createChildAccount 模式） |
| 孩子数据读取失败（网络） | 卡片显示空态 + 重试按钮，不静默吞错 |
| 审批竞态（兑换已被处理/已删除） | RPC 报「该兑换已被处理」→ 前端自动刷新待审核列表 |
| 重置密码后孩子旧设备 | RPC 清 session/refresh_token，孩子端被踢回登录页，新密码生效 |
| 未配置 Supabase | 现有降级模式（本地 localStorage）不动，家长功能显示未配置提示 |

## 6. 测试策略

- **单元测试（vitest，沿用 `src/**/__tests__` 模式）**：
  - `aggregateChildOverview` 聚合函数（空列表/多孩子/边界值）
  - 弹窗表单校验纯函数（密码一致性/长度、邮箱非空）
  - `fetchPendingRedemptions` 行转换（带孩子信息）
- **SQL 冒烟验证**：`sql/parent-controls.sql` 尾部附验证查询（照 `create-child-account.sql` 惯例）。
- **手动验收清单**：
  1. 家长登录 → 直接落地 `/parent`
  2. 总览 4 卡片显示孩子真实数据
  3. 待审核兑换：通过后孩子端实时扣分；驳回后冻结退回
  4. 编辑资料：昵称/头像更新在孩子端生效
  5. 重置密码：孩子旧登录失效，新密码可登录
  6. 解绑：孩子数据保留、可重新绑定
  7. 绑定已有孩子：不存在/已绑定邮箱报中文错误；成功后出现在列表
  8. 孩子登录仍走原动线（落地 `/`），个人页「家长中心」入口可用
- `tsc -b` 与 `vite build` 全绿。

## 7. 范围边界（明确不做）

- 账号快速切换、PIN 锁、推送通知、孩子端 UI 改动（孩子动线完全不变）。
- 既有语义保持：管理入口（作业/奖品/积分/徽章）跳转的现有页面操作的是家长账号自己的配置数据，与孩子账号数据互不影响；孩子数据在本设计中只读展示 + 白名单动作，不涉及配置归属迁移。
