/**
 * storage.ts 纯函数单元测试
 * 覆盖：积分计算 / 连续天数 / 分类统计 / 徽章解锁 / 今日记录
 */
import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState } from '@/types';
import { getTodayStr, getYesterdayStr } from '@/utils/date';
import {
  calculateTotalPoints,
  calculateStreak,
  getCategoryStats,
  getTotalCompletedTasks,
  checkAndUnlockBadges,
  getOrCreateTodayRecord,
  resetTodayRecord,
} from '@/utils/storage';

/** 构造最小可用 AppState */
const makeState = (overrides: Partial<AppState> = {}): AppState => ({
  primaryCategories: [],
  secondaryCategories: [],
  tertiaryCategories: [],
  tasks: [],
  dailyRecords: [],
  rewards: [],
  redemptions: [],
  badges: [
    { id: 'streak_3', name: '连续3天', description: '连续3天完成所有作业', icon: '🔥' },
    { id: 'streak_7', name: '连续7天', description: '连续7天完成所有作业', icon: '🔥🔥' },
    { id: 'streak_15', name: '连续15天', description: '连续15天完成所有作业', icon: '🔥🔥🔥' },
    { id: 'points_50', name: '积分新手', description: '累计获得50积分', icon: '💰' },
    { id: 'first_reward', name: '首次兑换', description: '第一次兑换奖品', icon: '🎁' },
  ],
  pointAdjustments: [],
  totalPoints: 0,
  settings: { soundEnabled: true, lastVisitDate: getTodayStr() },
  ...overrides,
});

/** 构造一个已完成/未完成的每日记录（totalPoints 默认按任务完成态自洽计算） */
const makeDailyRecord = (date: string, tasks: Array<{ taskId: string; completed?: boolean }>, totalPoints?: number) => ({
  date,
  tasks: tasks.map(t => ({
    id: `dt-${date}-${t.taskId}`,
    taskId: t.taskId,
    completed: t.completed ?? false,
  })),
  // calculateTotalPoints 对 totalPoints 有值的记录走缓存快路径；
  // 派生回退分支（按任务定义逐个累计）服务于旧数据/无缓存记录，
  // 因此默认传 undefined 触发派生计算，与生产语义保持一致。
  totalPoints: totalPoints as unknown as number,
});

describe('calculateTotalPoints', () => {
  it('空状态为 0', () => {
    expect(calculateTotalPoints(makeState())).toBe(0);
  });

  it('完成任务按 basePoints 累计', () => {
    const state = makeState({
      tasks: [{ id: 't1', name: '数学', basePoints: 5, icon: '📚', createdAt: 1 }],
      dailyRecords: [makeDailyRecord(getTodayStr(), [{ taskId: 't1', completed: true }])],
    });
    expect(calculateTotalPoints(state)).toBe(5);
  });

  it('兑换扣除积分', () => {
    const state = makeState({
      tasks: [{ id: 't1', name: '数学', basePoints: 10, icon: '📚', createdAt: 1 }],
      dailyRecords: [makeDailyRecord(getTodayStr(), [{ taskId: 't1', completed: true }])],
      redemptions: [{ id: 'r1', rewardId: 'rw1', rewardName: '玩具', points: 4, redeemedAt: 1 }],
    });
    expect(calculateTotalPoints(state)).toBe(6);
  });

  it('积分调整累加（含负数）', () => {
    const state = makeState({
      pointAdjustments: [
        { id: 'p1', points: 10, reason: '奖励', adjustedAt: 1 },
        { id: 'p2', points: -3, reason: '扣除', adjustedAt: 2 },
      ],
    });
    expect(calculateTotalPoints(state)).toBe(7);
  });

  it('结果不为负数（钳制到 0）', () => {
    const state = makeState({
      redemptions: [{ id: 'r1', rewardId: 'rw1', rewardName: '玩具', points: 100, redeemedAt: 1 }],
    });
    expect(calculateTotalPoints(state)).toBe(0);
  });
});

