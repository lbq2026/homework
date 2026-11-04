# 家长手动加减分绑定孩子账号 — 设计文档

- 日期：2026-11-03
- 状态：已与用户逐节确认（页面结构 / 数据接口 / 边界验证）
- 相关模块：积分管理（`/profile/points`）、家长控制 RPC、孩子端实时同步

## 1. 背景与问题

现状：家长在「积分管理」页手动加分/扣分时，`useSyncedAppState.adjustPoints` 调用
`insertPointAdjustment(user.id, points, reason)`，其中 `user.id` 是当前登录的家长账号；
页面统计与调整记录也读取家长自己的全局 `state`。结果积分记在家长名下，孩子的积分与记录都没有变化。

权限约束（关键）：

- `point_adjustments` 的 RLS 在 `sql/now-phase-trust-fix.sql` 中被重建为仅 `user_id = auth.uid()` 可读写；
  家长无法直接 INSERT/UPDATE/DELETE 孩子名下的记录。
- `profiles` 的 UPDATE 策略仅允许 `auth.uid() = id`，家长无法直接更新孩子的 `total_points`。
- 家长**读**孩子数据已放行：`parent-controls.sql` 与 `next-phase-growth-retention.sql` 提供
  `is_parent_of(user_id)` 的 SELECT 策略。
- 项目既有模式是「读走 RLS、写走 RPC」：`approve_redemption` 在 `SECURITY DEFINER` 函数内
  同时更新兑换状态与孩子 `profiles.total_points`。

## 2. 目标

1. 家长手动加分/扣分必须写入所选孩子的账号（记录 + 总分）。
2. 积分管理页支持按孩子切换：统计、调整记录、加减分操作都跟随所选孩子。
3. 孩子端进入同一页面时只看到自己的数据，只读。
4. 孩子名下记录的编辑/删除保留，且操作后积分与记录保持一致。
5. 零孩子、单孩子、多孩子、孩子解绑等场景有明确表现。

## 3. 非目标（YAGNI）

- 不做批量加减分、不做孩子选择记忆、不做多孩子聚合总览。
- 不做积分变动通知/消息中心。
- 不迁移家长账号里已有的历史调整记录（保留在家长账号，页面不再展示）。
- 不改变孩子自己购买补签卡（`buyMakeupCard`）的原有逻辑。

## 4. 方案选择

采用**方案 A：新增专用 SECURITY DEFINER RPC，沿用「读走 RLS、写走 RPC」**。

- 单事务内完成「写记录 + 同步总分」，不会出现记录成功但总分没更新的错账。
- 不放松现有 RLS 安全边界（孩子仍不能直接改自己的积分）。
- 与 `parent-controls.sql` 既有模式一致，便于维护。

未采用：

- 方案 B：放宽 `point_adjustments` / `profiles` 的 RLS 让前端直写。改动看似最小，但两次写入非事务，
  且扩大写策略攻击面。
- 方案 C：记录直写 + 总分单独重算 RPC。仍需放宽 RLS，一致性依赖调用顺序。

## 5. 页面与交互

### 5.1 家长端（`isParent === true`）

进入页面先 `fetchChildren(user.id)` 加载孩子列表：

- **0 个孩子**：显示空态卡片「尚未绑定孩子，请先到孩子管理中绑定」，提供跳转
  `/profile/children` 的按钮；加减分按钮与记录区禁用。
- **1 个孩子**：自动选中，顶部展示孩子小卡片（头像 emoji + 昵称），不显示切换控件。
- **≥2 个孩子**：顶部横向 chip 切换器（头像 + 昵称），选中项高亮；切换时重新加载该孩子数据。

选中孩子后，页面主体整体切换到该孩子：

- 积分总览：展示该孩子当前积分（派生值），累计加分/累计扣分按该孩子的调整记录统计。
- 快捷操作：「手动加分 / 手动扣分」作用于该孩子。
- 调整记录：Tabs（全部 / 加分 / 扣分）+ 列表，仅展示该孩子记录，编辑/删除按钮仅家长可见。
- 新增/编辑弹窗顶部显示「记入：{孩子昵称}」。
- 新增扣分：实际扣减 = `-Math.min(输入值, 孩子当前积分)`（基数换成所选孩子）。
- 编辑记录：保存前校验 `孩子当前积分 - 原记录值 + 新值 >= 0`，不满足则提示「编辑后积分不能为负」
  并阻止提交（修复现有编辑可无限扣成负数的问题）。

### 5.2 孩子端（`isParent === false`）

- 不显示孩子切换器与加减分按钮。
- 展示自己账号的积分与调整记录（只读），数据继续来自全局 `state`，与现状一致。
- 编辑/删除按钮保持仅家长可见。

## 6. 数据与接口

### 6.1 新增 SQL 脚本 `sql/child-points-binding.sql`（幂等）

三个 `SECURITY DEFINER` + `SET search_path = public` 函数，均 `GRANT EXECUTE TO authenticated`：

