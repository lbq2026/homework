import { useState, useEffect, useCallback } from 'react';
import type { AppState, Task, Reward, Redemption, BadgeType, DailyTask, PrimaryCategory, SecondaryCategory, TertiaryCategory, PointAdjustment } from '@/types';
import {
  loadState,
  saveState,
  exportData,
  importData,
  resetAllData,
  resetTodayRecord,
  getOrCreateTodayRecord,
  checkAndUnlockBadges,
  calculateStreak,
  getCategoryStats,
  getPrimaryCategoryStats,
  getTotalCompletedTasks,
  calculateTotalPoints,
} from '@/utils/storage';
import { playSuccessSound, playPointSound, playBadgeSound, playRedeemSound } from '@/utils/sound';

export const useAppState = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeType[]>([]);

  useEffect(() => {
    setState(prev => {
      const calculatedPoints = calculateTotalPoints(prev);
      if (calculatedPoints !== prev.totalPoints) {
        return { ...prev, totalPoints: calculatedPoints };
      }
      return prev;
    });
  }, [state.dailyRecords, state.pointAdjustments, state.redemptions]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
  }, []);

  const editTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
  }, []);

  const addTaskToToday = useCallback((taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = getOrCreateTodayRecord(prev);
      const newTask: DailyTask = {
        id: Date.now().toString(),
        taskId,
        completed: false,
      };
      const newRecord = {
        ...record,
        tasks: [...record.tasks, newTask],
      };
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      return {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
    });
  }, []);

  const removeTaskFromToday = useCallback((dailyTaskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = prev.dailyRecords.find(r => r.date === today);
      if (!record) return prev;
      
      const taskToRemove = record.tasks.find(t => t.id === dailyTaskId);
      let pointsToSubtract = 0;
      
      if (taskToRemove?.completed) {
        const taskDef = prev.tasks.find(t => t.id === taskToRemove.taskId);
        const tertiaryCat = prev.tertiaryCategories.find(c => c.id === taskToRemove.taskId);
        pointsToSubtract = taskDef?.basePoints || tertiaryCat?.defaultPoints || 1;
      }
      
      const newRecord = {
        ...record,
        tasks: record.tasks.filter(t => t.id !== dailyTaskId),
        totalPoints: record.totalPoints - pointsToSubtract,
      };
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      return newState;
    });
  }, []);

  const toggleTaskCompletion = useCallback((dailyTaskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = prev.dailyRecords.find(r => r.date === today);
      if (!record) return prev;
      
      const task = record.tasks.find(t => t.id === dailyTaskId);
      if (!task) return prev;
      
      const taskDef = prev.tasks.find(t => t.id === task.taskId);
      const tertiaryCat = prev.tertiaryCategories.find(c => c.id === task.taskId);
      const points = taskDef?.basePoints || tertiaryCat?.defaultPoints || 1;
      
      const newCompleted = !task.completed;
      const newRecord = {
        ...record,
        tasks: record.tasks.map(t => 
          t.id === dailyTaskId 
            ? { ...t, completed: newCompleted, completedAt: newCompleted ? Date.now() : undefined }
            : t
        ),
        totalPoints: newCompleted 
          ? record.totalPoints + points 
          : record.totalPoints - points,
      };
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      if (newCompleted) {
        playSuccessSound(prev.settings.soundEnabled);
        playPointSound(prev.settings.soundEnabled);
      }
      
      const unlocked = checkAndUnlockBadges(newState);
      if (unlocked.length > 0) {
        playBadgeSound(prev.settings.soundEnabled);
        setNewlyUnlockedBadges(unlocked);
        const now = Date.now();
        newState.badges = newState.badges.map(b => 
          unlocked.includes(b.id) ? { ...b, unlockedAt: now } : b
        );
      }
      
      return newState;
    });
  }, []);

  const completeAllTasks = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = prev.dailyRecords.find(r => r.date === today);
      if (!record) return prev;
      
      const incompleteTasks = record.tasks.filter(t => !t.completed);
      if (incompleteTasks.length === 0) return prev;
      
      let additionalPoints = 0;
      const now = Date.now();
      
      const newTasks = record.tasks.map(t => {
        if (!t.completed) {
          const taskDef = prev.tasks.find(task => task.id === t.taskId);
          const tertiaryCat = prev.tertiaryCategories.find(cat => cat.id === t.taskId);
          const points = taskDef?.basePoints || tertiaryCat?.defaultPoints || 1;
          additionalPoints += points;
          return { ...t, completed: true, completedAt: now };
        }
        return t;
      });
      
      const newRecord = {
        ...record,
        tasks: newTasks,
        totalPoints: record.totalPoints + additionalPoints,
      };
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      playSuccessSound(prev.settings.soundEnabled);
      
      const unlocked = checkAndUnlockBadges(newState);
      if (unlocked.length > 0) {
        playBadgeSound(prev.settings.soundEnabled);
        setNewlyUnlockedBadges(unlocked);
        newState.badges = newState.badges.map(b => 
          unlocked.includes(b.id) ? { ...b, unlockedAt: Date.now() } : b
        );
      }
      
      return newState;
    });
  }, []);

  const addReward = useCallback((reward: Omit<Reward, 'id' | 'createdAt'>) => {
    const newReward: Reward = {
      ...reward,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setState(prev => ({
      ...prev,
      rewards: [...prev.rewards, newReward],
    }));
  }, []);

  const editReward = useCallback((rewardId: string, updates: Partial<Reward>) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r),
    }));
  }, []);

  const deleteReward = useCallback((rewardId: string) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== rewardId),
    }));
  }, []);

  const redeemReward = useCallback((reward: Reward) => {
    if (state.totalPoints < reward.points) return false;
    
    setState(prev => {
      const redemption: Redemption = {
        id: Date.now().toString(),
        rewardId: reward.id,
        rewardName: reward.name,
        points: reward.points,
        redeemedAt: Date.now(),
      };
      
      const newState = {
        ...prev,
        redemptions: [redemption, ...prev.redemptions],
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      playRedeemSound(prev.settings.soundEnabled);
      
      const unlocked = checkAndUnlockBadges(newState);
      if (unlocked.length > 0) {
        playBadgeSound(prev.settings.soundEnabled);
        setNewlyUnlockedBadges(unlocked);
        newState.badges = newState.badges.map(b => 
          unlocked.includes(b.id) ? { ...b, unlockedAt: Date.now() } : b
        );
      }
      
      return newState;
    });
    
    return true;
  }, [state.totalPoints]);

  const addPointAdjustment = useCallback((adjustment: Omit<PointAdjustment, 'id' | 'adjustedAt'>) => {
    const newAdjustment: PointAdjustment = {
      ...adjustment,
      id: Date.now().toString(),
      adjustedAt: Date.now(),
    };
    setState(prev => {
      const newState = {
        ...prev,
        pointAdjustments: [newAdjustment, ...prev.pointAdjustments],
      };
      newState.totalPoints = calculateTotalPoints(newState);
      return newState;
    });
  }, []);

  const editPointAdjustment = useCallback((id: string, updates: Partial<PointAdjustment>) => {
    setState(prev => {
      const newState = {
        ...prev,
        pointAdjustments: prev.pointAdjustments.map(adj => 
          adj.id === id ? { ...adj, ...updates } : adj
        ),
      };
      newState.totalPoints = calculateTotalPoints(newState);
      return newState;
    });
  }, []);

  const deletePointAdjustment = useCallback((id: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        pointAdjustments: prev.pointAdjustments.filter(adj => adj.id !== id),
      };
      newState.totalPoints = calculateTotalPoints(newState);
      return newState;
    });
  }, []);

  const addPrimaryCategory = useCallback((category: Omit<PrimaryCategory, 'id' | 'createdAt'>) => {
    const newCategory: PrimaryCategory = {
      ...category,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setState(prev => ({
      ...prev,
      primaryCategories: [...prev.primaryCategories, newCategory],
    }));
  }, []);

  const editPrimaryCategory = useCallback((categoryId: string, updates: Partial<PrimaryCategory>) => {
    setState(prev => ({
      ...prev,
      primaryCategories: prev.primaryCategories.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const deletePrimaryCategory = useCallback((categoryId: string) => {
    setState(prev => {
      const secondaryCatIds = new Set(
        prev.secondaryCategories
          .filter(c => c.primaryCategoryId === categoryId)
          .map(c => c.id)
      );
      return {
        ...prev,
        primaryCategories: prev.primaryCategories.filter(c => c.id !== categoryId),
        secondaryCategories: prev.secondaryCategories.filter(c => c.primaryCategoryId !== categoryId),
        tertiaryCategories: prev.tertiaryCategories.filter(c => !secondaryCatIds.has(c.secondaryCategoryId)),
        tasks: prev.tasks.map(t => {
          if (t.primaryCategoryId === categoryId) {
            return { ...t, primaryCategoryId: undefined, secondaryCategoryId: undefined, tertiaryCategoryId: undefined };
          }
          if (t.secondaryCategoryId && secondaryCatIds.has(t.secondaryCategoryId)) {
            return { ...t, secondaryCategoryId: undefined, tertiaryCategoryId: undefined };
          }
          return t;
        }),
      };
    });
  }, []);

  const addSecondaryCategory = useCallback((category: Omit<SecondaryCategory, 'id' | 'createdAt'>) => {
    const newCategory: SecondaryCategory = {
      ...category,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setState(prev => ({
      ...prev,
      secondaryCategories: [...prev.secondaryCategories, newCategory],
    }));
  }, []);

  const editSecondaryCategory = useCallback((categoryId: string, updates: Partial<SecondaryCategory>) => {
    setState(prev => ({
      ...prev,
      secondaryCategories: prev.secondaryCategories.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const deleteSecondaryCategory = useCallback((categoryId: string) => {
    setState(prev => ({
      ...prev,
      secondaryCategories: prev.secondaryCategories.filter(c => c.id !== categoryId),
      tertiaryCategories: prev.tertiaryCategories.filter(c => c.secondaryCategoryId !== categoryId),
      tasks: prev.tasks.map(t => 
        t.secondaryCategoryId === categoryId 
          ? { ...t, secondaryCategoryId: undefined, tertiaryCategoryId: undefined } 
          : t
      ),
    }));
  }, []);

  const addTertiaryCategory = useCallback((category: Omit<TertiaryCategory, 'id' | 'createdAt'>) => {
    const newCategory: TertiaryCategory = {
      ...category,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    setState(prev => ({
      ...prev,
      tertiaryCategories: [...prev.tertiaryCategories, newCategory],
    }));
  }, []);

  const editTertiaryCategory = useCallback((categoryId: string, updates: Partial<TertiaryCategory>) => {
    setState(prev => ({
      ...prev,
      tertiaryCategories: prev.tertiaryCategories.map(c => 
        c.id === categoryId ? { ...c, ...updates } : c
      ),
    }));
  }, []);

  const deleteTertiaryCategory = useCallback((categoryId: string) => {
    setState(prev => ({
      ...prev,
      tertiaryCategories: prev.tertiaryCategories.filter(c => c.id !== categoryId),
      tasks: prev.tasks.map(t => 
        t.tertiaryCategoryId === categoryId 
          ? { ...t, tertiaryCategoryId: undefined } 
          : t
      ),
    }));
  }, []);

  const toggleSound = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, []);

  const exportAppData = useCallback(() => {
    return exportData(state);
  }, [state]);

  const importAppData = useCallback((jsonString: string) => {
    const newState = importData(jsonString);
    if (newState) {
      setState(newState);
      return true;
    }
    return false;
  }, []);

  const resetAll = useCallback(() => {
    setState(resetAllData());
  }, []);

  const resetToday = useCallback(() => {
    setState(prev => resetTodayRecord(prev));
  }, []);

  const clearNewlyUnlockedBadges = useCallback(() => {
    setNewlyUnlockedBadges([]);
  }, []);

  const getTodayRecord = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.dailyRecords.find(r => r.date === today);
  }, [state.dailyRecords]);

  const getStats = useCallback(() => {
    return {
      streak: calculateStreak(state),
      categoryStats: getCategoryStats(state),
      primaryCategoryStats: getPrimaryCategoryStats(state),
      totalCompletedTasks: getTotalCompletedTasks(state),
      todayProgress: (() => {
        const today = getTodayRecord();
        if (!today || today.tasks.length === 0) return 0;
        return Math.round((today.tasks.filter(t => t.completed).length / today.tasks.length) * 100);
      })(),
    };
  }, [state, getTodayRecord]);

  return {
    state,
    newlyUnlockedBadges,
    addTask,
    editTask,
    deleteTask,
    addTaskToToday,
    removeTaskFromToday,
    toggleTaskCompletion,
    completeAllTasks,
    addReward,
    editReward,
    deleteReward,
    redeemReward,
    addPointAdjustment,
    editPointAdjustment,
    deletePointAdjustment,
    addPrimaryCategory,
    editPrimaryCategory,
    deletePrimaryCategory,
    addSecondaryCategory,
    editSecondaryCategory,
    deleteSecondaryCategory,
    addTertiaryCategory,
    editTertiaryCategory,
    deleteTertiaryCategory,
    toggleSound,
    exportAppData,
    importAppData,
    resetAll,
    resetToday,
    clearNewlyUnlockedBadges,
    getTodayRecord,
    getStats,
  };
};
