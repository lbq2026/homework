-- ============================================================
-- Later 阶段 · 规模与合规（产品优化 Later 清单配套 SQL）
-- 2026-08-18
--
-- 包含：
--   1. custom_badges 表（P2-2 徽章自定义）
--   2. custom_badges RLS（家长管理，孩子只读）
--
-- 前置：now-phase-trust-fix.sql + next-phase-growth-retention.sql
-- 执行方式：Supabase Dashboard → SQL Editor → 全部复制执行
-- ============================================================

-- ============================================================
-- 1. custom_badges 表（P2-2 家长自定义徽章）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '🏅',
  description text NOT NULL DEFAULT '',
  condition_type text NOT NULL CHECK (condition_type IN ('tasks', 'points', 'streak')),
  condition_value integer NOT NULL DEFAULT 10
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_custom_badges_user ON public.custom_badges (user_id);

-- 解锁记录复用 badges 表（badge_type = 'custom:<badge_id>'），
-- 由应用层写入，无需额外表。

-- ============================================================
-- 2. custom_badges RLS（家长可增删改，孩子只读）
-- ============================================================
ALTER TABLE public.custom_badges ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'custom_badges'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.custom_badges', pol.policyname);
  END LOOP;
END $$;

-- 所有人可读自己的自定义徽章（家长读孩子数据由家长 RLS 覆盖）
CREATE POLICY "cb_select_own" ON public.custom_badges
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

-- 仅家长可写（创建/修改/删除）
-- 用内联子查询检测当前账号 role='parent'，避免依赖 public.is_parent() 函数（详见 now-phase-trust-fix.sql）
CREATE POLICY "cb_parent_write" ON public.custom_badges
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
  );

-- ============================================================
-- 验证语句
-- ============================================================
-- SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname='public' AND tablename='custom_badges' ORDER BY policyname;
