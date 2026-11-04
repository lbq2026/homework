-- ============================================================
-- 【数据迁移】将全部存量兑换记录状态改为「兑换成功」(fulfilled)
--
-- 背景：兑换流程已改为「家长一次确认即兑换成功」（approveRedemption
-- 直接写 fulfilled，无需二次「标记已兑现」）。历史数据中残留的
-- pending / approved / rejected 状态统一归一为 fulfilled。
--
-- 注意：
--   1. 执行后所有兑换均按「已扣分」口径计算（前端 calculateTotalPoints
--      对 fulfilled 扣分、pending 冻结、rejected 退还）——pending 记录
--      也会被扣分，请确认这正是你想要的。
--   2. 幂等，可重复执行。
--   3. 执行后刷新应用页面（登录态会自动全量拉取云端数据）。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 全选复制 → Run
-- ============================================================

-- 1. 全部存量记录统一置为 fulfilled（IS DISTINCT FROM 保证幂等且不误触触发器）
UPDATE public.redemptions
SET status = 'fulfilled'
WHERE status IS DISTINCT FROM 'fulfilled';

-- 2. 兑换流程语义变更后，新记录仍从 pending 起步、家长一键确认到 fulfilled；
--    approved 仅作历史兼容保留在枚举中。此处可选：收紧默认值注释，无结构变更。

-- 3. 通知 PostgREST 刷新 schema cache（保持与其他脚本一致，虽无结构变更）
NOTIFY pgrst, 'reload schema';

-- 4. 校验：执行后应只剩 fulfilled 一种状态
SELECT status, count(*) FROM public.redemptions GROUP BY status;
