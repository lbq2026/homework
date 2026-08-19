-- ============================================================
-- 查询子账号（家长创建的 @example.com 孩子账号）
-- 运行位置：Supabase Dashboard → SQL Editor
-- ============================================================

-- 方式1：只看子账号基本信息
SELECT
  u.id,
  u.email,
  u.created_at,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,   -- 邮箱是否已确认
  u.last_sign_in_at,                                     -- 最近登录时间
  p.username AS 昵称,
  p.role AS 角色
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email LIKE '%@example.com'
  AND u.email LIKE 'kid%'                                -- 限定自动生成的孩子账号
ORDER BY u.created_at DESC;

-- 方式2：看子账号 + 归属家长（parent_id 关联）
SELECT
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  p.username AS 孩子昵称,
  p.role AS 孩子角色,
  parent.email AS 家长邮箱,
  parent.username AS 家长昵称,
  u.created_at AS 注册时间
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.profiles pp ON pp.id = u.id
LEFT JOIN auth.users parent ON parent.id = pp.parent_id
WHERE u.email LIKE '%@example.com'
  AND u.email LIKE 'kid%'
ORDER BY u.created_at DESC;

-- 方式3：查全部账号（含家长），按角色分组统计
SELECT
  p.role,
  count(*) AS 账号数
FROM public.profiles p
GROUP BY p.role;

-- 方式4：一键确认所有未确认的子账号（绕过邮件验证）
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%@example.com'
  AND email LIKE 'kid%'
  AND email_confirmed_at IS NULL;

-- 方式5：复查确认结果
SELECT email, email_confirmed_at IS NOT NULL AS confirmed
FROM auth.users
WHERE email LIKE '%@example.com' AND email LIKE 'kid%'
ORDER BY created_at DESC;
