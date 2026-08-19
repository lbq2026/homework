import type { AppState, Badge, BadgeType, DailyRecord, RepeatRule, TertiaryCategory } from '@/types';
import { getTodayStr, getYesterdayStr, daysBetween, formatDate } from './date';

const STORAGE_KEY = 'littleWarriorKingdom_v1';

const DEFAULT_BADGES: Badge[] = [
  { id: 'streak_3', name: '连续3天', description: '连续3天完成所有作业', icon: '🔥' },
  { id: 'streak_7', name: '连续7天', description: '连续7天完成所有作业', icon: '🔥🔥' },
  { id: 'streak_15', name: '连续15天', description: '连续15天完成所有作业', icon: '🔥🔥🔥' },
  { id: 'sport_master', name: '运动达人', description: '运动类作业完成20次', icon: '⚽' },
  { id: 'study_master', name: '学习之星', description: '学习类作业完成30次', icon: '📚' },
  { id: 'art_master', name: '艺术天才', description: '艺术类作业完成15次', icon: '🎨' },
  { id: 'points_50', name: '积分新手', description: '累计获得50积分', icon: '💰' },
  { id: 'points_100', name: '积分达人', description: '累计获得100积分', icon: '💎' },
  { id: 'points_200', name: '积分王者', description: '累计获得200积分', icon: '👑' },
  { id: 'points_500', name: '积分传奇', description: '累计获得500积分', icon: '🏆' },
  { id: 'first_reward', name: '首次兑换', description: '第一次兑换奖品', icon: '🎁' },
  { id: 'task_master', name: '任务大师', description: '累计完成100个任务', icon: '⭐' },
];

const getInitialState = (): AppState => ({
  primaryCategories: [],
  secondaryCategories: [],
  tertiaryCategories: [],
  tasks: [],
  dailyRecords: [],
  rewards: [],
  redemptions: [],
  badges: DEFAULT_BADGES,
  customBadges: [],
  pointAdjustments: [],
  totalPoints: 0,
  settings: {
    soundEnabled: true,
    lastVisitDate: getTodayStr(),
    streakThreshold: 0.8,
    makeupCards: 0,
    usedMakeupDates: [],
    remindEnabled: false,
    remindTime: '19:00',
  },
});

/** 补签卡单价（积分） */
export const MAKEUP_CARD_PRICE = 20;

export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const state = { ...getInitialState(), ...parsed };
      if (!state.badges || state.badges.length === 0) {
        state.badges = DEFAULT_BADGES;
      }
      state.primaryCategories = state.primaryCategories || [];
      state.secondaryCategories = state.secondaryCategories || [];
      state.tertiaryCategories = state.tertiaryCategories || [];
      state.pointAdjustments = state.pointAdjustments || [];
      state.customBadges = state.customBadges || [];
      // 兼容旧数据：补签卡相关字段缺省补默认值
      state.settings = {
        ...getInitialState().settings,
        ...(state.settings || {}),
      };
      return state;
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
  return getInitialState();
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
};

export const exportData = (state: AppState): string => {
  return JSON.stringify(state, null, 2);
};

export const importData = (jsonString: string): AppState | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed === 'object' && parsed !== null) {
      return { ...getInitialState(), ...parsed };
    }
  } catch (error) {
    console.error('Failed to import data:', error);
  }
  return null;
};

export const resetAllData = (): AppState => {
  const initial = getInitialState();
  saveState(initial);
  return initial;
};

export const resetTodayRecord = (state: AppState): AppState => {
  const today = getTodayStr();
  const newState = {
    ...state,
    dailyRecords: state.dailyRecords.filter(r => r.date !== today),
  };
  saveState(newState);
  return newState;
};

export const getTodayRecord = (state: AppState): DailyRecord | undefined => {
  const today = getTodayStr();
  return state.dailyRecords.find(r => r.date === today);
};

export const getOrCreateTodayRecord = (state: AppState): DailyRecord => {
  const today = getTodayStr();
  let record = state.dailyRecords.find(r => r.date === today);
  if (!record) {
    record = {
      date: today,
      tasks: [],
      totalPoints: 0,
    };
  }
  return record;
};

