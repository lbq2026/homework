-- ============================================================
-- 【修复】tertiary_categories 表缺失 repeat_rule 列
--
-- 症状：作业管理中添加的作业（三级分类）无法保存至数据库，
--       console 报 `column tertiary_categories.repeat_rule does not exist` (42703)。
-- 根因：数据库未执行 next-phase 重复规则变更，而前端 insertTertiaryCategory
--       会携带 repeat_rule 字段（sql/next-phase-growth-retention.sql 引入）。
--
-- 说明：也可直接执行完整的 sql/next-phase-growth-retention.sql（幂等，
--       同时补齐 is_temporary、家长读策略等）；本脚本只做最小化修复。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 全选复制 → Run
-- ============================================================

-- 1. 补列：重复规则 JSONB，形如 {"type":"weekly","weekdays":[1,3,5]}
ALTER TABLE public.tertiary_categories
  ADD COLUMN IF NOT EXISTS repeat_rule jsonb;

-- 2. 通知 PostgREST 立刻刷新 schema cache（否则前端仍报 column not found）
NOTIFY pgrst, 'reload schema';

-- 3. 校验：应能查询到 repeat_rule 列
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tertiary_categories';
