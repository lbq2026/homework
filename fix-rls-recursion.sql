-- ============================================
-- 修复：profiles 表 RLS 策略无限递归问题
-- ============================================

-- 1. 先删除所有现有的 profiles 策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view children's profiles" ON public.profiles;

-- 2. 重新创建策略（避免递归）

-- 查看策略：用户可以查看自己的资料，或者家长查看孩子的资料
-- 使用 security definer 函数避免递归
CREATE OR REPLACE FUNCTION public.is_parent_of(child_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_parent_id UUID;
BEGIN
    -- 使用 security definer 绕过 RLS
    SELECT parent_id INTO v_parent_id
    FROM public.profiles
    WHERE id = child_id;
    
    RETURN v_parent_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 查看自己的资料
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR public.is_parent_of(id));

-- 更新自己的资料
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 插入自己的资料
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 说明：
-- 1. 使用 SECURITY DEFINER 函数绕过 RLS 检查
-- 2. 避免了策略中直接查询 profiles 表导致的递归
-- ============================================

SELECT 'RLS 策略修复完成！' AS status;
