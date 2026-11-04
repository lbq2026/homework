# 孩子数据继承（下发复制）设计文档

> 日期：2026-11-02 · 状态：已与用户逐节确认
> 前置：`docs/superpowers/specs/2026-10-30-parent-controls-design.md`（家长控制与孩子管理，已实现）

## 1. 背景与目标

模板型数据（作业、奖品、三级分类、自定义徽章）每账号一套。新孩子账号仅由触发器自动初始化默认分类，任务中心与奖品中心为空——孩子没有可做的作业、可兑换的奖品。

**目标**：家长可把自己账号的作业/奖品/自定义徽章/分类「下发」给指定孩子（复制一份，孩子获得独立副本）；下发后孩子与家长都可删减。

## 2. 需求决策（用户已确认）

| 决策点 | 结论 |
|---|---|
| 继承机制 | **下发复制**：家长中心勾选数据复制到指定孩子，可多次按需下发；孩子删了家长可再发 |
| 下发范围 | 作业 + 奖品 + 自定义徽章 + 三级分类（分类随下发自动补齐，不需单独勾选） |
| 删减权限 | 孩子端可删作业/奖品；家长可替孩子删全部四类（含徽章/分类） |
| 刻意收窄 | 徽章与分类孩子端**不开放删除**（分类被任务引用，误触代价高），仅家长「管理孩子数据」可删 |
| 实现方案 | **方案 A：全走 SECURITY DEFINER RPC**（与 parent-controls.sql 同模式），不扩 RLS 写策略 |

## 3. 现状（已探明）

- 全部业务表按 `user_id` + RLS 隔离（`sql/full-schema.sql`）；孩子账号数据库层已有对自己数据的写权限，仅前端无删除入口。
- 家长对孩子数据只有 SELECT 策略（`sql/parent-controls.sql`），无写入路径。
- **作业模板实为三级分类**：`Tasks.tsx` 的「分类与作业库」中，"任务" 即 `tertiary_categories` 行（含 `default_points`）；`tasks` 表存的是「加入今日的任务实例 + `is_temporary=true` 的临时任务」，不是模板。因此「下发作业」= 复制三级分类（沿父链补齐一二级分类），不复制 `tasks` 表。
- 外键行为已确认安全：`tasks → 分类` 与 `redemptions.reward_id → rewards` 均为 `ON DELETE SET NULL`；分类层级删除内部 `CASCADE`（full-schema.sql:82-84, 246, 425, 478）。删除模板不断历史记录。
- 唯一约束仅 3 处：`daily_records(user_id,date)`、`badges(user_id,badge_type)`、`primary_categories(user_id,key)`——primary 分类按 `key` 判重，二级/三级与作业/奖品/徽章按名称判重。
- `custom_badges` 表定义在 `sql/later-phase-scale-compliance.sql:16-25`，其 `user_id` 引用 `auth.users(id)`（其余业务表引用 `profiles(id)`），uuid 同值不影响 RPC 按 `p_child_id` 写入。
- 新用户触发器 `handle_new_user → initialize_default_categories_for_user`（full-schema.sql:673-698, 603-668）：孩子自动有默认分类。

## 4. 数据库设计（追加进 `sql/parent-controls.sql`）

### 4.1 `dispatch_to_child(p_child_id uuid, p_task_ids uuid[], p_reward_ids uuid[], p_badge_ids uuid[]) RETURNS jsonb`

> `p_task_ids` 实际传入的是**家长账号 `tertiary_categories.id`**（作业 = 三级分类，见 §3），不复制 `tasks` 表。

返回 `jsonb_build_object('tasks', n, 'rewards', n, 'badges', n, 'categories', n)`（实际新插入数）。

执行顺序（单事务，任一步失败整体回滚）：

1. **安全校验**：`SELECT parent_id FROM profiles WHERE id = p_child_id`，为空或不等于 `auth.uid()` 则 `RAISE EXCEPTION '无权下发给孩子'`。
2. **作业复制（= 三级分类沿父链补齐）**：`FOREACH` 循环 `p_task_ids`，逐个处理家长的三级分类——
   - 一级：按 `key` 查孩子端是否已有（`UNIQUE(user_id,key)` 天然判重），无则插入（`ON CONFLICT (user_id,key) DO NOTHING` 兜底），建立「家长 id → 孩子 id」映射；
   - 二级：按「父分类映射后的 id + trim(name) 相同」判重，无则插入，建立映射；
   - 三级：同二级规则插入，插入成功计入 `tasks` 计数，已存在则跳过不计数；
   - 一二级新插入的计入 `categories` 计数。
3. **奖品复制**：从家长账号 `rewards` 取 `p_reward_ids` 对应行，`user_id` 置为孩子 id；孩子端已有同名（trim 后）奖品则跳过，否则插入计入 `rewards` 计数。
4. **徽章复制**：`custom_badges` 按 `p_badge_ids` 同法复制（`condition_type` 等字段原样，`user_id` 改写），按名称去重，计入 `badges` 计数。
5. 三个 id 数组参数传 NULL 或空数组时跳过该类；整个函数幂等，重复下发不产生重复项。

### 4.2 `delete_child_template(p_child_id uuid, p_table text, p_item_id uuid) RETURNS jsonb`

