-- ============================================
-- 修复 profiles 表 RLS 策略无限递归问题 - v2 完全版
-- ============================================

-- 1. 首先禁用 RLS，避免修复过程中出现问题
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.profiles;

-- 3. 删除可能导致递归的函数
DROP FUNCTION IF EXISTS public.is_parent_of(UUID);
DROP FUNCTION IF EXISTS public.get_parent_id_for_rls(UUID);
DROP FUNCTION IF EXISTS public.get_parent_id(UUID);

-- 4. 创建最简单、最安全的 RLS 策略（没有任何递归）
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. 重新启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 修复完成！
-- ============================================
SELECT 'profiles 表 RLS 策略已修复，无限递归问题已解决！' AS status;
