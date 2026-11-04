# SQL 脚本索引

所有脚本在 **Supabase Dashboard → SQL Editor** 手工执行；除 `query-child-accounts.sql`（只读运维查询）外均为**幂等脚本**（`CREATE ... IF NOT EXISTS` / `CREATE OR REPLACE`），可安全重复执行，不会删除业务数据。

> 禁止提交任何关闭 RLS 的脚本（见 README「代码规范约定」）。家长写孩子数据统一走 `SECURITY DEFINER` RPC + `is_parent_of()` 校验。

---

## 1. 全新数据库（按顺序执行）

| 序号 | 文件 | 作用 | 幂等 |
|---|---|---|---|
| ① | [full-schema.sql](./full-schema.sql) | 基线：业务表、三级分类、RLS、积分触发器、默认分类 | 是 |
| ② | [now-phase-trust-fix.sql](./now-phase-trust-fix.sql) | `redemptions.status` 状态机 + `is_parent()` + 家长审核 RLS | 是 |
| ③ | [next-phase-growth-retention.sql](./next-phase-growth-retention.sql) | 临时任务 `is_temporary`、重复规则 `repeat_rule`、多孩子家长读策略 | 是 |
| ④ | [later-phase-scale-compliance.sql](./later-phase-scale-compliance.sql) | `custom_badges` 表 + RLS | 是 |
| ⑤ | [username-login.sql](./username-login.sql) | `get_email_by_username` 用户名→邮箱反查 | 是 |
| ⑥ | [create-child-account.sql](./create-child-account.sql) | 家长代创建子账号 RPC（绕过 signUp 邮件限流） | 是 |
| ⑦ | [parent-controls.sql](./parent-controls.sql) | 10 张业务表的家长读策略 + 家长管理孩子 7 个 RPC（编辑资料/重置密码/解绑/绑定已有孩子/兑换审批/下发复制/删除孩子模板） | 是 |
| ⑧ | [child-points-binding.sql](./child-points-binding.sql) | 家长手动加减分写孩子账号 3 个 RPC（新增/编辑/删除调整记录，单事务同步 `profiles.total_points`） | 是 |

> 基线也可用 `supabase/migrations/20260814120000_initial_schema.sql`（含 `data_backups` 表）；`full-schema.sql` 不含 `data_backups/status/is_temporary/repeat_rule/custom_badges`，因此新库必须继续执行 ②③④。

## 2. 存量数据库（按症状补跑）

| 症状 / 需求 | 执行脚本 |
|---|---|
| 兑换报 `Could not find the 'status' column of 'redemptions'` | 先跑 [fix-redemption-status-only.sql](./fix-redemption-status-only.sql) 急救补列，再补跑 ② |
| 添加作业报 `column tertiary_categories.repeat_rule does not exist`（42703） | 跑 [fix-tertiary-repeat-rule.sql](./fix-tertiary-repeat-rule.sql)，或补跑 ③ |
| 家长看不到孩子数据 / 无法审批兑换 | 跑 ⑦ |
| 家长手动加减分没有记到孩子账号 | 跑 ⑧（并确认前端为 v2.2.0+） |
| 想使用临时任务 / 重复规则 / 多孩子 | 跑 ③ |
| 想使用自定义徽章 | 跑 ④ |
| 想使用用户名登录 / 代创建子账号 | 跑 ⑤ / ⑥ |

## 3. 一次性 / 运维脚本

| 文件 | 类型 | 说明 |
|---|---|---|
| [migrate-redemption-all-fulfilled.sql](./migrate-redemption-all-fulfilled.sql) | 一次性数据迁移 | 把存量兑换记录统一为 `fulfilled`；注意 `pending` 也会转为正式扣分口径，执行前先备份 |
| [fix-redemption-status-only.sql](./fix-redemption-status-only.sql) | 急救补丁 | 仅补 `redemptions.status` 列并 `NOTIFY` 刷新缓存，不重建 RLS；执行后仍建议补跑 ② |
| [fix-tertiary-repeat-rule.sql](./fix-tertiary-repeat-rule.sql) | 急救补丁 | 仅补 `tertiary_categories.repeat_rule` 列；执行后仍建议补跑 ③ |
| [query-child-accounts.sql](./query-child-accounts.sql) | 只读运维查询 | 子账号核查 5 段查询，不修改数据 |

## 4. 执行后验证

各脚本尾部均附验证 SQL（注释形式）。通用检查：

```sql
-- 关键函数是否齐全（期望 12 个）
SELECT proname FROM pg_proc
WHERE proname IN (
  'get_email_by_username', 'create_child_account',
  'update_child_profile', 'reset_child_password', 'unbind_child', 'bind_existing_child',
  'approve_redemption', 'dispatch_to_child', 'delete_child_template',
  'adjust_child_points', 'update_child_point_adjustment', 'delete_child_point_adjustment'
)
ORDER BY proname;
```

首次配置与排障的完整说明见 [SUPABASE_SETUP.md](../SUPABASE_SETUP.md) 与 [docs/CODE_WIKI.md](../docs/CODE_WIKI.md) §8.3。
