-- ============================================================
-- 家长控制与孩子管理（2026-10-30 · 方案 C：读走 RLS、写走 RPC）
-- 规格见 docs/superpowers/specs/2026-10-30-parent-controls-design.md
-- 沿用 create-child-account.sql 的模式：pgcrypto + SECURITY DEFINER + 中文报错
-- ============================================================

-- 1. 启用 pgcrypto（reset_child_password 需要 crypt/gen_salt）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1.5 前置函数：is_parent_of（full-schema.sql 中定义；若线上库未跑过该脚本则此处补建）
--     CREATE OR REPLACE 幂等，已有定义的环境重跑不受影响
CREATE OR REPLACE FUNCTION public.is_parent_of(child_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id
  FROM public.profiles
  WHERE id = child_id;
  RETURN v_parent_id = auth.uid();
END;
$$;

-- ============================================================
-- 2. 家长读策略：10 张业务表各加 1 条（与现有策略 OR 关系，不改旧策略）
--    profiles 已有家长 SELECT 策略（full-schema.sql），此处不涉及
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks', 'daily_records', 'rewards', 'redemptions', 'badges',
    'point_adjustments', 'custom_badges', 'primary_categories',
    'secondary_categories', 'tertiary_categories'
  ] LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "Parents can view children''s %s" ON public.%I FOR SELECT
         USING (auth.uid() = user_id OR public.is_parent_of(user_id))',
        t, t
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;  -- 幂等：重跑跳过
    END;
  END LOOP;
END $$;

-- ============================================================
-- 3. 动作型 RPC（5 个，全部 SECURITY DEFINER + is_parent_of 校验）
-- ============================================================

-- 3.1 编辑孩子资料（昵称 + 头像 emoji）
CREATE OR REPLACE FUNCTION public.update_child_profile(
  p_child_id uuid,
  p_username text,
  p_avatar text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RAISE EXCEPTION '昵称不能为空';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = trim(p_username) AND id <> p_child_id) THEN
    RAISE EXCEPTION '昵称 "%" 已被占用', trim(p_username);
  END IF;
  UPDATE public.profiles
    SET username = trim(p_username), avatar_url = p_avatar, updated_at = now()
    WHERE id = p_child_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.2 重置孩子密码（更新 auth.users + 清 session，孩子旧登录立即失效）
