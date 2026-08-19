-- ============================================
-- 修复 profiles 表 RLS 策略的无限递归问题
-- 最简单的解决方案：简化策略，暂时避免自引用查询
-- ============================================

-- 删除所有现有的策略
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_parent_of(UUID);
DROP FUNCTION IF EXISTS public.get_parent_id_for_rls(UUID);
DROP FUNCTION IF EXISTS public.get_parent_id(UUID);

-- 首先创建一个基础策略：允许用户查看和操作自己的 profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- 进阶方案：如果需要家长查看孩子的 profile，
-- 可以使用一个独立的关系表来存储亲子关系
-- 这样可以避免 profiles 表的自引用问题
-- ============================================

-- 可选：创建亲子关系表
-- CREATE TABLE IF NOT EXISTS public.parent_child_relationships (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
--     child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
--     created_at TIMESTAMPTZ DEFAULT NOW(),
--     UNIQUE(parent_id, child_id)
-- );

-- 为关系表启用 RLS
-- ALTER TABLE public.parent_child_relationships ENABLE ROW LEVEL SECURITY;

-- 为关系表创建策略
-- CREATE POLICY "Parents can view their relationships"
--     ON public.parent_child_relationships FOR SELECT
--     USING (auth.uid() = parent_id);

-- CREATE POLICY "Parents can manage their relationships"
--     ON public.parent_child_relationships FOR ALL
--     USING (auth.uid() = parent_id);

-- 然后修改 profiles 表的 SELECT 策略：
-- DROP POLICY "Users can view own profile" ON public.profiles;
-- CREATE POLICY "Users can view own and children's profiles"
--     ON public.profiles FOR SELECT
--     USING (
--         auth.uid() = id 
--         OR EXISTS (
--             SELECT 1 FROM public.parent_child_relationships
--             WHERE parent_id = auth.uid() AND child_id = profiles.id
--         )
--     );

-- ============================================
-- 修复完成！
-- ============================================
SELECT '已成功修复 profiles 表的无限递归问题！当前策略允许用户查看自己的 profile。' AS status;
