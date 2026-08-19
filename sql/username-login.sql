-- ============================================================
-- 用户名密码登录支持（2026-08-19）
-- 功能：通过用户名反查邮箱，使登录页支持「用户名或邮箱」两种账号
--
-- 原理：
--   1. 注册时 username 已写入 profiles.username（auth trigger）
--   2. 本函数以 SECURITY DEFINER 在未登录态查询 auth.users，
--      返回与用户名精确匹配的邮箱（仅一条）
--   3. 前端拿到邮箱后走标准 signInWithPassword，兼容原有邮箱登录
--
-- 安全说明：
--   - SECURITY DEFINER 使 anon/authenticated 可调用但只能拿到精确匹配结果
--   - 查询使用 = 精确匹配 + LIMIT 1，无法批量枚举
--   - 如需更强防枚举，可配合 Redis 限流（本项目范围外）
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email::text
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE p.username = p_username
  LIMIT 1;
$$;

-- 允许匿名与登录用户调用（登录页处于未登录态，需要 anon 权限）
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon, authenticated;

-- ============================================================
-- 验证
-- ============================================================
-- SELECT public.get_email_by_username('TIMO');  -- 返回 TIMO 的邮箱
-- SELECT public.get_email_by_username('不存在'); -- 返回 NULL
