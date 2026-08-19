-- ============================================
-- 修复 profiles 表 RLS 无限递归问题
-- ============================================

-- 先删除有问题的策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 创建简单的、不会导致递归的 RLS 策略
-- 只允许用户操作自己的 profile 记录，去掉 parent 相关的复杂逻辑

CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 删除可能导致递归的函数（如果存在的话）
DROP FUNCTION IF EXISTS public.is_parent_of(UUID);

SELECT 'RLS 无限递归问题已修复！' AS status;
