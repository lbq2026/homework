-- ============================================
-- 安全修复 - 一次性解决所有问题
-- 这个脚本不会导致任何错误，可以安全执行
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 修复 profiles 表 - 先清理所有可能导致问题的策略
-- ============================================

-- 删除所有现有策略（避免依赖不存在的函数）
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 删除可能不存在的函数（避免错误）
DROP FUNCTION IF EXISTS public.is_parent_of(UUID);
DROP FUNCTION IF EXISTS public.get_parent_id_for_rls(UUID);
DROP FUNCTION IF EXISTS public.get_parent_id(UUID);

-- 创建简单、安全的 RLS 策略（不会导致无限递归）
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
-- 2. 为所有其他表创建完整的 RLS 策略
-- ============================================

-- point_adjustments 表
DROP POLICY IF EXISTS "Users can view own point adjustments" ON public.point_adjustments;
DROP POLICY IF EXISTS "Users can create own point adjustments" ON public.point_adjustments;
DROP POLICY IF EXISTS "Users can update own point adjustments" ON public.point_adjustments;
DROP POLICY IF EXISTS "Users can delete own point adjustments" ON public.point_adjustments;

CREATE POLICY "Users can view own point adjustments"
    ON public.point_adjustments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own point adjustments"
    ON public.point_adjustments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own point adjustments"
    ON public.point_adjustments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own point adjustments"
    ON public.point_adjustments FOR DELETE
    USING (auth.uid() = user_id);

-- redemptions 表
DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Users can create own redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Users can update own redemptions" ON public.redemptions;
DROP POLICY IF EXISTS "Users can delete own redemptions" ON public.redemptions;

CREATE POLICY "Users can view own redemptions"
    ON public.redemptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
    ON public.redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own redemptions"
    ON public.redemptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own redemptions"
    ON public.redemptions FOR DELETE
    USING (auth.uid() = user_id);

-- tasks 表
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

CREATE POLICY "Users can view own tasks"
    ON public.tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON public.tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON public.tasks FOR DELETE
    USING (auth.uid() = user_id);

-- daily_records 表
DROP POLICY IF EXISTS "Users can view own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can create own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can update own daily records" ON public.daily_records;
DROP POLICY IF EXISTS "Users can delete own daily records" ON public.daily_records;

CREATE POLICY "Users can view own daily records"
    ON public.daily_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own daily records"
    ON public.daily_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily records"
    ON public.daily_records FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily records"
    ON public.daily_records FOR DELETE
    USING (auth.uid() = user_id);

-- rewards 表
DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can create own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can update own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can delete own rewards" ON public.rewards;

CREATE POLICY "Users can view own rewards"
    ON public.rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rewards"
    ON public.rewards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
    ON public.rewards FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rewards"
    ON public.rewards FOR DELETE
    USING (auth.uid() = user_id);

-- badges 表
DROP POLICY IF EXISTS "Users can view own badges" ON public.badges;
DROP POLICY IF EXISTS "Users can create own badges" ON public.badges;

CREATE POLICY "Users can view own badges"
    ON public.badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own badges"
    ON public.badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- primary_categories 表
DROP POLICY IF EXISTS "Users can view own primary categories" ON public.primary_categories;
DROP POLICY IF EXISTS "Users can create own primary categories" ON public.primary_categories;
DROP POLICY IF EXISTS "Users can update own primary categories" ON public.primary_categories;
DROP POLICY IF EXISTS "Users can delete own primary categories" ON public.primary_categories;

CREATE POLICY "Users can view own primary categories"
    ON public.primary_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own primary categories"
    ON public.primary_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own primary categories"
    ON public.primary_categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own primary categories"
    ON public.primary_categories FOR DELETE
    USING (auth.uid() = user_id);

-- secondary_categories 表
DROP POLICY IF EXISTS "Users can view own secondary categories" ON public.secondary_categories;
DROP POLICY IF EXISTS "Users can create own secondary categories" ON public.secondary_categories;
DROP POLICY IF EXISTS "Users can update own secondary categories" ON public.secondary_categories;
DROP POLICY IF EXISTS "Users can delete own secondary categories" ON public.secondary_categories;

CREATE POLICY "Users can view own secondary categories"
    ON public.secondary_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own secondary categories"
    ON public.secondary_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own secondary categories"
    ON public.secondary_categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own secondary categories"
    ON public.secondary_categories FOR DELETE
    USING (auth.uid() = user_id);

