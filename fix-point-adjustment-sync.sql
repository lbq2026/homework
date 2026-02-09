-- ============================================
-- 修复：总积分自动计算逻辑
-- 总积分 = 作业完成积分 + 积分调整 - 兑换消耗
-- ============================================

-- 1. 创建函数：重新计算用户总积分
CREATE OR REPLACE FUNCTION calculate_user_total_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_task_points INTEGER;
  v_adjustment_points INTEGER;
  v_redemption_points INTEGER;
BEGIN
  -- 计算作业完成积分（来自 daily_records）
  SELECT COALESCE(SUM(total_points), 0)
  INTO v_task_points
  FROM public.daily_records
  WHERE user_id = p_user_id;
  
  -- 计算积分调整（来自 point_adjustments）
  SELECT COALESCE(SUM(points), 0)
  INTO v_adjustment_points
  FROM public.point_adjustments
  WHERE user_id = p_user_id;
  
  -- 计算兑换消耗（来自 redemptions）
  SELECT COALESCE(SUM(points), 0)
  INTO v_redemption_points
  FROM public.redemptions
  WHERE user_id = p_user_id;
  
  -- 返回总积分（确保不小于0）
  RETURN GREATEST(0, v_task_points + v_adjustment_points - v_redemption_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 创建函数：更新用户总积分
CREATE OR REPLACE FUNCTION update_user_total_points(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET total_points = calculate_user_total_points(p_user_id)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 删除旧的触发器（如果存在）
DROP TRIGGER IF EXISTS on_point_adjustment_created ON public.point_adjustments;
DROP TRIGGER IF EXISTS on_redemption_created ON public.redemptions;
DROP TRIGGER IF EXISTS on_daily_record_changed ON public.daily_records;

-- 4. 创建触发器函数：当积分调整记录插入时更新总积分
CREATE OR REPLACE FUNCTION handle_point_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_total_points(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 创建触发器函数：当兑换记录插入时更新总积分
CREATE OR REPLACE FUNCTION handle_redemption()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_total_points(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建触发器函数：当每日记录变化时更新总积分
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

-- 7. 创建触发器
CREATE TRIGGER on_point_adjustment_created
  AFTER INSERT OR UPDATE OR DELETE ON public.point_adjustments
  FOR EACH ROW EXECUTE FUNCTION handle_point_adjustment();

CREATE TRIGGER on_redemption_created
  AFTER INSERT OR UPDATE OR DELETE ON public.redemptions
  FOR EACH ROW EXECUTE FUNCTION handle_redemption();

CREATE TRIGGER on_daily_record_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.daily_records
  FOR EACH ROW EXECUTE FUNCTION handle_daily_record_change();

-- 8. 更新现有用户的总积分（一次性修复）
UPDATE public.profiles
SET total_points = calculate_user_total_points(id);

-- ============================================
-- 说明：
-- 1. 总积分实时计算：作业完成 + 积分调整 - 兑换消耗
-- 2. 任何积分相关表变化时，自动更新 profiles.total_points
-- 3. 已运行一次性脚本修复现有数据
-- ============================================

SELECT '总积分自动计算逻辑部署完成！' AS status;