CREATE OR REPLACE FUNCTION public.reset_child_password(
  p_child_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
  hashed_pw text;
  crypto_ns text;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RAISE EXCEPTION '密码至少 6 位';
  END IF;

  -- 动态定位 pgcrypto schema（与 create_child_account 相同，扩展装哪都能跑）
  SELECT n.nspname INTO crypto_ns
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'gen_salt'
  LIMIT 1;
  IF crypto_ns IS NULL THEN
    RAISE EXCEPTION 'pgcrypto 扩展未启用，请在 Supabase Dashboard → Database → Extensions 启用';
  END IF;
  EXECUTE format('SELECT %I.crypt($1, %I.gen_salt($2))', crypto_ns, crypto_ns)
    INTO hashed_pw
    USING p_new_password, 'bf';

  UPDATE auth.users SET encrypted_password = hashed_pw, updated_at = now() WHERE id = p_child_id;
  DELETE FROM auth.sessions WHERE user_id = p_child_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_child_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.3 解绑孩子（parent_id 置空，账号与数据保留，可重新绑定）
CREATE OR REPLACE FUNCTION public.unbind_child(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  UPDATE public.profiles SET parent_id = NULL, updated_at = now() WHERE id = p_child_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.4 绑定已有孩子（按登录邮箱；仅孩子账号、未绑定的可绑）
CREATE OR REPLACE FUNCTION public.bind_existing_child(p_child_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_parent_id uuid;
BEGIN
  IF p_child_email IS NULL OR length(trim(p_child_email)) = 0 THEN
    RAISE EXCEPTION '请输入孩子登录邮箱';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_child_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '未找到该邮箱的账号';
  END IF;
  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION '不能绑定自己的账号';
  END IF;
  SELECT role, parent_id INTO v_role, v_parent_id FROM public.profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'child' THEN
    RAISE EXCEPTION '该账号不是孩子账号';
  END IF;
  IF v_parent_id IS NOT NULL THEN
    RAISE EXCEPTION '该孩子已被绑定';
  END IF;
  UPDATE public.profiles SET parent_id = auth.uid(), updated_at = now() WHERE id = v_user_id;
  RETURN jsonb_build_object('success', true, 'child_id', v_user_id);
END;
$$;

-- 3.5 兑换审批（通过→fulfilled 且扣积分；驳回→rejected 冻结退回）
CREATE OR REPLACE FUNCTION public.approve_redemption(
  p_redemption_id uuid,
  p_approve boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_points integer;
  v_parent_id uuid;
BEGIN
  SELECT user_id, status, points INTO v_user_id, v_status, v_points
  FROM public.redemptions WHERE id = p_redemption_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '兑换记录不存在';
  END IF;
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = v_user_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权处理该兑换';
  END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION '该兑换已被处理';
  END IF;

  IF p_approve THEN
    UPDATE public.redemptions SET status = 'fulfilled' WHERE id = p_redemption_id;
    UPDATE public.profiles
      SET total_points = COALESCE(total_points, 0) - v_points, updated_at = now()
      WHERE id = v_user_id;
  ELSE
    UPDATE public.redemptions SET status = 'rejected' WHERE id = p_redemption_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.6 下发复制：作业(三级分类)/奖品/徽章 → 指定孩子
--     p_task_ids 实为家长端 tertiary_categories.id（作业=三级分类），沿父链补齐一二级
--     单事务 + 按名称幂等去重，返回 {"tasks","rewards","badges","categories"} 实际新增数
CREATE OR REPLACE FUNCTION public.dispatch_to_child(
  p_child_id uuid,
  p_task_ids uuid[],
  p_reward_ids uuid[],
  p_badge_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
  v_tid uuid;
  v_rid uuid;
  v_bid uuid;
  v_pri record;
  v_sec record;
  v_ter record;
  v_rw record;
  v_bd record;
  v_child_pid uuid;
  v_child_sid uuid;
  v_child_tid uuid;
  v_task_count integer := 0;
  v_reward_count integer := 0;
  v_badge_count integer := 0;
  v_cat_count integer := 0;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权下发给孩子';
  END IF;

  -- 作业复制：家长三级分类 → 孩子端，一二级沿父链补齐
  IF p_task_ids IS NOT NULL THEN
    FOREACH v_tid IN ARRAY p_task_ids LOOP
      SELECT * INTO v_ter FROM public.tertiary_categories
        WHERE id = v_tid AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      SELECT * INTO v_sec FROM public.secondary_categories
        WHERE id = v_ter.secondary_category_id AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      SELECT * INTO v_pri FROM public.primary_categories
        WHERE id = v_sec.primary_category_id AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;

      -- 一级：按 key 判重（UNIQUE(user_id,key)），ON CONFLICT 兜底并发
      v_child_pid := NULL;
      SELECT id INTO v_child_pid FROM public.primary_categories
        WHERE user_id = p_child_id AND key = v_pri.key;
      IF v_child_pid IS NULL THEN
        INSERT INTO public.primary_categories (user_id, name, icon, key)
          VALUES (p_child_id, v_pri.name, v_pri.icon, v_pri.key)
          ON CONFLICT (user_id, key) DO NOTHING
          RETURNING id INTO v_child_pid;
        IF v_child_pid IS NOT NULL THEN
          v_cat_count := v_cat_count + 1;
        END IF;
      END IF;
      CONTINUE WHEN v_child_pid IS NULL;

      -- 二级：映射后父 id + trim 同名判重
      v_child_sid := NULL;
      SELECT id INTO v_child_sid FROM public.secondary_categories
        WHERE user_id = p_child_id
          AND primary_category_id = v_child_pid
          AND btrim(name) = btrim(v_sec.name);
      IF v_child_sid IS NULL THEN
        INSERT INTO public.secondary_categories (user_id, primary_category_id, name, icon)
          VALUES (p_child_id, v_child_pid, v_sec.name, v_sec.icon)
          RETURNING id INTO v_child_sid;
        v_cat_count := v_cat_count + 1;
      END IF;

      -- 三级：同规则判重，插入成功计入 tasks（repeat_rule jsonb 原样复制）
      v_child_tid := NULL;
      SELECT id INTO v_child_tid FROM public.tertiary_categories
        WHERE user_id = p_child_id
          AND secondary_category_id = v_child_sid
          AND btrim(name) = btrim(v_ter.name);
      IF v_child_tid IS NULL THEN
        INSERT INTO public.tertiary_categories
          (user_id, secondary_category_id, name, icon, default_points, repeat_rule)
          VALUES
          (p_child_id, v_child_sid, v_ter.name, v_ter.icon, v_ter.default_points, v_ter.repeat_rule);
        v_task_count := v_task_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- 奖品复制（按名称去重）
  IF p_reward_ids IS NOT NULL THEN
    FOREACH v_rid IN ARRAY p_reward_ids LOOP
      SELECT * INTO v_rw FROM public.rewards WHERE id = v_rid AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.rewards
        WHERE user_id = p_child_id AND btrim(name) = btrim(v_rw.name)
      );
      INSERT INTO public.rewards (user_id, name, points, icon, description, category)
        VALUES (p_child_id, v_rw.name, v_rw.points, v_rw.icon, v_rw.description, v_rw.category);
      v_reward_count := v_reward_count + 1;
    END LOOP;
  END IF;

  -- 徽章复制（custom_badges.user_id 引用 auth.users(id)，与 profiles.id 同值）
  IF p_badge_ids IS NOT NULL THEN
    FOREACH v_bid IN ARRAY p_badge_ids LOOP
      SELECT * INTO v_bd FROM public.custom_badges WHERE id = v_bid AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.custom_badges
        WHERE user_id = p_child_id AND btrim(name) = btrim(v_bd.name)
      );
      INSERT INTO public.custom_badges (user_id, name, icon, description, condition_type, condition_value)
        VALUES (p_child_id, v_bd.name, v_bd.icon, v_bd.description, v_bd.condition_type, v_bd.condition_value);
      v_badge_count := v_badge_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'tasks', v_task_count,
    'rewards', v_reward_count,
    'badges', v_badge_count,
    'categories', v_cat_count
  );
END;
$$;

-- 3.7 家长替孩子删模板：白名单表 + 行必须属于该孩子（防跨账号误删）
CREATE OR REPLACE FUNCTION public.delete_child_template(
  p_child_id uuid,
  p_table text,
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'tasks', 'rewards', 'custom_badges',
    'primary_categories', 'secondary_categories', 'tertiary_categories'
  ];
  v_deleted bigint;
BEGIN
  IF NOT public.is_parent_of(p_child_id) THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_table IS NULL OR NOT (p_table = ANY(v_allowed)) THEN
    RAISE EXCEPTION '不支持的数据类型';
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = $1 AND user_id = $2', p_table)
    USING p_item_id, p_child_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION '条目不存在';
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_child_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_child_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unbind_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bind_existing_child(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_redemption(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_to_child(uuid, uuid[], uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_child_template(uuid, text, uuid) TO authenticated;

-- ============================================================
-- 4. 验证（在 Supabase SQL Editor 逐条执行，家长登录态下验证前端同理）
-- ============================================================
-- SELECT public.is_parent_of('<孩子uuid>');                                  -- 家长登录应返回 true
-- SELECT public.update_child_profile('<孩子uuid>', '新昵称', '🐱');          -- 成功返回 {"success":true}
-- SELECT public.reset_child_password('<孩子uuid>', 'newpass123');            -- 成功后孩子旧 session 失效
-- SELECT public.unbind_child('<孩子uuid>');                                  -- profiles.parent_id 变 NULL
-- SELECT public.bind_existing_child('<孩子邮箱>');                           -- 成功重新关联
-- SELECT public.approve_redemption('<兑换uuid>', true);                      -- status=fulfilled 且 total_points 扣减
-- SELECT public.dispatch_to_child('<孩子uuid>', ARRAY[(SELECT id FROM public.tertiary_categories WHERE user_id='<家长uuid>' LIMIT 1)], ARRAY[]::uuid[], ARRAY[]::uuid[]);
--   -- 重复执行第二次，返回 {"tasks":0,...} 验证幂等去重；tasks/rewards/badges/categories 为实际新增数
-- SELECT public.delete_child_template('<孩子uuid>', 'tertiary_categories', '<孩子端三级分类uuid>');  -- 成功返回 {"success":true}
-- SELECT public.delete_child_template('<孩子uuid>', 'daily_records', '<随便什么uuid>');             -- 应报「不支持的数据类型」
-- SELECT public.delete_child_template('<孩子uuid>', 'rewards', '<不存在的uuid>');                  -- 应报「条目不存在」