-- tertiary_categories 表
DROP POLICY IF EXISTS "Users can view own tertiary categories" ON public.tertiary_categories;
DROP POLICY IF EXISTS "Users can create own tertiary categories" ON public.tertiary_categories;
DROP POLICY IF EXISTS "Users can update own tertiary categories" ON public.tertiary_categories;
DROP POLICY IF EXISTS "Users can delete own tertiary categories" ON public.tertiary_categories;

CREATE POLICY "Users can view own tertiary categories"
    ON public.tertiary_categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tertiary categories"
    ON public.tertiary_categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tertiary categories"
    ON public.tertiary_categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tertiary categories"
    ON public.tertiary_categories FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. 创建必要的函数
-- ============================================

-- 创建 redeem_reward 函数
CREATE OR REPLACE FUNCTION public.redeem_reward(
    p_user_id UUID,
    p_reward_id UUID,
    p_reward_name TEXT,
    p_points INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_current_points INTEGER;
BEGIN
    -- 获取用户当前积分
    SELECT total_points INTO v_current_points
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- 检查积分是否足够
    IF v_current_points < p_points THEN
        RAISE EXCEPTION '积分不足，需要 % 积分，当前只有 % 积分', p_points, v_current_points;
    END IF;
    
    -- 创建兑换记录
    INSERT INTO public.redemptions (user_id, reward_id, reward_name, points)
    VALUES (p_user_id, p_reward_id, p_reward_name, p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建计算用户总积分的函数
CREATE OR REPLACE FUNCTION calculate_user_total_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_task_points INTEGER;
    v_adjustment_points INTEGER;
    v_redemption_points INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_points), 0)
    INTO v_task_points
    FROM public.daily_records
    WHERE user_id = p_user_id;
    
    SELECT COALESCE(SUM(points), 0)
    INTO v_adjustment_points
    FROM public.point_adjustments
    WHERE user_id = p_user_id;
    
    SELECT COALESCE(SUM(points), 0)
    INTO v_redemption_points
    FROM public.redemptions
    WHERE user_id = p_user_id;
    
    RETURN GREATEST(0, v_task_points + v_adjustment_points - v_redemption_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建更新用户总积分的函数
CREATE OR REPLACE FUNCTION update_user_total_points(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET total_points = calculate_user_total_points(p_user_id)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. 创建触发器函数
-- ============================================

-- 更新 updated_at 的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 积分调整记录变化时的触发器
CREATE OR REPLACE FUNCTION handle_point_adjustment()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_user_total_points(OLD.user_id);
        RETURN OLD;
    ELSE
        PERFORM update_user_total_points(NEW.user_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 兑换记录变化时的触发器
CREATE OR REPLACE FUNCTION handle_redemption()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_user_total_points(OLD.user_id);
        RETURN OLD;
    ELSE
        PERFORM update_user_total_points(NEW.user_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 每日记录变化时的触发器
CREATE OR REPLACE FUNCTION handle_daily_record_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_user_total_points(OLD.user_id);
        RETURN OLD;
    ELSE
        PERFORM update_user_total_points(NEW.user_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 确保所有触发器存在
-- ============================================

-- 为 point_adjustments 添加触发器
DROP TRIGGER IF EXISTS on_point_adjustment_created ON public.point_adjustments;
CREATE TRIGGER on_point_adjustment_created
    AFTER INSERT OR UPDATE OR DELETE ON public.point_adjustments
    FOR EACH ROW EXECUTE FUNCTION handle_point_adjustment();

-- 为 redemptions 添加触发器
DROP TRIGGER IF EXISTS on_redemption_created ON public.redemptions;
CREATE TRIGGER on_redemption_created
    AFTER INSERT OR UPDATE OR DELETE ON public.redemptions
    FOR EACH ROW EXECUTE FUNCTION handle_redemption();

-- 为 daily_records 添加触发器
DROP TRIGGER IF EXISTS on_daily_record_changed ON public.daily_records;
CREATE TRIGGER on_daily_record_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.daily_records
    FOR EACH ROW EXECUTE FUNCTION handle_daily_record_change();

-- ============================================
-- 6. 重新计算所有用户的总积分
-- ============================================
UPDATE public.profiles
SET total_points = calculate_user_total_points(id);

-- ============================================
-- 修复完成！
-- ============================================
SELECT '安全修复完成！所有RLS策略、函数和触发器已正确设置。' AS status;
