-- ============================================================
-- Next 阶段 · 成长与留存（产品优化 Next 清单配套 SQL）
-- 2026-08-18
--
-- 包含：
--   1. tasks.is_temporary 字段（P2-1 临时任务）
--   2. tertiary_categories.repeat_rule 字段（P1-3 周期性任务）
--   3. 多孩子档案 RLS（P1-4 家长可读关联孩子数据）
--
-- 前置：先执行 now-phase-trust-fix.sql（redemptions.status 等）
-- 执行方式：Supabase Dashboard → SQL Editor → 全部复制执行
-- ============================================================

-- ============================================================
-- 1. tasks.is_temporary（P2-1 临时任务）
-- ============================================================
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_tasks_is_temporary ON public.tasks (is_temporary) WHERE is_temporary = true;

-- ============================================================
-- 2. tertiary_categories.repeat_rule（P1-3 周期性任务）
--    存储格式：{"type":"daily"} 或 {"type":"weekly","weekdays":[1,3,5]}
-- ============================================================
ALTER TABLE public.tertiary_categories ADD COLUMN IF NOT EXISTS repeat_rule jsonb;

-- ============================================================
-- 3. 多孩子档案 RLS（P1-4）
--    家长可读取其关联孩子（profiles.parent_id = auth.uid()）的数据；
--    孩子依旧只能读写自己的数据（现有 user_id 策略不变）。
-- ============================================================

-- 3.1 家长可读孩子数据（各业务表，SELECT 扩展）
--     策略名带 _next 后缀避免与旧策略冲突；如与现有策略叠加，OR 语义正确。
CREATE POLICY "parent_read_child_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_daily" ON public.daily_records
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_rewards" ON public.rewards
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_redemptions" ON public.redemptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_badges" ON public.badges
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_pts_adj" ON public.point_adjustments
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_pc" ON public.primary_categories
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_sc" ON public.secondary_categories
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

CREATE POLICY "parent_read_child_tc" ON public.tertiary_categories
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND parent_id = auth.uid())
  );

-- 3.2 家长设置孩子 parent_id（创建子账号后建立亲子关联）
-- 用内联子查询检查当前账号为家长，避免依赖 public.is_parent() 函数（详见 now-phase-trust-fix.sql）
CREATE POLICY "parent_link_child_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent'))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
    AND (
      -- 仅允许家长把「孩子」档案的 parent_id 指向自己（防止篡改他人）
      id <> auth.uid()
      AND parent_id = auth.uid()
      AND role = 'child'
    )
  );

-- ============================================================
-- 验证语句
-- ============================================================
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='tasks' AND column_name='is_temporary';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='tertiary_categories' AND column_name='repeat_rule';
