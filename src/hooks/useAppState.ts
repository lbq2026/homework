import { useState, useEffect, useCallback } from 'react';
import type { AppState, Task, Reward, Redemption, BadgeType, DailyTask } from '@/types';
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
  getTotalCompletedTasks,
} from '@/utils/storage';
import { playSuccessSound, playPointSound, playBadgeSound, playRedeemSound } from '@/utils/sound';

export const useAppState = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeType[]>([]);

  // 保存状态到本地存储
  useEffect(() => {
    saveState(state);
  }, [state]);

  // 添加作业
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

  // 编辑作业
  const editTask = useCallback((taskId: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }, []);

  // 删除作业
  const deleteTask = useCallback((taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
  }, []);

  // 添加作业到今日清单
  const addTaskToToday = useCallback((taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = getOrCreateTodayRecord(prev);
      if (record.tasks.some((t: DailyTask) => t.taskId === taskId)) {
        return prev; // 已存在
      }
      const newTask: DailyTask = {
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

  // 从今日清单移除作业
  const removeTaskFromToday = useCallback((taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = prev.dailyRecords.find(r => r.date === today);
      if (!record) return prev;
      const newRecord = {
        ...record,
        tasks: record.tasks.filter(t => t.taskId !== taskId),
      };
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      return {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
    });
  }, []);

  // 标记作业完成/未完成
  const toggleTaskCompletion = useCallback((taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = prev.dailyRecords.find(r => r.date === today);
      if (!record) return prev;
      
      const task = record.tasks.find(t => t.taskId === taskId);
      if (!task) return prev;
      
      const taskDef = prev.tasks.find(t => t.id === taskId);
      const points = taskDef?.basePoints || 1;
      
      const newCompleted = !task.completed;
      const newRecord = {
        ...record,
        tasks: record.tasks.map(t => 
          t.taskId === taskId 
            ? { ...t, completed: newCompleted, completedAt: newCompleted ? Date.now() : undefined }
            : t
        ),
        totalPoints: newCompleted 
          ? record.totalPoints + points 
          : record.totalPoints - points,
      };
      
      const newTotalPoints = newCompleted 
        ? prev.totalPoints + points 
        : prev.totalPoints - points;
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
        totalPoints: newTotalPoints,
      };
      
      // 播放音效
      if (newCompleted) {
        playSuccessSound(prev.settings.soundEnabled);
        playPointSound(prev.settings.soundEnabled);
      }
      
      // 检查徽章解锁
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

  // 一键完成所有作业
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
          additionalPoints += taskDef?.basePoints || 1;
          return { ...t, completed: true, completedAt: now };
        }
        return t;
      });
      
      const newRecord = {
        ...record,
        tasks: newTasks,
        totalPoints: record.totalPoints + additionalPoints,
      };
      
      const newTotalPoints = prev.totalPoints + additionalPoints;
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
        totalPoints: newTotalPoints,
      };
      
      playSuccessSound(prev.settings.soundEnabled);
      
      // 检查徽章解锁
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

  // 添加奖品
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

  // 编辑奖品
  const editReward = useCallback((rewardId: string, updates: Partial<Reward>) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r),
    }));
  }, []);

  // 删除奖品
  const deleteReward = useCallback((rewardId: string) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== rewardId),
    }));
  }, []);

  // 兑换奖品
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
        totalPoints: prev.totalPoints - reward.points,
      };
      
      playRedeemSound(prev.settings.soundEnabled);
      
      // 检查首次兑换徽章
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

  // 切换音效设置
  const toggleSound = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, []);

  // 导出数据
  const exportAppData = useCallback(() => {
    return exportData(state);
  }, [state]);

  // 导入数据
  const importAppData = useCallback((jsonString: string) => {
    const newState = importData(jsonString);
    if (newState) {
      setState(newState);
      return true;
    }
    return false;
  }, []);

  // 重置所有数据
  const resetAll = useCallback(() => {
    setState(resetAllData());
  }, []);

  // 重置今日记录
  const resetToday = useCallback(() => {
    setState(prev => resetTodayRecord(prev));
  }, []);

  // 清除新解锁徽章提示
  const clearNewlyUnlockedBadges = useCallback(() => {
    setNewlyUnlockedBadges([]);
  }, []);

  // 获取今日记录
  const getTodayRecord = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return state.dailyRecords.find(r => r.date === today);
  }, [state.dailyRecords]);

  // 获取统计数据
  const getStats = useCallback(() => {
    return {
      streak: calculateStreak(state),
      categoryStats: getCategoryStats(state),
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
