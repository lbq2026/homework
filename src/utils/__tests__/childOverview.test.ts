import { describe, it, expect } from 'vitest';
import { aggregateChildOverview, toPendingRedemptionItems } from '../childOverview';

const child = (records: Array<{ date: string; totalPoints: number; done: number; total: number }>, redemptions: Array<{ points: number; status: string }>) => ({
  dailyRecords: records.map(r => ({
    date: r.date,
    total_points: r.totalPoints,
    tasks: Array.from({ length: r.total }, (_, i) => ({ completed: i < r.done })),
  })),
  redemptions,
});

describe('aggregateChildOverview', () => {
  const today = '2026-10-30'; // 周五

  it('空孩子列表返回全 0', () => {
    const r = aggregateChildOverview([], today);
    expect(r).toEqual({ todayDone: 0, todayTotal: 0, weekPoints: 0, pendingCount: 0 });
  });

  it('单孩子：今日进度取当日记录', () => {
    const r = aggregateChildOverview([child(
      [{ date: today, totalPoints: 10, done: 3, total: 5 }],
      [],
    )], today);
    expect(r.todayDone).toBe(3);
    expect(r.todayTotal).toBe(5);
  });

  it('多孩子：今日进度与待审核为求和', () => {
    const r = aggregateChildOverview([
      child([{ date: today, totalPoints: 10, done: 2, total: 4 }], [{ points: 5, status: 'pending' }]),
      child([{ date: today, totalPoints: 8, done: 1, total: 3 }], [{ points: 3, status: 'pending' }, { points: 2, status: 'fulfilled' }]),
    ], today);
    expect(r.todayDone).toBe(3);
    expect(r.todayTotal).toBe(7);
    expect(r.pendingCount).toBe(2);
  });

  it('本周积分只累计本周一至当日的记录', () => {
    const r = aggregateChildOverview([child(
      [
        { date: '2026-10-26', totalPoints: 4, done: 1, total: 1 }, // 周一（本周）
        { date: today, totalPoints: 6, done: 1, total: 1 },        // 周五（本周）
        { date: '2026-10-25', totalPoints: 100, done: 1, total: 1 }, // 周日（上周，不计）
      ],
      [],
    )], today);
    expect(r.weekPoints).toBe(10);
  });

  it('今日无记录时 todayDone/todayTotal 为 0', () => {
    const r = aggregateChildOverview([child(
      [{ date: '2026-10-25', totalPoints: 10, done: 2, total: 4 }],
      [],
    )], today);
    expect(r.todayDone).toBe(0);
    expect(r.todayTotal).toBe(0);
  });
});

describe('toPendingRedemptionItems', () => {
  const rows = [
    { id: 'r1', user_id: 'c1', reward_name: '看动画片 30 分钟', points: 20, created_at: '2026-10-30T10:00:00Z' },
    { id: 'r2', user_id: 'unknown', reward_name: '冰淇淋', points: 10, created_at: '2026-10-30T09:00:00Z' },
  ];
  const children = [{ id: 'c1', username: '小宝' }];

  it('映射孩子名并按时间倒序排列', () => {
    const items = toPendingRedemptionItems(rows, children);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ id: 'r1', rewardName: '看动画片 30 分钟', points: 20, childName: '小宝', redeemedAt: Date.parse('2026-10-30T10:00:00Z') });
    expect(items[1].childName).toBe('未知孩子');
  });

  it('空输入返回空数组', () => {
    expect(toPendingRedemptionItems([], [])).toEqual([]);
  });
});
