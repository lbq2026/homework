-- ============================================================
-- Now 阶段 · 止血与信任修复（产品优化 Now 清单配套 SQL）
-- 2026-08-18
--
-- 包含：
--   1. redemptions 表新增 status 字段（兑换审核状态机）
--   2. is_parent() 安全函数（SECURITY DEFINER，避免 RLS 递归）
--   3. 家长专属操作的后端 RLS 双保险（积分调整/奖品/兑换审核）
--
-- 执行方式：Supabase Dashboard → SQL Editor → 全部复制执行
-- 前置条件：先执行过 full-schema.sql（现有表结构完整）
-- ============================================================

-- ============================================================
-- 1. redemptions.status 字段（兑换审核状态机）
-- ============================================================
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS status text;

-- 存量数据视为「已确认」（此前兑换即扣分，保持积分口径一致）
UPDATE public.redemptions SET status = 'approved' WHERE status IS NULL;

ALTER TABLE public.redemptions ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.redemptions ALTER COLUMN status SET DEFAULT 'pending';

-- 状态枚举约束
ALTER TABLE public.redemptions DROP CONSTRAINT IF EXISTS redemptions_status_check;
ALTER TABLE public.redemptions
  ADD CONSTRAINT redemptions_status_check
  CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected'));

-- 索引（家长按状态审核时加速）
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON public.redemptions (status);

-- ============================================================
-- 2. is_parent() 安全函数
--    使用 SECURITY DEFINER 以函数属主（postgres）身份查询 profiles，
--    绕过 RLS 自身递归，供各表策略判断「当前用户是否为家长」。
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_parent(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND role = 'parent');
$$;

-- 授权给 authenticated 使用
GRANT EXECUTE ON FUNCTION public.is_parent(uuid) TO authenticated;

-- ============================================================
-- 3. 后端 RLS 双保险
--    策略集重建：先清空目标表现有策略，再按「孩子只读/家长管理」重建。
-- ============================================================

-- ---------- 3.1 point_adjustments：仅家长可增删改，所有人可读自己的 ----------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'point_adjustments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.point_adjustments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "pa_select_own" ON public.point_adjustments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "pa_parent_write" ON public.point_adjustments
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_parent(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_parent(auth.uid()));

-- ---------- 3.2 rewards：仅家长可增删改，所有人可读自己的 ----------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'rewards'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rewards', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "rw_select_own" ON public.rewards
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rw_parent_write" ON public.rewards
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_parent(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_parent(auth.uid()));

-- ---------- 3.3 redemptions：孩子可发起（INSERT），仅家长可审核（UPDATE）/撤销（DELETE） ----------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'redemptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.redemptions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "rd_select_own" ON public.redemptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 孩子发起兑换（INSERT）
CREATE POLICY "rd_child_insert" ON public.redemptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 家长审核（UPDATE status）与撤销（DELETE）
CREATE POLICY "rd_parent_update" ON public.redemptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_parent(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_parent(auth.uid()));

CREATE POLICY "rd_parent_delete" ON public.redemptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_parent(auth.uid()));

-- ============================================================
-- 验证语句（执行后应各返回 1 行）
-- ============================================================
-- SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='redemptions' AND column_name='status';
-- SELECT * FROM pg_policies WHERE schemaname='public'
--   AND tablename IN ('point_adjustments','rewards','redemptions') ORDER BY tablename;
