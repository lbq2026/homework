-- ============================================================
-- 家长手动加减分绑定孩子账号（2026-11-03）
-- 规格：docs/superpowers/specs/2026-11-03-child-points-binding-design.md
-- 模式：读走 RLS、写走 RPC（SECURITY DEFINER + is_parent_of 校验）
-- 幂等：全部 CREATE OR REPLACE，可重复执行
-- ============================================================

-- 0. 前置函数（幂等补建，与 full-schema.sql / parent-controls.sql 一致）
CREATE OR REPLACE FUNCTION public.is_parent_of(child_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = child_id;
  RETURN v_parent_id = auth.uid();
END;
$$;

-- 1. 新增孩子积分调整（写记录 + 同步总分，同一事务）
CREATE OR REPLACE FUNCTION public.adjust_child_points(
  p_child_id uuid,
  p_points integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id uuid;
  v_total integer;
BEGIN
  IF NOT public.is_parent_of(p_child_id) THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_points IS NULL OR p_points = 0 THEN
    RAISE EXCEPTION '积分数量不能为 0';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION '请填写调整原因';
  END IF;

  INSERT INTO public.point_adjustments (user_id, points, reason)
  VALUES (p_child_id, p_points, trim(p_reason))
  RETURNING id INTO v_adjustment_id;

  UPDATE public.profiles
    SET total_points = COALESCE(total_points, 0) + p_points,
        updated_at = now()
    WHERE id = p_child_id
    RETURNING total_points INTO v_total;

  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', v_adjustment_id,
    'total_points', v_total
  );
END;
$$;

-- 2. 编辑孩子积分调整记录（按差值同步总分）
CREATE OR REPLACE FUNCTION public.update_child_point_adjustment(
  p_adjustment_id uuid,
  p_points integer,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_old_points integer;
  v_total integer;
BEGIN
  SELECT user_id, points INTO v_user_id, v_old_points
  FROM public.point_adjustments
  WHERE id = p_adjustment_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '积分调整记录不存在';
  END IF;
  IF NOT public.is_parent_of(v_user_id) THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_points IS NULL OR p_points = 0 THEN
    RAISE EXCEPTION '积分数量不能为 0';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION '请填写调整原因';
  END IF;

  UPDATE public.point_adjustments
    SET points = p_points, reason = trim(p_reason), updated_at = now()
    WHERE id = p_adjustment_id;

  UPDATE public.profiles
    SET total_points = COALESCE(total_points, 0) + (p_points - v_old_points),
        updated_at = now()
    WHERE id = v_user_id
    RETURNING total_points INTO v_total;

  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', p_adjustment_id,
    'total_points', v_total
  );
END;
$$;

-- 3. 删除孩子积分调整记录（回滚对应积分）
CREATE OR REPLACE FUNCTION public.delete_child_point_adjustment(
  p_adjustment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_old_points integer;
  v_total integer;
BEGIN
  SELECT user_id, points INTO v_user_id, v_old_points
  FROM public.point_adjustments
  WHERE id = p_adjustment_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '积分调整记录不存在';
  END IF;
  IF NOT public.is_parent_of(v_user_id) THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;

  DELETE FROM public.point_adjustments WHERE id = p_adjustment_id;

  UPDATE public.profiles
    SET total_points = COALESCE(total_points, 0) - v_old_points,
        updated_at = now()
    WHERE id = v_user_id
    RETURNING total_points INTO v_total;

  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', p_adjustment_id,
    'total_points', v_total
  );
END;
$$;

-- 4. 授权（与现有 parent-controls.sql 一致）
GRANT EXECUTE ON FUNCTION public.adjust_child_points(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_child_point_adjustment(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_child_point_adjustment(uuid) TO authenticated;

-- 5. 部署验证（在 Supabase SQL Editor 执行）
-- SELECT proname FROM pg_proc
-- WHERE proname IN (
--   'adjust_child_points',
--   'update_child_point_adjustment',
--   'delete_child_point_adjustment'
-- );
-- 期望：返回 3 行
