import type { AppState, Badge, BadgeType, DailyRecord } from '@/types';

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
  pointAdjustments: [],
  totalPoints: 0,
  settings: {
    soundEnabled: true,
    lastVisitDate: new Date().toISOString().split('T')[0],
  },
});

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
  const today = new Date().toISOString().split('T')[0];
  const newState = {
    ...state,
    dailyRecords: state.dailyRecords.filter(r => r.date !== today),
  };
  saveState(newState);
  return newState;
};

export const getTodayRecord = (state: AppState): DailyRecord | undefined => {
  const today = new Date().toISOString().split('T')[0];
  return state.dailyRecords.find(r => r.date === today);
};

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

export const calculateStreak = (state: AppState): number => {
  const sortedRecords = [...state.dailyRecords]
    .filter(r => r.tasks.length > 0 && r.tasks.every(t => t.completed))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  if (sortedRecords.length === 0) return 0;
  
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const latestRecord = sortedRecords[0];
  if (latestRecord.date !== today && latestRecord.date !== yesterday) {
    return 0;
  }
  
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
  
  state.redemptions.forEach(redemption => {
    total -= redemption.points;
  });
  
  state.pointAdjustments.forEach(adjustment => {
    total += adjustment.points;
  });
  
  return Math.max(0, total);
};
