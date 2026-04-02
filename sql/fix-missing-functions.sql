-- ============================================
-- 补充 SQL - 修复缺失的函数和问题
-- ============================================

-- ============================================
-- 1. 创建 redeem_reward 函数 (缺失的 RPC 函数)
-- ============================================
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
    
    -- 触发积分更新（会通过触发器自动处理）
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. 重新创建并确保所有触发器正常工作
-- ============================================

-- 重新创建积分调整触发器
DROP TRIGGER IF EXISTS on_point_adjustment_created ON public.point_adjustments;
CREATE TRIGGER on_point_adjustment_created
    AFTER INSERT OR UPDATE OR DELETE ON public.point_adjustments
    FOR EACH ROW EXECUTE FUNCTION handle_point_adjustment();

-- 重新创建兑换记录触发器
DROP TRIGGER IF EXISTS on_redemption_created ON public.redemptions;
CREATE TRIGGER on_redemption_created
    AFTER INSERT OR UPDATE OR DELETE ON public.redemptions
    FOR EACH ROW EXECUTE FUNCTION handle_redemption();

-- 重新创建每日记录触发器
DROP TRIGGER IF EXISTS on_daily_record_changed ON public.daily_records;
CREATE TRIGGER on_daily_record_changed
    AFTER INSERT OR UPDATE OR DELETE ON public.daily_records
    FOR EACH ROW EXECUTE FUNCTION handle_daily_record_change();

-- ============================================
-- 3. 为所有表启用 RLS (确保安全)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.primary_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tertiary_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 确保 profiles 表的 RLS 策略正确
-- ============================================
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile" 
        ON public.profiles FOR SELECT 
        USING (auth.uid() = id OR public.is_parent_of(id));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    CREATE POLICY "Users can insert own profile"
        ON public.profiles FOR INSERT
        WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. 为 redemptions 表添加完整的 RLS 策略
-- ============================================
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own redemptions" ON public.redemptions;
    CREATE POLICY "Users can view own redemptions"
        ON public.redemptions FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can create own redemptions" ON public.redemptions;
    CREATE POLICY "Users can create own redemptions"
        ON public.redemptions FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update own redemptions" ON public.redemptions;
    CREATE POLICY "Users can update own redemptions"
        ON public.redemptions FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can delete own redemptions" ON public.redemptions;
    CREATE POLICY "Users can delete own redemptions"
        ON public.redemptions FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. 为 point_adjustments 表添加完整的 RLS 策略
-- ============================================
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own point adjustments" ON public.point_adjustments;
    CREATE POLICY "Users can view own point adjustments"
        ON public.point_adjustments FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can create own point adjustments" ON public.point_adjustments;
    CREATE POLICY "Users can create own point adjustments"
        ON public.point_adjustments FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can update own point adjustments" ON public.point_adjustments;
    CREATE POLICY "Users can update own point adjustments"
        ON public.point_adjustments FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can delete own point adjustments" ON public.point_adjustments;
    CREATE POLICY "Users can delete own point adjustments"
        ON public.point_adjustments FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 7. 重新更新所有用户的总积分
-- ============================================
UPDATE public.profiles
SET total_points = calculate_user_total_points(id);

-- ============================================
-- 补充 SQL 执行完成！
-- ============================================
SELECT '补充 SQL 执行完成！已添加 redeem_reward 函数和修复 RLS 策略' AS status;