describe('calculateStreak', () => {
  const fullDay = (date: string) => makeDailyRecord(date, [{ taskId: 't1', completed: true }]);

  it('无记录返回 0', () => {
    expect(calculateStreak(makeState())).toBe(0);
  });

  it('仅今天完成返回 1', () => {
    const state = makeState({ dailyRecords: [fullDay(getTodayStr())] });
    expect(calculateStreak(state)).toBe(1);
  });

  it('今天 + 昨天连续返回 2', () => {
    const state = makeState({
      dailyRecords: [fullDay(getYesterdayStr()), fullDay(getTodayStr())],
    });
    expect(calculateStreak(state)).toBe(2);
  });

  it('连续三天返回 3', () => {
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${dd}`;
    };
    const state = makeState({
      dailyRecords: [fullDay(day(2)), fullDay(day(1)), fullDay(day(0))],
    });
    expect(calculateStreak(state)).toBe(3);
  });

  it('断档后仅计算最近连续段', () => {
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${dd}`;
    };
    // 今天、昨天、3 天前（中间断 2 天）→ 连续 2
    const state = makeState({
      dailyRecords: [fullDay(day(3)), fullDay(day(1)), fullDay(day(0))],
    });
    expect(calculateStreak(state)).toBe(2);
  });

  it('最近记录既非今天也非昨天返回 0', () => {
    const state = makeState({ dailyRecords: [fullDay('2020-01-01')] });
    expect(calculateStreak(state)).toBe(0);
  });
});

describe('getCategoryStats / getTotalCompletedTasks', () => {
  it('按任务 category 统计完成次数', () => {
    const state = makeState({
      tasks: [
        { id: 't1', name: '跑步', basePoints: 2, icon: '🏃', category: 'sport', createdAt: 1 },
        { id: 't2', name: '读书', basePoints: 2, icon: '📖', category: 'study', createdAt: 2 },
      ],
      dailyRecords: [
        makeDailyRecord(getTodayStr(), [{ taskId: 't1', completed: true }, { taskId: 't2', completed: true }]),
      ],
    });
    expect(getCategoryStats(state)).toMatchObject({ sport: 1, study: 1 });
    expect(getTotalCompletedTasks(state)).toBe(2);
  });
});

describe('checkAndUnlockBadges', () => {
  it('连续 3 天解锁 streak_3', () => {
    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${dd}`;
    };
    const state = makeState({
      dailyRecords: [day(0), day(1), day(2)].map(d =>
        makeDailyRecord(d, [{ taskId: 't1', completed: true }])
      ),
    });
    expect(checkAndUnlockBadges(state)).toContain('streak_3');
  });

  it('首次兑换解锁 first_reward', () => {
    const state = makeState({
      redemptions: [{ id: 'r1', rewardId: 'rw1', rewardName: '玩具', points: 5, redeemedAt: 1 }],
    });
    expect(checkAndUnlockBadges(state)).toContain('first_reward');
  });

  it('已解锁徽章不重复返回', () => {
    const state = makeState({
      badges: [
        { id: 'first_reward', name: '首次兑换', description: '第一次兑换奖品', icon: '🎁', unlockedAt: 1 },
      ],
      redemptions: [{ id: 'r1', rewardId: 'rw1', rewardName: '玩具', points: 5, redeemedAt: 1 }],
    });
    expect(checkAndUnlockBadges(state)).not.toContain('first_reward');
  });
});

describe('getOrCreateTodayRecord / resetTodayRecord', () => {
  beforeEach(() => {
    // storage.ts 的 saveState 依赖 localStorage，测试环境手动 stub
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      },
      configurable: true,
    });
  });

  it('无今日记录时创建', () => {
    const record = getOrCreateTodayRecord(makeState());
    expect(record.date).toBe(getTodayStr());
    expect(record.tasks).toEqual([]);
  });

  it('有今日记录时复用', () => {
    const today = getTodayStr();
    const state = makeState({ dailyRecords: [makeDailyRecord(today, [])] });
    const record = getOrCreateTodayRecord(state);
    expect(record.date).toBe(today);
  });

  it('resetTodayRecord 清空今日记录', () => {
    const today = getTodayStr();
    const state = makeState({ dailyRecords: [makeDailyRecord(today, [{ taskId: 't1', completed: true }])] });
    const next = resetTodayRecord(state);
    expect(next.dailyRecords).toEqual([]);
  });
});