| 函数 | 行为 |
| --- | --- |
| `adjust_child_points(p_child_id uuid, p_points integer, p_reason text) returns jsonb` | 校验 `is_parent_of(p_child_id)`、`p_points <> 0`、`trim(p_reason)` 非空；插入 `point_adjustments(user_id = 孩子)`；`profiles.total_points = COALESCE(total_points,0) + p_points`；返回 `{success, adjustment_id, total_points}` |
| `update_child_point_adjustment(p_adjustment_id uuid, p_points integer, p_reason text) returns jsonb` | 查原记录 `user_id` 与 `points`；校验 `is_parent_of(原 user_id)`；更新 `points/reason`；`total_points += (p_points - 旧 points)` |
| `delete_child_point_adjustment(p_adjustment_id uuid) returns jsonb` | 查原记录 `user_id` 与 `points`；校验家长身份；删除记录；`total_points -= 旧 points` |

校验失败统一使用中文报错（如「无权操作该孩子」「积分调整记录不存在」），与现有 RPC 风格一致。

说明：页面展示与扣分截断以 `calculateTotalPoints(childState)` 派生值为准；RPC 同步维护
`profiles.total_points` 镜像，孩子端刷新时会以派生值校准（现有兜底逻辑）。

### 6.2 前端 API 层 `src/services/supabaseApi.ts`

新增 3 个封装：

- `adjustChildPointsRpc(childId, points, reason)`
- `updateChildPointAdjustmentRpc(adjustmentId, points, reason)`
- `deleteChildPointAdjustmentRpc(adjustmentId)`

### 6.3 积分管理页 `src/views/PointManagement.tsx`

家长端维护局部状态：

- `childList`（`fetchChildren`）
- `selectedChildId`（0 / 1 / 多孩子规则见 5.1）
- `childData`（`fetchChildData(selectedChildId)`）

派生数据：

- `childState = buildStateFromDb(childData)`，`childTotal = calculateTotalPoints(childState)` 用于展示与截断。
  注意：`buildStateFromDb` 内部会以本地 `loadState()` 作为基础设置，这里只使用派生积分与
  `pointAdjustments`/`dailyRecords`/`redemptions` 字段，不读取 settings / badges。
- 记录列表直接使用 `childData.pointAdjustments`，排序沿用现有规则（`adjustedAt || createdAt` 降序）。

操作：

- 新增/编辑/删除成功后重新 `fetchChildData(selectedChildId)` 并刷新统计；失败 `toast.error`，不做乐观更新。
- 家长页面的操作不再修改家长自己的全局 `state`。

### 6.4 清理旧写入方法

`useSyncedAppState` 中的 `adjustPoints / editPointAdjustment / deletePointAdjustment`
在改造后无其他调用（已 grep 确认仅 `PointManagement` 使用），一并移除，避免再次写家长账号。
`AppStateContext` 的类型由 `ReturnType<typeof useSyncedAppState>` 推导，无需单独修改。

### 6.5 孩子端实时

现有 Realtime 已按 `user_id = 孩子 id` 订阅 `point_adjustments` 与 `profiles`：
`onPointAdjustmentsChange` 触发全量刷新，`onProfileChange` 更新总分。RPC 写入后孩子在线会自动刷新，无需新增订阅。

## 7. 边界情况与错误处理

- 孩子列表加载失败：显示错误态 + 重试按钮。
- 切换孩子存在请求竞态：按发起时的 `childId` 比对，丢弃过期响应。
- 孩子已解绑 / 已删除：`fetchChildData` 返回 `null`，显示空态并提示重新选择。
- RPC 失败（网络、无权限、记录不存在、参数非法）：`toast.error` 展示后端消息，页面保持原数据。
- 扣分超额：前端截断到孩子当前积分；编辑后为负则阻止提交并提示。
- 旧的历史记录：保留在家长账号，不在家长端孩子视图中展示。

## 8. 验证方案

手动验证清单：

1. 0 个孩子：空态 + 禁用 + 跳转可用。
2. 1 个孩子：自动选中，加减分/编辑/删除正常。
3. 多个孩子：切换后统计与记录切换正确，操作只影响所选孩子。
4. 加分、扣分、超额扣分（截断）、编辑（含编辑成负数被阻止）、删除（积分回滚）。
5. 家长操作后，孩子端在线（Realtime）能刷新到新积分与记录。
6. 孩子端进入页面：只读自己的积分与记录，无切换器与操作按钮。
7. 解绑孩子后重新进入：列表与空态正确。

工程验证：

- 家长登录态下直接调用 RPC；传入非自己孩子的 id 必须报「无权操作该孩子」。
- `tsc` 类型检查与构建通过。

## 9. 影响文件

- 新增：`sql/child-points-binding.sql`
- 修改：`src/services/supabaseApi.ts`（3 个 RPC 封装）
- 修改：`src/views/PointManagement.tsx`（孩子切换器、数据源与操作改造）
- 修改：`src/hooks/useSyncedAppState.ts`（移除 3 个旧写入方法）
