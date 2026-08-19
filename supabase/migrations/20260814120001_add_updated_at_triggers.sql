-- ============================================
-- 0002_add_updated_at_triggers.sql
-- 为含 updated_at 列的表统一添加自动更新时间触发器
-- 适用表：profiles / tasks / daily_records / rewards /
--         point_adjustments / primary_categories / secondary_categories / tertiary_categories
-- ============================================

-- 通用触发器函数
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加触发器（已存在则跳过）
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'profiles',
        'tasks',
        'daily_records',
        'rewards',
        'point_adjustments',
        'primary_categories',
        'secondary_categories',
        'tertiary_categories'
    ]
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS set_updated_at ON public.%I', tbl
        );
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
            tbl
        );
    END LOOP;
END;
$$;
