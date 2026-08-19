-- ============================================
-- 安全的 RLS 配置方案 - 无递归风险
-- ============================================

-- 1. 确保 RLS 是启用的
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有现有策略，从头开始
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;

-- 3. 为 profiles 表创建简单且安全的策略
-- 只允许用户操作自己的记录，不涉及任何递归查询

CREATE POLICY "profiles_select_policy"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "profiles_delete_policy"
    ON public.profiles
    FOR DELETE
    USING (auth.uid() = id);

-- 4. 同样为其他表也设置安全的 RLS 策略
-- tasks 表
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "tasks_select_policy"
    ON public.tasks
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_policy"
    ON public.tasks
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_policy"
    ON public.tasks
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete_policy"
    ON public.tasks
    FOR DELETE
    USING (auth.uid() = user_id);

-- daily_records 表
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can create own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can update own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can delete own daily records" ON public.daily_records;

CREATE POLICY "daily_records_select_policy"
    ON public.daily_records
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "daily_records_insert_policy"
    ON public.daily_records
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_records_update_policy"
    ON public.daily_records
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "daily_records_delete_policy"
    ON public.daily_records
    FOR DELETE
    USING (auth.uid() = user_id);

-- rewards 表
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can create own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can update own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can delete own rewards" ON public.rewards;

CREATE POLICY "rewards_select_policy"
    ON public.rewards
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "rewards_insert_policy"
    ON public.rewards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rewards_update_policy"
    ON public.rewards
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "rewards_delete_policy"
    ON public.rewards
    FOR DELETE
    USING (auth.uid() = user_id);

-- redemptions 表
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Users can create own redemptions" ON public.redemptions;

CREATE POLICY "redemptions_select_policy"
    ON public.redemptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "redemptions_insert_policy"
    ON public.redemptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- badges 表
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own badges" ON public.badges;
DROP POLICY IF EXISTS "Users can create own badges" ON public.badges;

CREATE POLICY "badges_select_policy"
    ON public.badges
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "badges_insert_policy"
    ON public.badges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- point_adjustments 表
ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own point adjustments" ON public.point_adjustments;
DROP POLICY IF EXISTS "Users can create own point adjustments" ON public.point_adjustments;
DROP POLICY IF EXISTS "Users can update own point adjustments" ON public.point_adjustments;
DROP POLICY IF EXISTS "Users can delete own point adjustments" ON public.point_adjustments;

CREATE POLICY "point_adjustments_select_policy"
    ON public.point_adjustments
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "point_adjustments_insert_policy"
    ON public.point_adjustments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "point_adjustments_update_policy"
    ON public.point_adjustments
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "point_adjustments_delete_policy"
    ON public.point_adjustments
    FOR DELETE
    USING (auth.uid() = user_id);

-- primary_categories 表
ALTER TABLE public.primary_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own primary categories" ON public.primary_categories;
DROP POLICY IF EXISTS "Users can create own primary categories" ON public.primary_categories;
DROP POLICY IF EXISTS "Users can update own primary categories" ON public.primary_categories;
DROP POLICY IF EXISTS "Users can delete own primary categories" ON public.primary_categories;

CREATE POLICY "primary_categories_select_policy"
    ON public.primary_categories
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "primary_categories_insert_policy"
    ON public.primary_categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "primary_categories_update_policy"
    ON public.primary_categories
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "primary_categories_delete_policy"
    ON public.primary_categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- secondary_categories 表
ALTER TABLE public.secondary_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own secondary categories" ON public.secondary_categories;
DROP POLICY IF EXISTS "Users can create own secondary categories" ON public.secondary_categories;
DROP POLICY IF EXISTS "Users can update own secondary categories" ON public.secondary_categories;
DROP POLICY IF EXISTS "Users can delete own secondary categories" ON public.secondary_categories;

CREATE POLICY "secondary_categories_select_policy"
    ON public.secondary_categories
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "secondary_categories_insert_policy"
    ON public.secondary_categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secondary_categories_update_policy"
    ON public.secondary_categories
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "secondary_categories_delete_policy"
    ON public.secondary_categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- tertiary_categories 表
ALTER TABLE public.tertiary_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tertiary categories" ON public.tertiary_categories;
DROP POLICY IF EXISTS "Users can create own tertiary categories" ON public.tertiary_categories;
DROP POLICY IF EXISTS "Users can update own tertiary categories" ON public.tertiary_categories;
DROP POLICY IF EXISTS "Users can delete own tertiary categories" ON public.tertiary_categories;

CREATE POLICY "tertiary_categories_select_policy"
    ON public.tertiary_categories
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "tertiary_categories_insert_policy"
    ON public.tertiary_categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tertiary_categories_update_policy"
    ON public.tertiary_categories
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "tertiary_categories_delete_policy"
    ON public.tertiary_categories
    FOR DELETE
    USING (auth.uid() = user_id);

SELECT '安全的 RLS 配置已完成！所有表都有了简单且无递归风险的策略。' AS status;