1. `is_parent_of(p_child_id)` 校验，失败报「无权操作该孩子」。
2. `p_table` 白名单校验：`tasks | rewards | custom_badges | primary_categories | secondary_categories | tertiary_categories`，否则报「不支持的数据类型」。
3. 目标行必须存在且 `user_id = p_child_id`（防止跨账号误删），否则报「条目不存在」。
4. `DELETE`，返回 `jsonb_build_object('success', true)`。

### 4.3 公共约定

- 两函数均 `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions`，中文报错。
- `GRANT EXECUTE ... TO authenticated`。
- 文件尾部追加验证 SQL 注释段（与现有格式一致）。

## 5. 前端设计

### 5.1 API 层（`src/services/supabaseApi.ts`）

- `dispatchToChild(childId, taskIds, rewardIds, badgeIds)` —— 封装 RPC 4.1。
- `deleteChildTemplate(childId, table, itemId)` —— 封装 RPC 4.2。
- `fetchChildTemplateNames(childId)` —— 拉孩子端 tasks/rewards/custom_badges 的 `{taskNames, rewardNames, badgeNames}` 名称集合，用于下发对话框「已下发」标记。
- `src/types/database.ts` 补两个 RPC 的函数类型签名（参数名与 SQL 一致）。

### 5.2 下发对话框（新组件 `src/components/parent/DispatchDialog.tsx`）

- 入口：家长中心孩子卡片「⋯」菜单新增「下发作业/奖品」项。
- 三个分区（作业/奖品/自定义徽章），列出**家长自己账号**的数据——直接取 `useAppState` 已加载的 `tertiaryCategories`/`rewards`/`customBadges`（项目无按表单类 fetch 接口，家长登录后 `fetchAllUserData` 已全量拉取），复选框勾选，支持全选/清空。
- 孩子端同名项显示「已下发」标记并禁勾（用 5.1 名称集合比对）。
- 全未勾选时确认按钮禁用；家长对应分区为空时显示空态「先在任务中心/奖品中心创建」。
- 确认调 `dispatchToChild`，成功 toast：「已下发 任务 n · 奖品 n · 徽章 n（分类自动补齐 n 个）」并关闭。

### 5.3 管理孩子数据对话框（新组件 `src/components/parent/ManageChildDataDialog.tsx`）

- 入口：「⋯」菜单新增「管理孩子数据」项。
- 四个 Tab：作业/奖品/徽章/分类，列**孩子端**现有项（复用 `fetchChildData` + 分类查询），行内「删除」按钮。
- 删除走确认弹窗 → `deleteChildTemplate` → 刷新 Tab 列表。
- 删分类时确认文案：「删除后该分类下的作业将变为未分类」。

### 5.4 孩子端删减入口

- `src/views/Tasks.tsx`：三级分类（作业模板）行的操作按钮目前整体包在 `{isParent && (…)}` 内（加今日/编辑/删除，约 L624），把「删除」移出该条件使孩子也能看到；确认弹窗与删除逻辑复用现有 `deleteTertiaryCategory`，走 RLS 直接 DELETE（孩子对自身数据本有权限）。临时任务行不动。
- `src/views/Rewards.tsx`：奖品行「删除」按钮（约 L219-239）同样移出 `isParent` 条件，复用现有 `deleteReward` 与确认弹窗。
- 徽章/分类孩子端不加删除入口（见 §2 收窄）。

## 6. 边界与错误处理

| 场景 | 处理 |
|---|---|
| 重复下发 | 前端禁勾「已下发」+ RPC 按名称去重双保险，统计只计实际新增 |
| 家长无数据 | 分区空态提示「先在任务中心/奖品中心创建」 |
| 全未勾选 | 确认按钮禁用 |
| 孩子已被解绑 | RPC `is_parent_of` 拦截，toast 中文报错 |
| 删除已打卡的作业 | 只删模板不动记录：历史打卡与已得积分不受影响 |
| 删除已解锁徽章 | 解锁记录独立存储不消失；仅后续不再解锁同款 |
| 删除分类 | 任务归类 SET NULL；删二级级联删其下三级（既有数据库行为），UI 提示 |
| RPC 失败 | 单事务整体回滚，toast 错误信息，不刷新统计 |

## 7. 测试与验收

- **SQL 验证**：迁移后在 Supabase SQL Editor 用真实家长/孩子 uuid 执行：下发 → 查孩子端四类数据 → 重复下发验证去重 → `delete_child_template` 逐表删 → 非法 `p_table` 报错。
- **单测（vitest）**：勾选去重逻辑抽纯函数（计算「已下发」禁勾集与可选集）测试；现有 36 个单测不回归。
- **手动验收**：
  1. 家长下发 → 孩子端任务/奖品中心立即可见，分类与徽章同步到位
  2. 重复下发不产生重复项，统计数正确
  3. 孩子删作业/奖品，列表消失、历史打卡积分不变
  4. 家长「管理孩子数据」删分类 → 孩子对应作业变「未分类」
  5. 解绑孩子后下发/删减均报「无权」中文错误
  6. `tsc -b` 与 `vite build` 通过

## 8. 明确不做（YAGNI）

- 不做家长修改后自动同步到孩子（一次性复制，副本独立）
- 不做孩子端反向上报（孩子自建任务已有「临时任务」机制）
- 不做批量替孩子增改（只做删减；下发即批量新增）
- 不动分类/徽章的孩子端删除入口
