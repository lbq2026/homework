import type { AppState, Badge, BadgeType, DailyRecord } from '@/types';

const STORAGE_KEY = 'littleWarriorKingdom_v1';

// 默认徽章定义
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

// 初始状态
const getInitialState = (): AppState => ({
  tasks: [],
  dailyRecords: [],
  rewards: [],
  redemptions: [],
  badges: DEFAULT_BADGES,
  pointAdjustments: [],
  totalPoints: 0,
  settings: {
    soundEnabled: true,
    lastVisitDate: new Date().toISOString().split('T')[0],
  },
});

// 加载数据
export const loadState = (): AppState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 确保徽章数据完整
      if (!parsed.badges || parsed.badges.length === 0) {
        parsed.badges = DEFAULT_BADGES;
      }
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
  return getInitialState();
};

// 保存数据
export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
};

// 导出数据为JSON文件
export const exportData = (state: AppState): string => {
  return JSON.stringify(state, null, 2);
};

// 从JSON文件导入数据
export const importData = (jsonString: string): AppState | null => {
  try {
    const parsed = JSON.parse(jsonString);
    // 验证数据结构
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as AppState;
    }
  } catch (error) {
    console.error('Failed to import data:', error);
  }
  return null;
};

// 重置所有数据
export const resetAllData = (): AppState => {
  const initial = getInitialState();
  saveState(initial);
  return initial;
};

// 重置今日记录
export const resetTodayRecord = (state: AppState): AppState => {
  const today = new Date().toISOString().split('T')[0];
  const newState = {
    ...state,
    dailyRecords: state.dailyRecords.filter(r => r.date !== today),
  };
  saveState(newState);
  return newState;
};

// 获取今日记录
export const getTodayRecord = (state: AppState): DailyRecord | undefined => {
  const today = new Date().toISOString().split('T')[0];
  return state.dailyRecords.find(r => r.date === today);
};

// 获取或创建今日记录
export const getOrCreateTodayRecord = (state: AppState): DailyRecord => {
  const today = new Date().toISOString().split('T')[0];
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

// 计算连续完成天数
export const calculateStreak = (state: AppState): number => {
  const sortedRecords = [...state.dailyRecords]
    .filter(r => r.tasks.length > 0 && r.tasks.every(t => t.completed))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (sortedRecords.length === 0) return 0;
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // 检查今天或昨天是否有完成记录
  const latestRecord = sortedRecords[0];
  if (latestRecord.date !== today && latestRecord.date !== yesterday) {
    return 0;
  }
  
  // 计算连续天数
  let currentDate = new Date(latestRecord.date);
  for (const record of sortedRecords) {
    const recordDate = new Date(record.date);
    const diffDays = Math.floor((currentDate.getTime() - recordDate.getTime()) / 86400000);
    if (diffDays === streak) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// 计算各类作业完成次数
export const getCategoryStats = (state: AppState): Record<string, number> => {
  const stats: Record<string, number> = { study: 0, sport: 0, art: 0, other: 0 };
  
  state.dailyRecords.forEach(record => {
    record.tasks.forEach(task => {
      if (task.completed) {
        const taskDef = state.tasks.find(t => t.id === task.taskId);
        if (taskDef) {
          stats[taskDef.category] = (stats[taskDef.category] || 0) + 1;
        }
      }
    });
  });
  
  return stats;
};

// 计算总完成任务数
export const getTotalCompletedTasks = (state: AppState): number => {
  return state.dailyRecords.reduce((total, record) => {
    return total + record.tasks.filter(t => t.completed).length;
  }, 0);
};

// 计算总积分（作业完成积分 + 积分调整 - 兑换消耗）
export const calculateTotalPoints = (state: AppState): number => {
  // 1. 计算所有每日记录中获得的积分（作业完成）
  const dailyRecordPoints = state.dailyRecords.reduce((sum, record) => {
    return sum + (record.totalPoints || 0);
  }, 0);
  
  // 2. 计算积分调整（手动加减分）
  const adjustmentPoints = state.pointAdjustments.reduce((sum, adj) => {
    return sum + (adj.points || 0);
  }, 0);
  
  // 3. 计算兑换奖品消耗的积分
  const redemptionPoints = state.redemptions.reduce((sum, red) => {
    return sum + (red.points || 0);
  }, 0);
  
  // 总积分 = 作业积分 + 调整积分 - 兑换消耗
  return Math.max(0, dailyRecordPoints + adjustmentPoints - redemptionPoints);
};

// 检查并解锁徽章
export const checkAndUnlockBadges = (state: AppState): BadgeType[] => {
  const newlyUnlocked: BadgeType[] = [];
  const streak = calculateStreak(state);
  const categoryStats = getCategoryStats(state);
  const totalTasks = getTotalCompletedTasks(state);
  
  // 检查连续完成徽章
  if (streak >= 3 && !state.badges.find(b => b.id === 'streak_3')?.unlockedAt) {
    newlyUnlocked.push('streak_3');
  }
  if (streak >= 7 && !state.badges.find(b => b.id === 'streak_7')?.unlockedAt) {
    newlyUnlocked.push('streak_7');
  }
  if (streak >= 15 && !state.badges.find(b => b.id === 'streak_15')?.unlockedAt) {
    newlyUnlocked.push('streak_15');
  }
  
  // 检查类别徽章
  if (categoryStats.sport >= 20 && !state.badges.find(b => b.id === 'sport_master')?.unlockedAt) {
    newlyUnlocked.push('sport_master');
  }
  if (categoryStats.study >= 30 && !state.badges.find(b => b.id === 'study_master')?.unlockedAt) {
    newlyUnlocked.push('study_master');
  }
  if (categoryStats.art >= 15 && !state.badges.find(b => b.id === 'art_master')?.unlockedAt) {
    newlyUnlocked.push('art_master');
  }
  
  // 检查积分徽章
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
  
  // 检查任务大师徽章
  if (totalTasks >= 100 && !state.badges.find(b => b.id === 'task_master')?.unlockedAt) {
    newlyUnlocked.push('task_master');
  }
  
  // 检查首次兑换徽章
  if (state.redemptions.length >= 1 && !state.badges.find(b => b.id === 'first_reward')?.unlockedAt) {
    newlyUnlocked.push('first_reward');
  }
  
  return newlyUnlocked;
};
