-- ============================================
-- 小勇士积分王国 - 完整数据库 Schema
-- 包含所有功能：基础表、三级分类、积分调整、手机号、RLS 修复
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
    total_points INTEGER DEFAULT 0,
    phone TEXT
);

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 - 先创建安全函数避免递归
CREATE OR REPLACE FUNCTION public.is_parent_of(child_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_parent_id UUID;
BEGIN
    SELECT parent_id INTO v_parent_id
    FROM public.profiles
    WHERE id = child_id;
    
    RETURN v_parent_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own profile" 
        ON public.profiles FOR SELECT 
        USING (auth.uid() = id OR public.is_parent_of(id));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile"
        ON public.profiles FOR INSERT
        WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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
    primary_category_id UUID REFERENCES public.primary_categories(id) ON DELETE SET NULL,
    secondary_category_id UUID REFERENCES public.secondary_categories(id) ON DELETE SET NULL,
    tertiary_category_id UUID REFERENCES public.tertiary_categories(id) ON DELETE SET NULL,
    is_temporary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own tasks"
        ON public.tasks FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own tasks"
        ON public.tasks FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own tasks"
        ON public.tasks FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own tasks"
        ON public.tasks FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own daily records"
        ON public.daily_records FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own daily records"
        ON public.daily_records FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own daily records"
        ON public.daily_records FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own daily records"
        ON public.daily_records FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own rewards"
        ON public.rewards FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own rewards"
        ON public.rewards FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own rewards"
        ON public.rewards FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own rewards"
        ON public.rewards FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own redemptions"
        ON public.redemptions FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own redemptions"
        ON public.redemptions FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own badges"
        ON public.badges FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own badges"
        ON public.badges FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 7. 积分调整记录表 (point_adjustments)
-- ============================================
CREATE TABLE IF NOT EXISTS public.point_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL
);

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.point_adjustments ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own point adjustments"
        ON public.point_adjustments FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own point adjustments"
        ON public.point_adjustments FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own point adjustments"
        ON public.point_adjustments FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own point adjustments"
        ON public.point_adjustments FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 8. 一级分类表 (primary_categories)
-- ============================================
CREATE TABLE IF NOT EXISTS public.primary_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📚',
    key TEXT NOT NULL,
    UNIQUE(user_id, key)
);

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.primary_categories ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own primary categories"
        ON public.primary_categories FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own primary categories"
        ON public.primary_categories FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own primary categories"
        ON public.primary_categories FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own primary categories"
        ON public.primary_categories FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 9. 二级分类表 (secondary_categories)
-- ============================================
CREATE TABLE IF NOT EXISTS public.secondary_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    primary_category_id UUID REFERENCES public.primary_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📖'
);

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.secondary_categories ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own secondary categories"
        ON public.secondary_categories FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own secondary categories"
        ON public.secondary_categories FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own secondary categories"
        ON public.secondary_categories FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own secondary categories"
        ON public.secondary_categories FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 10. 三级分类表 (tertiary_categories)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tertiary_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    secondary_category_id UUID REFERENCES public.secondary_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📝',
    default_points INTEGER DEFAULT 1
);

-- 启用 RLS (如果还没有启用)
DO $$ BEGIN
    ALTER TABLE public.tertiary_categories ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN SQLSTATE '42P09' THEN NULL;
END $$;

-- RLS 策略 (只在不存在时创建)
DO $$ BEGIN
    CREATE POLICY "Users can view own tertiary categories"
        ON public.tertiary_categories FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create own tertiary categories"
        ON public.tertiary_categories FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own tertiary categories"
        ON public.tertiary_categories FOR UPDATE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own tertiary categories"
        ON public.tertiary_categories FOR DELETE
        USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 11. 创建触发器函数：自动更新 updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加 updated_at 触发器 (只在不存在时创建)