/** 判断某天是否"达成"：完成率 ≥ 阈值（默认 0.8）或已使用补签卡 */
export const isDayAchieved = (state: AppState, date: string): boolean => {
  if (state.settings.usedMakeupDates?.includes(date)) return true;

  const record = state.dailyRecords.find(r => r.date === date);
  if (!record || record.tasks.length === 0) return false;

  const completed = record.tasks.filter(t => t.completed).length;
  const threshold = state.settings.streakThreshold ?? 0.8;
  return completed / record.tasks.length >= threshold;
};

export const calculateStreak = (state: AppState): number => {
  // 达成日 = 完成率达标的日期 ∪ 补签卡补签的日期
  const achievedSet = new Set<string>([
    ...state.dailyRecords.filter(r => isDayAchieved(state, r.date)).map(r => r.date),
    ...(state.settings.usedMakeupDates || []),
  ]);
  const sortedRecords = [...achievedSet]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (sortedRecords.length === 0) return 0;

  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  const latestRecord = sortedRecords[0];
  if (latestRecord !== today && latestRecord !== yesterday) {
    return 0;
  }

  // 从最新记录向前按日历日连续计数（相邻日期差 1 天）
  let streak = 1;
  for (let i = 1; i < sortedRecords.length; i++) {
    if (daysBetween(sortedRecords[i], sortedRecords[i - 1]) === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

export const getCategoryStats = (state: AppState): Record<string, number> => {
  const stats: Record<string, number> = { study: 0, sport: 0, art: 0, other: 0 };
  
  state.dailyRecords.forEach(record => {
    record.tasks.forEach(task => {
      if (task.completed) {
        const taskDef = state.tasks.find(t => t.id === task.taskId);
        if (taskDef) {
          const category = taskDef.category || 'other';
          stats[category] = (stats[category] || 0) + 1;
        }
      }
    });
  });
  
  return stats;
};

export interface PrimaryCategoryStats {
  [primaryCategoryId: string]: {
    name: string;
    icon: string;
    total: number;
    secondaryCategories: {
      [secondaryCategoryId: string]: {
        name: string;
        icon: string;
        total: number;
      };
    };
  };
}

export const getPrimaryCategoryStats = (state: AppState): PrimaryCategoryStats => {
  const stats: PrimaryCategoryStats = {};
  
  state.primaryCategories.forEach(pc => {
    stats[pc.id] = {
      name: pc.name,
      icon: pc.icon,
      total: 0,
      secondaryCategories: {}
    };
    
    state.secondaryCategories
      .filter(sc => sc.primaryCategoryId === pc.id)
      .forEach(sc => {
        stats[pc.id].secondaryCategories[sc.id] = {
          name: sc.name,
          icon: sc.icon,
          total: 0
        };
      });
  });
  
  state.dailyRecords.forEach(record => {
    record.tasks.forEach(task => {
      if (task.completed) {
        const taskDef = state.tasks.find(t => t.id === task.taskId);
        if (taskDef && taskDef.primaryCategoryId) {
          const primaryCatId = taskDef.primaryCategoryId;
          if (stats[primaryCatId]) {
            stats[primaryCatId].total++;
            if (taskDef.secondaryCategoryId && stats[primaryCatId].secondaryCategories[taskDef.secondaryCategoryId]) {
              stats[primaryCatId].secondaryCategories[taskDef.secondaryCategoryId].total++;
            }
          }
        } else {
          const tertiaryCat = state.tertiaryCategories.find(c => c.id === task.taskId);
          if (tertiaryCat) {
            const secondaryCat = state.secondaryCategories.find(sc => sc.id === tertiaryCat.secondaryCategoryId);
            if (secondaryCat) {
              const primaryCat = state.primaryCategories.find(pc => pc.id === secondaryCat.primaryCategoryId);
              if (primaryCat) {
                if (!stats[primaryCat.id]) {
                  stats[primaryCat.id] = {
                    name: primaryCat.name,
                    icon: primaryCat.icon,
                    total: 0,
                    secondaryCategories: {}
                  };
                }
                stats[primaryCat.id].total++;
                
                if (!stats[primaryCat.id].secondaryCategories[secondaryCat.id]) {
                  stats[primaryCat.id].secondaryCategories[secondaryCat.id] = {
                    name: secondaryCat.name,
                    icon: secondaryCat.icon,
                    total: 0
                  };
                }
                stats[primaryCat.id].secondaryCategories[secondaryCat.id].total++;
              }
            }
          }
        }
      }
    });
  });
  
  return stats;
};

export const getTotalCompletedTasks = (state: AppState): number => {
  return state.dailyRecords.reduce((total, record) => {
    return total + record.tasks.filter(t => t.completed).length;
  }, 0);
};

export const checkAndUnlockBadges = (state: AppState): BadgeType[] => {
  const newlyUnlocked: BadgeType[] = [];
  const streak = calculateStreak(state);
  const categoryStats = getCategoryStats(state);
  const totalTasks = getTotalCompletedTasks(state);
  
  if (streak >= 3 && !state.badges.find(b => b.id === 'streak_3')?.unlockedAt) {
    newlyUnlocked.push('streak_3');
  }
  if (streak >= 7 && !state.badges.find(b => b.id === 'streak_7')?.unlockedAt) {
    newlyUnlocked.push('streak_7');
  }
  if (streak >= 15 && !state.badges.find(b => b.id === 'streak_15')?.unlockedAt) {
    newlyUnlocked.push('streak_15');
  }
  
  if (categoryStats.sport >= 20 && !state.badges.find(b => b.id === 'sport_master')?.unlockedAt) {
    newlyUnlocked.push('sport_master');
  }
  if (categoryStats.study >= 30 && !state.badges.find(b => b.id === 'study_master')?.unlockedAt) {
    newlyUnlocked.push('study_master');
  }
  if (categoryStats.art >= 15 && !state.badges.find(b => b.id === 'art_master')?.unlockedAt) {
    newlyUnlocked.push('art_master');
  }
  
  if (state.totalPoints >= 50 && !state.badges.find(b => b.id === 'points_50')?.unlockedAt) {
    newlyUnlocked.push('points_50');
  }
  if (state.totalPoints >= 100 && !state.badges.find(b => b.id === 'points_100')?.unlockedAt) {
    newlyUnlocked.push('points_100');
  }
  if (state.totalPoints >= 200 && !state.badges.find(b => b.id === 'points_200')?.unlockedAt) {
    newlyUnlocked.push('points_200');
  }
  if (state.totalPoints >= 500 && !state.badges.find(b => b.id === 'points_500')?.unlockedAt) {
    newlyUnlocked.push('points_500');
  }
  
  if (totalTasks >= 100 && !state.badges.find(b => b.id === 'task_master')?.unlockedAt) {
    newlyUnlocked.push('task_master');
  }
  
  if (state.redemptions.length >= 1 && !state.badges.find(b => b.id === 'first_reward')?.unlockedAt) {
    newlyUnlocked.push('first_reward');
  }
  
  return newlyUnlocked;
};

/** 检查自定义徽章（P2-2）：返回新解锁的自定义徽章 id */
export const checkCustomBadges = (state: AppState): string[] => {
  const newlyUnlocked: string[] = [];
  const totalTasks = getTotalCompletedTasks(state);
  const streak = calculateStreak(state);
  const totalPoints = calculateTotalPoints(state);

  state.customBadges.forEach(badge => {
    if (badge.unlockedAt) return;
    let met = false;
    switch (badge.conditionType) {
      case 'tasks': met = totalTasks >= badge.conditionValue; break;
      case 'points': met = totalPoints >= badge.conditionValue; break;
      case 'streak': met = streak >= badge.conditionValue; break;
    }
    if (met) newlyUnlocked.push(badge.id);
  });
  return newlyUnlocked;
};

export const calculateTotalPoints = (state: AppState): number => {
  let total = 0;
  
  state.dailyRecords.forEach(record => {
    if (record.totalPoints !== undefined && record.totalPoints !== null) {
      total += record.totalPoints;
    } else {
      let recordPoints = 0;
      record.tasks.forEach(task => {
        if (task.completed) {
          const taskDef = state.tasks.find(t => t.id === task.taskId);
          const tertiaryCat = state.tertiaryCategories.find(c => c.id === task.taskId);
          if (taskDef) {
            recordPoints += taskDef.basePoints;
          } else if (tertiaryCat) {
            recordPoints += tertiaryCat.defaultPoints;
          }
        }
      });
      total += recordPoints;
    }
  });
  
  // 仅扣除已确认/已兑现的兑换；pending（冻结中）与 rejected（驳回）不扣分；
  // 旧数据无 status 字段视为已扣分（approved），保持兼容
  state.redemptions.forEach(redemption => {
    const s = redemption.status;
    if (s === 'pending' || s === 'rejected') return;
    total -= redemption.points;
  });
  
  state.pointAdjustments.forEach(adjustment => {
    total += adjustment.points;
  });
  
  return Math.max(0, total);
};

/** 冻结中的积分（pending 兑换未扣但已占用） */
export const getPendingRedemptionPoints = (state: AppState): number => {
  return state.redemptions
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.points, 0);
};

/** 可用积分 = 总积分 - 冻结积分（孩子兑换时以此判断额度） */
export const getAvailablePoints = (state: AppState): number => {
  return Math.max(0, calculateTotalPoints(state) - getPendingRedemptionPoints(state));
};

// ============================================
// 成长趋势与周报（P1-2）
// ============================================

/** 近 N 天每日获得积分趋势（按本地时区补全缺失日期为 0） */
export const getPointsTrend = (state: AppState, days: number): { date: string; points: number }[] => {
  const result: { date: string; points: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = formatDate(d);
    const record = state.dailyRecords.find(r => r.date === dateStr);
    result.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      points: record?.totalPoints || 0,
    });
  }
  return result;
};

