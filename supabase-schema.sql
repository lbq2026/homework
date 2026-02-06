-- ============================================
-- 小勇士积分王国 - Supabase 数据库 Schema
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 用户资料表 (profiles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    username TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'child' CHECK (role IN ('parent', 'child')),
    parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_points INTEGER DEFAULT 0
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR auth.uid() = parent_id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Parents can view children's profiles"
    ON public.profiles FOR SELECT
    USING (auth.uid() IN (
        SELECT parent_id FROM public.profiles WHERE id = auth.uid()
    ));

-- ============================================
-- 2. 作业任务表 (tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    base_points INTEGER DEFAULT 1,
    icon TEXT DEFAULT '📚',
    category TEXT DEFAULT 'other' CHECK (category IN ('study', 'sport', 'art', 'other')),
    is_active BOOLEAN DEFAULT TRUE
);

-- 启用 RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略
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

-- ============================================
-- 3. 每日记录表 (daily_records)
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    tasks JSONB DEFAULT '[]'::jsonb,
    total_points INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);

-- 启用 RLS
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

-- RLS 策略
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

-- ============================================
-- 4. 奖品表 (rewards)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INTEGER NOT NULL,
    icon TEXT DEFAULT '🎁',
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'other' CHECK (category IN ('entertainment', 'physical', 'privilege', 'other')),
    is_active BOOLEAN DEFAULT TRUE
);

-- 启用 RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- RLS 策略
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

-- ============================================
-- 5. 兑换记录表 (redemptions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
    reward_name TEXT NOT NULL,
    points INTEGER NOT NULL
);

-- 启用 RLS
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own redemptions"
    ON public.redemptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
    ON public.redemptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. 徽章表 (badges)
-- ============================================
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_type)
);

-- 启用 RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view own badges"
    ON public.badges FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own badges"
    ON public.badges FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. 创建触发器函数：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加 updated_at 触发器
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_records_updated_at
    BEFORE UPDATE ON public.daily_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rewards_updated_at
    BEFORE UPDATE ON public.rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. 创建触发器：新用户自动创建 profile
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, role, total_points)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'child'),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 监听 auth.users 插入事件
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 9. 创建索引优化查询性能
-- ============================================
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_category ON public.tasks(category);
CREATE INDEX idx_daily_records_user_id ON public.daily_records(user_id);
CREATE INDEX idx_daily_records_date ON public.daily_records(date);
CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);
CREATE INDEX idx_redemptions_user_id ON public.redemptions(user_id);
CREATE INDEX idx_badges_user_id ON public.badges(user_id);
CREATE INDEX idx_profiles_parent_id ON public.profiles(parent_id);

-- ============================================
-- 10. 插入默认徽章定义（可选）
-- ============================================
-- 注意：徽章定义可以存储在应用端，这里仅存储用户解锁的徽章记录

COMMENT ON TABLE public.profiles IS '用户资料表，与 auth.users 一对一关联';
COMMENT ON TABLE public.tasks IS '作业任务库，每个用户有自己的任务';
COMMENT ON TABLE public.daily_records IS '每日作业完成记录';
COMMENT ON TABLE public.rewards IS '奖品库，每个用户有自己的奖品设置';
COMMENT ON TABLE public.redemptions IS '奖品兑换记录';
COMMENT ON TABLE public.badges IS '用户解锁的徽章记录';

-- ============================================
-- 11. 创建兑换奖品的存储过程
-- ============================================
CREATE OR REPLACE FUNCTION redeem_reward(
  p_user_id UUID,
  p_reward_id UUID,
  p_reward_name TEXT,
  p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- 插入兑换记录
  INSERT INTO public.redemptions (user_id, reward_id, reward_name, points)
  VALUES (p_user_id, p_reward_id, p_reward_name, p_points);
  
  -- 更新用户总积分
  UPDATE public.profiles
  SET total_points = total_points - p_points
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