DO $$ BEGIN
    CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_tasks_updated_at
        BEFORE UPDATE ON public.tasks
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_daily_records_updated_at
        BEFORE UPDATE ON public.daily_records
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_rewards_updated_at
        BEFORE UPDATE ON public.rewards
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_point_adjustments_updated_at
        BEFORE UPDATE ON public.point_adjustments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_primary_categories_updated_at
        BEFORE UPDATE ON public.primary_categories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_secondary_categories_updated_at
        BEFORE UPDATE ON public.secondary_categories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_tertiary_categories_updated_at
        BEFORE UPDATE ON public.tertiary_categories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 12. 创建数据迁移辅助函数：为新用户初始化默认分类
-- ============================================
CREATE OR REPLACE FUNCTION public.initialize_default_categories_for_user(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_primary_id UUID;
    v_secondary_id UUID;
BEGIN
    INSERT INTO public.primary_categories (user_id, name, icon, key) VALUES
        (p_user_id, '学习', '📚', 'study'),
        (p_user_id, '运动', '⚽', 'sport'),
        (p_user_id, '艺术', '🎨', 'art'),
        (p_user_id, '其他', '📌', 'other')
    ON CONFLICT (user_id, key) DO NOTHING;
    
    SELECT id INTO v_primary_id FROM public.primary_categories WHERE user_id = p_user_id AND key = 'study' LIMIT 1;
    IF v_primary_id IS NOT NULL THEN
        INSERT INTO public.secondary_categories (user_id, primary_category_id, name, icon) VALUES
            (p_user_id, v_primary_id, '语文', '📖'),
            (p_user_id, v_primary_id, '数学', '🔢'),
            (p_user_id, v_primary_id, '英语', '🌍')
        ON CONFLICT DO NOTHING;
        
        SELECT id INTO v_secondary_id FROM public.secondary_categories WHERE user_id = p_user_id AND primary_category_id = v_primary_id AND name = '语文' LIMIT 1;
        IF v_secondary_id IS NOT NULL THEN
            INSERT INTO public.tertiary_categories (user_id, secondary_category_id, name, icon, default_points) VALUES
                (p_user_id, v_secondary_id, '听写', '📝', 1),
                (p_user_id, v_secondary_id, '预习', '📚', 2),
                (p_user_id, v_secondary_id, '复习', '📖', 2),
                (p_user_id, v_secondary_id, '背诵', '🎯', 3)
            ON CONFLICT DO NOTHING;
        END IF;
        
        SELECT id INTO v_secondary_id FROM public.secondary_categories WHERE user_id = p_user_id AND primary_category_id = v_primary_id AND name = '数学' LIMIT 1;
        IF v_secondary_id IS NOT NULL THEN
            INSERT INTO public.tertiary_categories (user_id, secondary_category_id, name, icon, default_points) VALUES
                (p_user_id, v_secondary_id, '口算', '🧮', 1),
                (p_user_id, v_secondary_id, '应用题', '📐', 2)
            ON CONFLICT DO NOTHING;
        END IF;
        
        SELECT id INTO v_secondary_id FROM public.secondary_categories WHERE user_id = p_user_id AND primary_category_id = v_primary_id AND name = '英语' LIMIT 1;
        IF v_secondary_id IS NOT NULL THEN
            INSERT INTO public.tertiary_categories (user_id, secondary_category_id, name, icon, default_points) VALUES
                (p_user_id, v_secondary_id, '单词', '📋', 1),
                (p_user_id, v_secondary_id, '阅读', '📕', 2)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    SELECT id INTO v_primary_id FROM public.primary_categories WHERE user_id = p_user_id AND key = 'sport' LIMIT 1;
    IF v_primary_id IS NOT NULL THEN
        INSERT INTO public.secondary_categories (user_id, primary_category_id, name, icon) VALUES
            (p_user_id, v_primary_id, '跑步', '🏃'),
            (p_user_id, v_primary_id, '跳绳', '🪢'),
            (p_user_id, v_primary_id, '球类', '⚽')
        ON CONFLICT DO NOTHING;
    END IF;
    
    SELECT id INTO v_primary_id FROM public.primary_categories WHERE user_id = p_user_id AND key = 'art' LIMIT 1;
    IF v_primary_id IS NOT NULL THEN
        INSERT INTO public.secondary_categories (user_id, primary_category_id, name, icon) VALUES
            (p_user_id, v_primary_id, '绘画', '🎨'),
            (p_user_id, v_primary_id, '音乐', '🎵')
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. 创建触发器：新用户自动创建 profile 和初始化分类
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
    
    PERFORM public.initialize_default_categories_for_user(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 监听 auth.users 插入事件 (只在不存在时创建)
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 14. 创建视图：获取用户的完整分类层次结构
-- ============================================
CREATE OR REPLACE VIEW public.user_category_hierarchy AS
SELECT
    pc.user_id,
    pc.id AS primary_category_id,
    pc.name AS primary_category_name,
    pc.icon AS primary_category_icon,
    pc.key AS primary_category_key,
    sc.id AS secondary_category_id,
    sc.name AS secondary_category_name,
    sc.icon AS secondary_category_icon,
    tc.id AS tertiary_category_id,
    tc.name AS tertiary_category_name,
    tc.icon AS tertiary_category_icon,
    tc.default_points
FROM public.primary_categories pc
LEFT JOIN public.secondary_categories sc ON pc.id = sc.primary_category_id
LEFT JOIN public.tertiary_categories tc ON sc.id = tc.secondary_category_id;

-- ============================================
-- 15. 创建索引优化查询性能 (只在不存在时创建)
-- ============================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND indexname = 'idx_tasks_user_id'
    ) THEN
        CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND indexname = 'idx_tasks_category'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'category'
    ) THEN
        CREATE INDEX idx_tasks_category ON public.tasks(category);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND indexname = 'idx_tasks_primary_category_id'
    ) THEN
        CREATE INDEX idx_tasks_primary_category_id ON public.tasks(primary_category_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND indexname = 'idx_tasks_secondary_category_id'
    ) THEN
        CREATE INDEX idx_tasks_secondary_category_id ON public.tasks(secondary_category_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND indexname = 'idx_tasks_tertiary_category_id'
    ) THEN
        CREATE INDEX idx_tasks_tertiary_category_id ON public.tasks(tertiary_category_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tasks' 
        AND indexname = 'idx_tasks_is_temporary'
    ) THEN
        CREATE INDEX idx_tasks_is_temporary ON public.tasks(is_temporary);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'daily_records' 
        AND indexname = 'idx_daily_records_user_id'
    ) THEN
        CREATE INDEX idx_daily_records_user_id ON public.daily_records(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'daily_records' 
        AND indexname = 'idx_daily_records_date'
    ) THEN
        CREATE INDEX idx_daily_records_date ON public.daily_records(date);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'rewards' 
        AND indexname = 'idx_rewards_user_id'
    ) THEN
        CREATE INDEX idx_rewards_user_id ON public.rewards(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'redemptions' 
        AND indexname = 'idx_redemptions_user_id'
    ) THEN
        CREATE INDEX idx_redemptions_user_id ON public.redemptions(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'badges' 
        AND indexname = 'idx_badges_user_id'
    ) THEN
        CREATE INDEX idx_badges_user_id ON public.badges(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND indexname = 'idx_profiles_parent_id'
    ) THEN
        CREATE INDEX idx_profiles_parent_id ON public.profiles(parent_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'point_adjustments' 
        AND indexname = 'idx_point_adjustments_user_id'
    ) THEN
        CREATE INDEX idx_point_adjustments_user_id ON public.point_adjustments(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'point_adjustments' 
        AND indexname = 'idx_point_adjustments_created_at'
    ) THEN
        CREATE INDEX idx_point_adjustments_created_at ON public.point_adjustments(created_at);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'primary_categories' 
        AND indexname = 'idx_primary_categories_user_id'
    ) THEN
        CREATE INDEX idx_primary_categories_user_id ON public.primary_categories(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'primary_categories' 
        AND indexname = 'idx_primary_categories_key'
    ) THEN
        CREATE INDEX idx_primary_categories_key ON public.primary_categories(key);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'secondary_categories' 
        AND indexname = 'idx_secondary_categories_user_id'
    ) THEN
        CREATE INDEX idx_secondary_categories_user_id ON public.secondary_categories(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'secondary_categories' 
        AND indexname = 'idx_secondary_categories_primary_id'
    ) THEN
        CREATE INDEX idx_secondary_categories_primary_id ON public.secondary_categories(primary_category_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tertiary_categories' 
        AND indexname = 'idx_tertiary_categories_user_id'
    ) THEN
        CREATE INDEX idx_tertiary_categories_user_id ON public.tertiary_categories(user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'tertiary_categories' 
        AND indexname = 'idx_tertiary_categories_secondary_id'
    ) THEN
        CREATE INDEX idx_tertiary_categories_secondary_id ON public.tertiary_categories(secondary_category_id);
    END IF;
