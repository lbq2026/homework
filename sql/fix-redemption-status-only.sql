-- ============================================================
-- 【急救】redemptions 表缺失 status 列的最小化修复脚本
-- 适用：当兑换报 `Could not find the 'status' column of 'redemptions'` 时使用
--
-- 推荐方案：执行完整的 sql/now-phase-trust-fix.sql（含 status 字段、
-- is_parent() 函数、redemptions RLS 重建；家长审核依赖后者）。
-- 本脚本只在你想先恢复「兑换」功能、最小化风险时使用。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 全选复制 → Run
-- ============================================================

-- 1. 加 status 列（IF NOT EXISTS 已加则跳过）
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS status text;

-- 2. 存量数据视为「已确认」，保持历史积分口径
UPDATE public.redemptions SET status = 'approved' WHERE status IS NULL;

-- 3. 默认值与 NOT NULL 约束
ALTER TABLE public.redemptions ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.redemptions ALTER COLUMN status SET NOT NULL;

-- 4. 状态枚举约束（若已存在则跳过）
ALTER TABLE public.redemptions DROP CONSTRAINT IF EXISTS redemptions_status_check;
ALTER TABLE public.redemptions
  ADD CONSTRAINT redemptions_status_check
  CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected'));

-- 5. 通知 PostgREST 立刻刷新 schema cache（重要：否则仍报 column not found）
NOTIFY pgrst, 'reload schema';
