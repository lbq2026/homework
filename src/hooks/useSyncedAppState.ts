import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Task, Reward, Redemption, BadgeType, DailyTask, DailyRecord, Badge, PointAdjustment } from '@/types';
import { useAuth } from './useAuth.tsx';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  loadState,
  saveState,
  exportData,
  importData,
  resetTodayRecord,
  getOrCreateTodayRecord,
  checkAndUnlockBadges,
  calculateStreak,
  getCategoryStats,
  getTotalCompletedTasks,
  calculateTotalPoints,
} from '@/utils/storage';
import { playSuccessSound, playPointSound, playBadgeSound, playRedeemSound } from '@/utils/sound';

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

// 合并徽章数据（保留解锁状态）
const mergeBadges = (localBadges: Badge[], serverBadges: { badge_type: string; unlocked_at: string }[]): Badge[] => {
  return DEFAULT_BADGES.map(defaultBadge => {
    const localBadge = localBadges.find(b => b.id === defaultBadge.id);
    const serverBadge = serverBadges.find(b => b.badge_type === defaultBadge.id);
    
    // 优先使用服务器数据，其次是本地数据
    const unlockedAt = serverBadge 
      ? new Date(serverBadge.unlocked_at).getTime()
      : localBadge?.unlockedAt;
    
    return {
      ...defaultBadge,
      unlockedAt,
    };
  });
};

