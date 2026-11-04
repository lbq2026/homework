/**
 * 家长中心孩子数据聚合（纯函数）
 * 输入为数据库原始行（fetchChildData 的 dailyRecords/redemptions 字段），
 * 聚合口径：今日进度=当日已完成/当日总数；本周积分=本周一至当日 total_points 之和；
 * 待审核数=status==='pending' 的兑换数。
 */

import { formatDate } from './date';

export interface ChildDailyRecordRow {
  date: string;
  total_points?: number | null;
  tasks?: Array<{ completed?: boolean } | null> | null;
}

export interface ChildRedemptionRow {
  id: string;
  user_id?: string | null;
  reward_name?: string | null;
  points?: number | null;
  status?: string | null;
  created_at?: string | null;
}

export interface ChildDataFragment {
  dailyRecords: ChildDailyRecordRow[];
  redemptions: ChildRedemptionRow[];
}

export interface ChildOverviewTotals {
  todayDone: number;
  todayTotal: number;
  weekPoints: number;
  pendingCount: number;
}

export interface PendingRedemptionItem {
  id: string;
  rewardName: string;
  points: number;
  childName: string;
  redeemedAt: number;
}

/** 本周一的 ISO 日期（周一为一周起点，与 utils/storage.getWeeklyReport 口径一致） */
export const getMondayOf = (today: string): string => {
  const d = new Date(`${today}T00:00:00`);
  const day = d.getDay(); // 0=周日
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return formatDate(d);
};

export const aggregateChildOverview = (
  childrenData: ChildDataFragment[],
  today: string,
): ChildOverviewTotals => {
  const weekStart = getMondayOf(today);
  let todayDone = 0;
  let todayTotal = 0;
  let weekPoints = 0;
  let pendingCount = 0;

  for (const child of childrenData) {
    for (const rec of child.dailyRecords) {
      const tasks = rec.tasks ?? [];
      const done = tasks.filter(t => t?.completed).length;
      if (rec.date === today) {
        todayDone += done;
        todayTotal += tasks.length;
      }
      if (rec.date >= weekStart && rec.date <= today) {
        weekPoints += rec.total_points || 0;
      }
    }
    pendingCount += child.redemptions.filter(r => r.status === 'pending').length;
  }

  return { todayDone, todayTotal, weekPoints, pendingCount };
};

export const toPendingRedemptionItems = (
  rows: ChildRedemptionRow[],
  children: Array<{ id: string; username: string | null }>,
): PendingRedemptionItem[] =>
  rows
    .map(r => ({
      id: r.id,
      rewardName: r.reward_name || '未知奖品',
      points: r.points || 0,
      childName: children.find(c => c.id === r.user_id)?.username || '未知孩子',
      redeemedAt: Date.parse(r.created_at || '') || 0,
    }))
    .sort((a, b) => b.redeemedAt - a.redeemedAt);
