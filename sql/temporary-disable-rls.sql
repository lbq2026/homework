-- ============================================
-- 临时方案：完全禁用 RLS 以测试功能
-- ============================================

-- 完全禁用 profiles 表的 RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

SELECT 'RLS 已临时禁用，现在可以测试用户名更新功能了！' AS status;
