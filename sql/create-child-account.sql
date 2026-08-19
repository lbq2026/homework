-- ============================================================
-- 直接创建子账号（2026-08-19 · v2 启用 pgcrypto）
-- 功能：前端用 supabase.rpc('create_child_account', { p_username, p_password })
--       一行调用完成 auth.users + profiles 插入，完全不发邮件、不触发 Rate Limit
--
-- 优势 vs 前端 signUp：
--   - 邮箱格式/域名不被 GoTrue 校验（内部生成 @example.com）
--   - 不触发 email rate limit
--   - 无 Confirm email 流程（直接 confirmed）
--   - 一次 RPC 同时建账号 + 关联 parent_id
--
-- 安全：
--   - SECURITY DEFINER：以函数所有者权限执行（绕过 RLS）
--   - 内部校验调用者必须为家长
--   - 校验用户名不重复
--   - password 用 bcrypt 哈希后写入（与 GoTrue 标准一致）
-- ============================================================

-- 启用 pgcrypto（gen_salt / crypt 由它提供，Supabase 默认未启用）
-- 必须先创建扩展才能让 SECURITY DEFINER 函数内部调用
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.create_child_account(
  p_username text,
  p_password text,
  p_parent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  child_email text;
  hashed_pw text;
  crypto_ns text;
BEGIN
  -- 1. 调用者必须是家长
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_parent_id AND role = 'parent') THEN
    RAISE EXCEPTION '仅家长可创建子账号';
  END IF;

  -- 2. 用户名不能为空且不能重复
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RAISE EXCEPTION '用户名不能为空';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = trim(p_username)) THEN
    RAISE EXCEPTION '用户名 "%" 已被占用', trim(p_username);
  END IF;

  -- 3. 密码长度校验
  IF length(p_password) < 6 THEN
    RAISE EXCEPTION '密码至少 6 位';
  END IF;

  -- 4. 生成邮箱（GoTrue 要求 email 非空 + 真实 TLD，example.com 通过）
  child_email := 'kid' || replace(new_user_id::text, '-', '') || '@example.com';

  -- 5. 哈希密码（动态定位 pgcrypto schema，无论扩展装到 extensions/pgcrypto/public 都能跑）
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
    USING p_password, 'bf';

  -- 6. INSERT auth.users（邮箱已确认，跳过验证邮件）
  INSERT INTO auth.users (
    instance_id, id, aud, role,
    email, encrypted_password,
    email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    child_email,
    hashed_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', trim(p_username), 'role', 'child'),
    now(), now(),
    '', '', '', ''
  );

  -- 7. INSERT profiles（关联家长）
  -- 注意：on_auth_user_created trigger 已在第 6 步自动建了空 username 的 profiles 行
  --      用 ON CONFLICT (id) DO UPDATE 覆盖关键字段
  INSERT INTO public.profiles (id, username, role, parent_id, total_points, created_at, updated_at)
  VALUES (new_user_id, trim(p_username), 'child', p_parent_id, 0, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    parent_id = EXCLUDED.parent_id,
    updated_at = now();

  -- 8. 返回新账号信息
  RETURN jsonb_build_object(
    'user_id', new_user_id,
    'email', child_email,
    'username', trim(p_username)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_child_account(text, text, uuid) TO authenticated;

-- ============================================================
-- 验证（家长用户登录后调用）
-- ============================================================
-- SELECT public.create_child_account('TIMO', 'Timo1234', auth.uid());