END $$;

-- ============================================
-- 16. 创建函数：计算用户总积分
-- ============================================
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

-- ============================================
-- 17. 创建函数：更新用户总积分
-- ============================================
CREATE OR REPLACE FUNCTION update_user_total_points(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET total_points = calculate_user_total_points(p_user_id)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 18. 创建触发器函数：当积分调整记录变化时更新总积分
-- ============================================
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

-- ============================================
-- 19. 创建触发器函数：当兑换记录变化时更新总积分
-- ============================================
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

-- ============================================
-- 20. 创建触发器函数：当每日记录变化时更新总积分
-- ============================================
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
-- 21. 创建积分同步触发器
-- ============================================
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_point_adjustment_created ON public.point_adjustments;
    CREATE TRIGGER on_point_adjustment_created
        AFTER INSERT OR UPDATE OR DELETE ON public.point_adjustments
        FOR EACH ROW EXECUTE FUNCTION handle_point_adjustment();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_redemption_created ON public.redemptions;
    CREATE TRIGGER on_redemption_created
        AFTER INSERT OR UPDATE OR DELETE ON public.redemptions
        FOR EACH ROW EXECUTE FUNCTION handle_redemption();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_daily_record_changed ON public.daily_records;
    CREATE TRIGGER on_daily_record_changed
        AFTER INSERT OR UPDATE OR DELETE ON public.daily_records
        FOR EACH ROW EXECUTE FUNCTION handle_daily_record_change();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 22. 更新现有用户的总积分（一次性修复）
-- ============================================
UPDATE public.profiles
SET total_points = calculate_user_total_points(id);

-- ============================================
-- 添加表注释
-- ============================================
COMMENT ON TABLE public.profiles IS '用户资料表，与 auth.users 一对一关联';
COMMENT ON COLUMN public.profiles.phone IS '用户绑定的手机号';
COMMENT ON TABLE public.tasks IS '作业任务库，每个用户有自己的任务';
COMMENT ON TABLE public.daily_records IS '每日作业完成记录';
COMMENT ON TABLE public.rewards IS '奖品库，每个用户有自己的奖品设置';
COMMENT ON TABLE public.redemptions IS '奖品兑换记录';
COMMENT ON TABLE public.badges IS '用户解锁的徽章记录';
COMMENT ON TABLE public.point_adjustments IS '积分调整记录表';
COMMENT ON TABLE public.primary_categories IS '一级分类表（学习、运动、艺术等）';
COMMENT ON TABLE public.secondary_categories IS '二级分类表（语文、数学等）';
COMMENT ON TABLE public.tertiary_categories IS '三级分类表（听写、预习等）';
COMMENT ON VIEW public.user_category_hierarchy IS '用户分类层次结构视图，方便查询完整的三级分类';

-- ============================================
-- 完整 Schema 部署完成！
-- ============================================
SELECT '完整数据库 Schema 部署完成！' AS status;