/** 某周起始日（offset=0 本周，1 上周...），基于本地时区周一为一周开始 */
const getWeekStartDate = (offset = 0): Date => {
  const now = new Date();
  const day = now.getDay() || 7; // 周日=7，周一=1
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1) - offset * 7);
};

// ============================================
// 周期性任务（P1-3）
// ============================================

/** 判断重复规则在指定日期是否应出现 */
export const isRepeatDueOn = (rule: RepeatRule | undefined, date: Date): boolean => {
  if (!rule || rule.type === 'none') return false;
  if (rule.type === 'daily') return true;
  if (rule.type === 'weekly') {
    return rule.weekdays?.includes(date.getDay()) ?? false;
  }
  return false;
};

/** 今天应到期的三级分类任务（重复规则匹配今日） */
export const getTertiaryDueToday = (state: AppState, date = new Date()): TertiaryCategory[] => {
  return state.tertiaryCategories.filter(c => isRepeatDueOn(c.repeat, date));
};

/** 周报：本周 vs 上周 的完成数与积分（含完成率） */
export interface WeeklyReport {
  weekStart: string; // 本周一
  weekEnd: string;   // 本周日
  thisWeek: { completed: number; total: number; points: number };
  lastWeek: { completed: number; total: number; points: number };
}

export const getWeeklyReport = (state: AppState): WeeklyReport => {
  const weekStart = getWeekStartDate(0);
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const lastStart = getWeekStartDate(1);
  const lastEnd = new Date(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate() + 6);

  const sum = (from: Date, to: Date) => {
    let completed = 0;
    let total = 0;
    let points = 0;
    state.dailyRecords.forEach(r => {
      const t = new Date(r.date);
      if (t >= from && t <= to) {
        completed += r.tasks.filter(x => x.completed).length;
        total += r.tasks.length;
        points += r.totalPoints || 0;
      }
    });
    return { completed, total, points };
  };

  return {
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    thisWeek: sum(weekStart, weekEnd),
    lastWeek: sum(lastStart, lastEnd),
  };
};