export const useSyncedAppState = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AppState>(getInitialState());
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // 使用 ref 来跟踪当前加载的用户ID，用于检测用户切换
  const currentUserId = useRef<string | null>(null);
  const isOnline = isSupabaseConfigured();

  // 从 Supabase 加载用户数据
  const loadUserDataFromSupabase = useCallback(async (userId: string) => {
    if (!userId || !isOnline) return null;
    
    try {
      setIsSyncing(true);
      
      // 并行获取所有数据
      const [tasksRes, rewardsRes, recordsRes, redemptionsRes, badgesRes, profileRes, adjustmentsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('rewards').select('*').eq('user_id', userId).eq('is_active', true),
        supabase.from('daily_records').select('*').eq('user_id', userId),
        supabase.from('redemptions').select('*').eq('user_id', userId),
        supabase.from('badges').select('badge_type, unlocked_at').eq('user_id', userId),
        supabase.from('profiles').select('total_points').eq('id', userId).maybeSingle(),
        supabase.from('point_adjustments').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      // 处理任务数据
      const tasks: Task[] = tasksRes.data?.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        basePoints: t.base_points as number,
        icon: t.icon as string,
        category: t.category as Task['category'],
        createdAt: new Date(t.created_at as string).getTime(),
      })) || [];

      // 处理奖品数据
      const rewards: Reward[] = rewardsRes.data?.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        points: r.points as number,
        icon: r.icon as string,
        description: r.description as string,
        category: r.category as Reward['category'],
        createdAt: new Date(r.created_at as string).getTime(),
      })) || [];

      // 处理每日记录
      const dailyRecords: DailyRecord[] = recordsRes.data?.map((r: Record<string, unknown>) => ({
        date: r.date as string,
        tasks: (r.tasks as DailyRecord['tasks']) || [],
        totalPoints: r.total_points as number,
      })) || [];

      // 处理兑换记录
      const redemptions: Redemption[] = redemptionsRes.data?.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        rewardId: r.reward_id as string,
        rewardName: r.reward_name as string,
        points: r.points as number,
        redeemedAt: new Date(r.created_at as string).getTime(),
      })) || [];

      // 处理徽章数据
      const badges = mergeBadges([], badgesRes.data || []);

      // 处理积分调整记录
      const pointAdjustments: PointAdjustment[] = adjustmentsRes.data?.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        points: a.points as number,
        reason: a.reason as string,
        createdAt: new Date(a.created_at as string).getTime(),
      })) || [];

      // 获取总积分，如果 profile 不存在则自动创建
      let totalPoints = profileRes.data?.total_points || 0;
      
      if (!profileRes.data) {
        // Profile 不存在，尝试创建
        try {
          const { error: createError } = await supabase.from('profiles').insert({
            id: userId,
            total_points: 0,
          });
          if (createError) {
            console.warn('Failed to create profile:', createError);
          }
        } catch (e) {
          console.warn('Error creating profile:', e);
        }
      }

      return {
        tasks,
        rewards,
        dailyRecords,
        redemptions,
        badges,
        pointAdjustments,
        totalPoints,
      };
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  // 同步数据到 Supabase
  const syncToSupabase = useCallback(async (newState: AppState) => {
    if (!user?.id || !isOnline) return;
    
    try {
      setIsSyncing(true);
      
      // 同步今日记录到 Supabase
      const today = new Date().toISOString().split('T')[0];
      const todayRecord = newState.dailyRecords.find(r => r.date === today);
      
      if (todayRecord) {
        await supabase.from('daily_records').upsert({
          user_id: user.id,
          date: today,
          tasks: todayRecord.tasks,
          total_points: todayRecord.totalPoints,
        }, { onConflict: 'user_id,date' });
      }
      
      // 实时计算并同步总积分
      const calculatedPoints = calculateTotalPoints(newState);
      await supabase.from('profiles').update({ 
        total_points: calculatedPoints,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      
    } catch (error) {
      console.error('Failed to sync to Supabase:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline]);

  // 初始化数据 - 监听用户变化
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      
      // 检测用户是否切换
      const userChanged = currentUserId.current !== (user?.id || null);
      currentUserId.current = user?.id || null;
      
      if (user?.id && isOnline) {
        // 用户已登录，从 Supabase 加载数据
        const serverData = await loadUserDataFromSupabase(user.id);
        
        if (serverData) {
          // 如果用户切换了或者是新设备（本地数据不是当前用户的），优先使用服务器数据
          const localData = loadState();
          
          // 检查本地数据是否属于当前用户（通过检查任务中是否有当前用户的任务）
          // 由于本地存储没有用户标识，我们假设如果是用户切换，应该优先使用服务器数据
          const isNewDeviceOrUserSwitch = userChanged;
          
          if (isNewDeviceOrUserSwitch) {
            // 新设备或用户切换：使用服务器数据，但保留本地设置
            const newState = {
              ...getInitialState(),
              ...serverData,
              settings: {
                ...localData.settings,
                // 保留音效设置，但更新其他设置
                soundEnabled: localData.settings?.soundEnabled ?? true,
              },
            };
            // 重新计算总积分
            newState.totalPoints = calculateTotalPoints(newState);
            setState(newState);
          } else {
            // 同一用户：合并本地和服务器数据（服务器数据优先）
            const newState = {
              ...getInitialState(),
              ...localData,
              ...serverData,
              // 徽章需要特殊处理，合并解锁状态
              badges: mergeBadges(localData.badges, serverData.badges as unknown as { badge_type: string; unlocked_at: string }[]),
              settings: localData.settings, // 设置保留本地
            };
            // 重新计算总积分
            newState.totalPoints = calculateTotalPoints(newState);
            setState(newState);
          }
        } else {
          // 服务器数据加载失败，使用本地数据并重新计算积分
          const localData = loadState();
          localData.totalPoints = calculateTotalPoints(localData);
          setState(localData);
        }
      } else {
        // 未登录，使用本地数据并重新计算积分
        const localData = loadState();
        localData.totalPoints = calculateTotalPoints(localData);
        setState(localData);
      }
      
      setIsLoading(false);
    };

    initializeData();
  }, [user?.id, isOnline, loadUserDataFromSupabase]); // 使用 user.id 作为依赖

  // 自动计算总积分（当相关数据变化时）
  useEffect(() => {
    if (!isLoading) {
      setState(prev => {
        const calculatedPoints = calculateTotalPoints(prev);
        // 只有当计算值与当前值不同时才更新，避免无限循环
        if (calculatedPoints !== prev.totalPoints) {
          return { ...prev, totalPoints: calculatedPoints };
        }
        return prev;
      });
    }
  }, [state.dailyRecords, state.pointAdjustments, state.redemptions, isLoading]);

  // 保存状态到本地存储
  useEffect(() => {
    if (!isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  // 添加作业
  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
    
    // 如果已登录，同步到 Supabase
    if (user?.id && isOnline) {
      try {
        await supabase.from('tasks').insert({
          id: newTask.id,
          user_id: user.id,
          name: newTask.name,
          base_points: newTask.basePoints,
          icon: newTask.icon,
          category: newTask.category,
        });
      } catch (error) {
        console.error('Failed to add task to Supabase:', error);
      }
    }
    
    return newTask.id;
  }, [user, isOnline]);

  // 编辑作业
  const editTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
    
    if (user?.id && isOnline) {
      try {
        await supabase.from('tasks').update({
          name: updates.name,
          base_points: updates.basePoints,
          icon: updates.icon,
          category: updates.category,
          updated_at: new Date().toISOString(),
        }).eq('id', taskId);
      } catch (error) {
        console.error('Failed to update task in Supabase:', error);
      }
    }
  }, [user, isOnline]);

  // 删除作业
  const deleteTask = useCallback(async (taskId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
    }));
    
    if (user?.id && isOnline) {
      try {
        await supabase.from('tasks').update({ is_active: false }).eq('id', taskId);
      } catch (error) {
        console.error('Failed to delete task in Supabase:', error);
      }
    }
  }, [user, isOnline]);

  // 添加作业到今日清单
  const addTaskToToday = useCallback((taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = getOrCreateTodayRecord(prev);
      if (record.tasks.some((t: DailyTask) => t.taskId === taskId)) {
        return prev;
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
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      // 同步到 Supabase
      syncToSupabase(newState);
      
      return newState;
    });
  }, [syncToSupabase]);

  // 从今日清单移除作业
  const removeTaskFromToday = useCallback((taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const record = prev.dailyRecords.find(r => r.date === today);
      if (!record) return prev;
      
      // 检查被移除的任务是否已完成，如果已完成需要扣除积分
      const taskToRemove = record.tasks.find(t => t.taskId === taskId);
      let pointsToDeduct = 0;
      if (taskToRemove?.completed) {
        const taskDef = prev.tasks.find(t => t.id === taskId);
        pointsToDeduct = taskDef?.basePoints || 1;
      }
      
      const newRecord = {
        ...record,
        tasks: record.tasks.filter(t => t.taskId !== taskId),
        totalPoints: record.totalPoints - pointsToDeduct,
      };
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      // 实时计算新的总积分
      newState.totalPoints = calculateTotalPoints(newState);
      
      // 同步到 Supabase（包含今日记录和总积分）
      if (user?.id && isOnline) {
        Promise.all([
          // 同步今日记录
          supabase.from('daily_records').upsert({
            user_id: user.id,
            date: today,
            tasks: newRecord.tasks,
            total_points: newRecord.totalPoints,
          }, { onConflict: 'user_id,date' }),
          // 实时同步更新后的总积分
          supabase.from('profiles').update({ 
            total_points: newState.totalPoints,
            updated_at: new Date().toISOString()
          }).eq('id', user.id),
        ]).catch(error => {
          console.error('Failed to sync remove task from today:', error);
        });
      }
      
      return newState;
    });
  }, [user, isOnline]);

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
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      let newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      // 计算新的总积分
      newState.totalPoints = calculateTotalPoints(newState);
      
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
        newState = {
          ...newState,
          badges: newState.badges.map(b => 
            unlocked.includes(b.id) ? { ...b, unlockedAt: now } : b
          ),
        };
        
        // 同步徽章到 Supabase
        if (user?.id && isOnline) {
          unlocked.forEach(async (badgeType) => {
            await supabase.from('badges').upsert({
              user_id: user.id,
              badge_type: badgeType,
            }, { onConflict: 'user_id,badge_type' });
          });
        }
      }
      
      // 同步到 Supabase（包含今日记录和总积分）
      if (user?.id && isOnline) {
        Promise.all([
          // 同步今日记录
          supabase.from('daily_records').upsert({
            user_id: user.id,
            date: today,
            tasks: newRecord.tasks,
            total_points: newRecord.totalPoints,
          }, { onConflict: 'user_id,date' }),
          // 实时同步更新后的总积分
          supabase.from('profiles').update({ 
            total_points: newState.totalPoints,
            updated_at: new Date().toISOString()
          }).eq('id', user.id),
        ]).catch(error => {
          console.error('Failed to sync task completion:', error);
        });
      }
      
      return newState;
    });
  }, [user, isOnline]);

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
      
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      let newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      // 计算新的总积分
      newState.totalPoints = calculateTotalPoints(newState);
      
      playSuccessSound(prev.settings.soundEnabled);
      
      // 检查徽章解锁
      const unlocked = checkAndUnlockBadges(newState);
      if (unlocked.length > 0) {
        playBadgeSound(prev.settings.soundEnabled);
        setNewlyUnlockedBadges(unlocked);
        newState = {
          ...newState,
          badges: newState.badges.map(b => 
            unlocked.includes(b.id) ? { ...b, unlockedAt: Date.now() } : b
          ),
        };
        
        // 同步徽章到 Supabase
        if (user?.id && isOnline) {
          unlocked.forEach(async (badgeType) => {
            await supabase.from('badges').upsert({
              user_id: user.id,
              badge_type: badgeType,
            }, { onConflict: 'user_id,badge_type' });
          });
        }
      }
      
      // 同步到 Supabase（包含今日记录和总积分）
      if (user?.id && isOnline) {
        Promise.all([
          // 同步今日记录
          supabase.from('daily_records').upsert({
            user_id: user.id,
            date: today,
            tasks: newRecord.tasks,
            total_points: newRecord.totalPoints,
          }, { onConflict: 'user_id,date' }),
          // 实时同步更新后的总积分
          supabase.from('profiles').update({ 
            total_points: newState.totalPoints,
            updated_at: new Date().toISOString()
          }).eq('id', user.id),
        ]).catch(error => {
          console.error('Failed to sync complete all tasks:', error);
        });
      }
      
      return newState;
    });
  }, [user, isOnline]);

  // 添加奖品
  const addReward = useCallback(async (reward: Omit<Reward, 'id' | 'createdAt'>) => {
    const newReward: Reward = {
      ...reward,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    
    setState(prev => ({
      ...prev,
      rewards: [...prev.rewards, newReward],
    }));
    
    if (user?.id && isOnline) {
      try {
        await supabase.from('rewards').insert({
          id: newReward.id,
          user_id: user.id,
          name: newReward.name,
          points: newReward.points,
          icon: newReward.icon,
          description: newReward.description,
          category: newReward.category,
        });
      } catch (error) {
        console.error('Failed to add reward to Supabase:', error);
      }
    }
    
    return newReward.id;
  }, [user, isOnline]);

  // 编辑奖品
  const editReward = useCallback(async (rewardId: string, updates: Partial<Reward>) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r),
    }));
    
    if (user?.id && isOnline) {
      try {
        await supabase.from('rewards').update({
          name: updates.name,
          points: updates.points,
          icon: updates.icon,
          description: updates.description,
          category: updates.category,
          updated_at: new Date().toISOString(),
        }).eq('id', rewardId);
      } catch (error) {
        console.error('Failed to update reward in Supabase:', error);
      }
    }
  }, [user, isOnline]);

  // 删除奖品
  const deleteReward = useCallback(async (rewardId: string) => {
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== rewardId),
    }));
    
    if (user?.id && isOnline) {
      try {
        await supabase.from('rewards').update({ is_active: false }).eq('id', rewardId);
      } catch (error) {
        console.error('Failed to delete reward in Supabase:', error);
      }
    }
  }, [user, isOnline]);

  // 兑换奖品
  const redeemReward = useCallback(async (reward: Reward) => {
    const currentState = state;
    
    if (currentState.totalPoints < reward.points) return false;
    
    const redemption: Redemption = {
      id: crypto.randomUUID(),
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
      redeemedAt: Date.now(),
    };
    
    // 计算新的兑换记录列表
    const newRedemptions = [redemption, ...currentState.redemptions];
    
    // 实时计算新的总积分
    const dailyRecordPoints = currentState.dailyRecords.reduce((sum, record) => sum + (record.totalPoints || 0), 0);
    const adjustmentPoints = currentState.pointAdjustments.reduce((sum, adj) => sum + (adj.points || 0), 0);
    const redemptionPoints = newRedemptions.reduce((sum, red) => sum + (red.points || 0), 0);
    const newTotalPoints = dailyRecordPoints + adjustmentPoints - redemptionPoints;
    
    // 构建新状态
    const newState: AppState = {
      ...currentState,
      redemptions: newRedemptions,
      totalPoints: newTotalPoints,
    };
    
    playRedeemSound(currentState.settings.soundEnabled);
    
    // 检查首次兑换徽章
    const unlocked = checkAndUnlockBadges(newState);
    if (unlocked.length > 0) {
      playBadgeSound(currentState.settings.soundEnabled);
      setNewlyUnlockedBadges(prev => [...prev, ...unlocked]);
      newState.badges = newState.badges.map(b => 
        unlocked.includes(b.id) ? { ...b, unlockedAt: Date.now() } : b
      );
    }
    
    // 更新本地状态
    setState(newState);
    
    // 同步到 Supabase
    if (user?.id && isOnline) {
      try {
        await supabase.rpc('redeem_reward', {
          p_user_id: user.id,
          p_reward_id: reward.id,
          p_reward_name: reward.name,
          p_points: reward.points,
        });
      } catch (error) {
        console.error('Failed to redeem reward in Supabase:', error);
      }
    }
    
    return true;
  }, [state, user, isOnline]);

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
  const resetAll = useCallback(async () => {
    const initial = getInitialState();
    setState(initial);
    
    // 如果已登录，清空 Supabase 数据
    if (user?.id && isOnline) {
      try {
        await Promise.all([
          supabase.from('tasks').delete().eq('user_id', user.id),
          supabase.from('rewards').delete().eq('user_id', user.id),
          supabase.from('daily_records').delete().eq('user_id', user.id),
          supabase.from('redemptions').delete().eq('user_id', user.id),
          supabase.from('badges').delete().eq('user_id', user.id),
          supabase.from('profiles').update({ total_points: 0 }).eq('id', user.id),
        ]);
      } catch (error) {
        console.error('Failed to reset Supabase data:', error);
      }
    }
  }, [user, isOnline]);

  // 手动调整积分（加分或扣分）
  const adjustPoints = useCallback(async (points: number, reason: string) => {
    if (!user?.id) return false;
    
    const adjustment: PointAdjustment = {
      id: crypto.randomUUID(),
      points,
      reason,
      createdAt: Date.now(),
    };
    
    // 1. 先同步到 Supabase
    if (isOnline) {
      try {
        // 插入积分调整记录到数据库
        const { error: insertError } = await supabase.from('point_adjustments').insert({
          id: adjustment.id,
          user_id: user.id,
          points: adjustment.points,
          reason: adjustment.reason,
        });
        
        if (insertError) {
          console.error('Failed to insert point adjustment:', insertError);
          return false;
        }
        
        // 从数据库重新计算总积分
        const [{ data: recordsData }, { data: adjustmentsData }, { data: redemptionsData }] = await Promise.all([
          supabase.from('daily_records').select('total_points').eq('user_id', user.id),
          supabase.from('point_adjustments').select('points').eq('user_id', user.id),
          supabase.from('redemptions').select('points').eq('user_id', user.id),
        ]);
        
        const dailyRecordSum = (recordsData || []).reduce((sum, r) => sum + (r.total_points || 0), 0);
        const adjustmentSum = (adjustmentsData || []).reduce((sum, a) => sum + (a.points || 0), 0);
        const redemptionSum = (redemptionsData || []).reduce((sum, r) => sum + (r.points || 0), 0);
        const calculatedTotal = dailyRecordSum + adjustmentSum - redemptionSum;
        
        // 更新总积分到数据库
        const { error: updateError } = await supabase.from('profiles')
          .update({ total_points: calculatedTotal, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        
        if (updateError) {
          console.error('Failed to update profile total_points:', updateError);
        }
      } catch (error) {
        console.error('Failed to sync point adjustment to Supabase:', error);
        return false;
      }
    }
    
    // 2. 数据库更新成功后，再更新本地状态
    setState(prev => {
      // 计算新的调整记录列表
      const newAdjustments = [adjustment, ...prev.pointAdjustments];
      
      // 实时计算新的总积分
      const dailyRecordPoints = prev.dailyRecords.reduce((sum, record) => sum + (record.totalPoints || 0), 0);
      const adjustmentPoints = newAdjustments.reduce((sum, adj) => sum + (adj.points || 0), 0);
      const redemptionPoints = prev.redemptions.reduce((sum, red) => sum + (red.points || 0), 0);
      const newTotalPoints = dailyRecordPoints + adjustmentPoints - redemptionPoints;
      
      // 构建新状态
      let newState: AppState = {
        ...prev,
        pointAdjustments: newAdjustments,
        totalPoints: newTotalPoints,
      };
      
      // 播放音效
      if (points > 0) {
        playPointSound(newState.settings.soundEnabled);
      }
      
      // 检查徽章解锁（加分时）
      if (points > 0) {
        const newlyUnlocked = checkAndUnlockBadges(newState);
        if (newlyUnlocked.length > 0) {
          setNewlyUnlockedBadges(prevBadges => [...prevBadges, ...newlyUnlocked]);
          playBadgeSound(newState.settings.soundEnabled);
          newState = {
            ...newState,
            badges: newState.badges.map(b => 
              newlyUnlocked.includes(b.id) ? { ...b, unlockedAt: Date.now() } : b
            ),
          };
        }
      }
      
      return newState;
    });
    
    return true;
  }, [user, isOnline]);

  // 编辑积分调整记录
  const editPointAdjustment = useCallback(async (id: string, points: number, reason: string) => {
    if (!user?.id) return false;
    
    // 1. 先同步到 Supabase
    if (isOnline) {
      try {
        // 更新积分调整记录
        const { error: updateError } = await supabase.from('point_adjustments')
          .update({ points, reason, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('Failed to update point adjustment:', updateError);
          return false;
        }
        
        // 从数据库重新计算总积分
        const [{ data: recordsData }, { data: adjustmentsData }, { data: redemptionsData }] = await Promise.all([
          supabase.from('daily_records').select('total_points').eq('user_id', user.id),
          supabase.from('point_adjustments').select('points').eq('user_id', user.id),
          supabase.from('redemptions').select('points').eq('user_id', user.id),
        ]);
        
        const dailyRecordSum = (recordsData || []).reduce((sum, r) => sum + (r.total_points || 0), 0);
        const adjustmentSum = (adjustmentsData || []).reduce((sum, a) => sum + (a.points || 0), 0);
        const redemptionSum = (redemptionsData || []).reduce((sum, r) => sum + (r.points || 0), 0);
        const calculatedTotal = dailyRecordSum + adjustmentSum - redemptionSum;
        
        // 更新总积分到数据库
        const { error: profileError } = await supabase.from('profiles')
          .update({ total_points: calculatedTotal, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Failed to update profile total_points:', profileError);
        }
      } catch (error) {
        console.error('Failed to update point adjustment in Supabase:', error);
        return false;
      }
    }
    
    // 2. 数据库更新成功后，再更新本地状态
    setState(prev => {
      // 计算新的调整记录列表
      const newAdjustments = prev.pointAdjustments.map(adj =>
        adj.id === id ? { ...adj, points, reason } : adj
      );
      
      // 实时计算新的总积分
      const dailyRecordPoints = prev.dailyRecords.reduce((sum, record) => sum + (record.totalPoints || 0), 0);
      const adjustmentPoints = newAdjustments.reduce((sum, adj) => sum + (adj.points || 0), 0);
      const redemptionPoints = prev.redemptions.reduce((sum, red) => sum + (red.points || 0), 0);
      const newTotalPoints = dailyRecordPoints + adjustmentPoints - redemptionPoints;
      
      // 构建新状态
      const newState: AppState = {
        ...prev,
        pointAdjustments: newAdjustments,
        totalPoints: newTotalPoints,
      };
      
      return newState;
    });

    return true;
  }, [user, isOnline]);

  // 删除积分调整记录
  const deletePointAdjustment = useCallback(async (id: string) => {
    if (!user?.id) return false;
    
    // 1. 先同步到 Supabase
    if (isOnline) {
      try {
        // 删除积分调整记录
        const { error: deleteError } = await supabase.from('point_adjustments')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('Delete error:', deleteError);
          return false;
        }
        
        // 从数据库重新计算总积分
        const [{ data: recordsData }, { data: adjustmentsData }, { data: redemptionsData }] = await Promise.all([
          supabase.from('daily_records').select('total_points').eq('user_id', user.id),
          supabase.from('point_adjustments').select('points').eq('user_id', user.id),
          supabase.from('redemptions').select('points').eq('user_id', user.id),
        ]);
        
        const dailyRecordSum = (recordsData || []).reduce((sum, r) => sum + (r.total_points || 0), 0);
        const adjustmentSum = (adjustmentsData || []).reduce((sum, a) => sum + (a.points || 0), 0);
        const redemptionSum = (redemptionsData || []).reduce((sum, r) => sum + (r.points || 0), 0);
        const calculatedTotal = dailyRecordSum + adjustmentSum - redemptionSum;
        
        // 更新总积分到数据库
        const { error: profileError } = await supabase.from('profiles')
          .update({ total_points: calculatedTotal, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Failed to update profile total_points:', profileError);
        }
      } catch (error) {
        console.error('Failed to delete point adjustment in Supabase:', error);
        return false;
      }
    }
    
    // 2. 数据库删除成功后，再更新本地状态
    setState(prev => {
      // 计算新的调整记录列表
      const newAdjustments = prev.pointAdjustments.filter(adj => adj.id !== id);
      
      // 实时计算新的总积分
      const dailyRecordPoints = prev.dailyRecords.reduce((sum, record) => sum + (record.totalPoints || 0), 0);
      const adjustmentPoints = newAdjustments.reduce((sum, adj) => sum + (adj.points || 0), 0);
      const redemptionPoints = prev.redemptions.reduce((sum, red) => sum + (red.points || 0), 0);
      const newTotalPoints = dailyRecordPoints + adjustmentPoints - redemptionPoints;
      
      // 构建新状态
      const newState: AppState = {
        ...prev,
        pointAdjustments: newAdjustments,
        totalPoints: newTotalPoints,
      };
      
      return newState;
    });

    return true;
  }, [user, isOnline]);

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

  // 手动刷新数据（用于强制同步）
  const refreshData = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    const serverData = await loadUserDataFromSupabase(user.id);
    if (serverData) {
      const localData = loadState();
      setState({
        ...getInitialState(),
        ...serverData,
        settings: localData.settings, // 保留本地设置
      });
    }
    setIsLoading(false);
  }, [user?.id, loadUserDataFromSupabase]);

  return {
    state,
    newlyUnlockedBadges,
    isLoading,
    isSyncing,
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
    refreshData,
    adjustPoints,
    editPointAdjustment,
    deletePointAdjustment,
  };
};
