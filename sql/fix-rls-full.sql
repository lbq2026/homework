-- ============================================
-- 彻底修复 profiles 表 RLS 问题 - 完全重置
-- ============================================

-- 1. 先完全禁用 RLS
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. 删除所有相关的策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 3. 删除可能导致问题的函数
DROP FUNCTION IF EXISTS public.is_parent_of(UUID);
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 4. 重新启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. 创建最简单的、不会导致递归的 RLS 策略

CREATE POLICY "Enable read access for all users" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Enable delete for users based on id" 
    ON public.profiles FOR DELETE 
    USING (auth.uid() = id);

SELECT 'RLS 已完全重置并修复！' AS status;
