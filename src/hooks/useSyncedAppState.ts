import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Task, Reward, Redemption, BadgeType, DailyTask, PointAdjustment, SecondaryCategory, TertiaryCategory, PrimaryCategory, CustomBadge } from '@/types';
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
  getAvailablePoints,
  isDayAchieved,
  getTertiaryDueToday,
  checkCustomBadges,
  MAKEUP_CARD_PRICE,
} from '@/utils/storage';
import { playSuccessSound, playPointSound, playBadgeSound, playRedeemSound } from '@/utils/sound';
import { useAuth } from './useAuth.tsx';
import { useDataBackup } from './useDataBackup.ts';
import { getTodayStr, getYesterdayStr } from '@/utils/date';
import {
  fetchAllUserData,
  hasIndependentData,
  buildStateFromDb,
  fetchLatestBackup,
  syncLocalStateToDb,
  insertTask,
  updateTask,
  softDeleteTask,
  insertPrimaryCategory,
  updatePrimaryCategory,
  deletePrimaryCategory as deletePrimaryCategoryApi,
  insertSecondaryCategory,
  updateSecondaryCategory,
  deleteSecondaryCategory as deleteSecondaryCategoryApi,
  insertTertiaryCategory,
  updateTertiaryCategory,
  deleteTertiaryCategory as deleteTertiaryCategoryApi,
  upsertDailyRecord,
  insertReward,
  updateReward,
  deleteReward as deleteRewardApi,
  insertRedemption,
  updateRedemptionStatus,
  deleteRedemption as deleteRedemptionApi,
  upsertBadge,
  insertCustomBadge,
  updateCustomBadge,
  deleteCustomBadge as deleteCustomBadgeApi,
  upsertCustomBadgeUnlock,
  deleteCustomBadgeUnlock,
  insertPointAdjustment,
  updatePointAdjustment,
  deletePointAdjustment as deletePointAdjustmentApi,
  updateProfileTotalPoints,
  subscribeToChanges,
} from '@/services/supabaseApi';

/**
 * 全局同步状态 Hook（对外 API 与重构前保持一致）
 *
 * 职责：状态管理 + 登录加载流程编排 + 本地持久化/防抖备份 + Realtime 订阅 + 副作用（音效/徽章）。
 * Supabase 数据访问与类型转换已下沉至 services/supabaseApi.ts。
 */
export const useSyncedAppState = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncedOnLogin, setHasSyncedOnLogin] = useState(false);
  const { user } = useAuth();
  const { createBackup, autoBackup } = useDataBackup();
  const backupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionsRef = useRef<Array<() => void>>([]);

  // 积分一致性兜底：派生重算（来源数据变化时校准 totalPoints）
  useEffect(() => {
    setState(prev => {
      const calculatedPoints = calculateTotalPoints(prev);
      if (calculatedPoints !== prev.totalPoints) {
        return { ...prev, totalPoints: calculatedPoints };
      }
      return prev;
    });
  }, [state.dailyRecords, state.pointAdjustments, state.redemptions, hasSyncedOnLogin]);

  // 登录后从 Supabase 加载历史数据（独立表 → 备份表 → 本地上传）
  useEffect(() => {
    const loadUserDataFromSupabase = async () => {
      if (!user || hasSyncedOnLogin) return;
      setIsLoading(true);

      try {
        const data = await fetchAllUserData(user.id);

        if (hasIndependentData(data)) {
          // 1. 独立表有数据：转换并加载
          const convertedState = buildStateFromDb(data);
          convertedState.totalPoints = calculateTotalPoints(convertedState);
          saveState(convertedState);
          setState(() => ({ ...convertedState }));
          await createBackup(convertedState, '从独立表迁移');
        } else {
          // 2. 尝试从备份表获取最新备份
          const backupData = await fetchLatestBackup(user.id);

          if (backupData?.backup_data) {
            const backup = backupData.backup_data as Record<string, unknown>;
            const restoredState: AppState = {
              primaryCategories: (backup.primaryCategories as AppState['primaryCategories']) || [],
              secondaryCategories: (backup.secondaryCategories as AppState['secondaryCategories']) || [],
              tertiaryCategories: (backup.tertiaryCategories as AppState['tertiaryCategories']) || [],
              tasks: (backup.tasks as AppState['tasks']) || [],
              dailyRecords: (backup.dailyRecords as AppState['dailyRecords']) || [],
              rewards: (backup.rewards as AppState['rewards']) || [],
              redemptions: (backup.redemptions as AppState['redemptions']) || [],
              badges: (backup.badges as AppState['badges']) || [],
              customBadges: (backup.customBadges as AppState['customBadges']) || [],
              pointAdjustments: (backup.pointAdjustments as AppState['pointAdjustments']) || [],
              totalPoints: (backup.totalPoints as number) || 0,
              settings: (backup.settings as AppState['settings']) || { soundEnabled: true, lastVisitDate: getTodayStr() },
            };
            restoredState.totalPoints = calculateTotalPoints(restoredState);
            saveState(restoredState);
            setState(() => ({ ...restoredState }));
          } else {
            // 3. 备份表也没有数据：检查本地是否有数据需要上传
            const localState = loadState();
            const hasData =
              localState.primaryCategories.length > 0 ||
              localState.secondaryCategories.length > 0 ||
              localState.tertiaryCategories.length > 0 ||
              localState.tasks.length > 0 ||
              localState.dailyRecords.length > 0;

            if (hasData) {
              await syncLocalStateToDb(user.id, localState);
              await createBackup(localState, '初始同步');
            }
          }
        }

        setHasSyncedOnLogin(true);
      } catch (error) {
        console.error('✗ 从 Supabase 加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserDataFromSupabase();
  }, [user, createBackup, hasSyncedOnLogin]);

  // 状态变化时保存到 localStorage 并自动备份到 Supabase（排除初始化阶段）
  useEffect(() => {
    if (hasSyncedOnLogin) {
      saveState(state);

      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }

      backupTimerRef.current = setTimeout(async () => {
        if (user) {
          setIsSyncing(true);
          try {
            await autoBackup(state);
          } catch (error) {
            console.error('✗ 自动备份失败:', error);
          } finally {
            setIsSyncing(false);
          }
        }
      }, 2000); // 2 秒防抖
    }

    return () => {
      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }
    };
  }, [state, hasSyncedOnLogin, user, autoBackup]);

  // ============================================
  // 徽章解锁副作用（供业务方法复用）
  // ============================================
  const unlockBadges = (nextState: AppState) => {
    const unlocked = checkAndUnlockBadges(nextState);
    const customUnlocked = checkCustomBadges(nextState);
    if (unlocked.length === 0 && customUnlocked.length === 0) return nextState;

    playBadgeSound(nextState.settings.soundEnabled);
    const now = Date.now();

    let badges = nextState.badges;
    if (unlocked.length > 0) {
      setNewlyUnlockedBadges(unlocked);
      badges = badges.map(b =>
        unlocked.includes(b.id) ? { ...b, unlockedAt: now } : b
      );
    }

    let customBadges = nextState.customBadges;
    if (customUnlocked.length > 0) {
      customBadges = customBadges.map(b =>
        customUnlocked.includes(b.id) ? { ...b, unlockedAt: now } : b
      );
    }

    if (user) {
      unlocked.forEach(badgeType => {
        upsertBadge(user.id, badgeType).then(({ error }) => {
          if (error) console.error('badge unlock sync error:', error);
        });
      });
      customUnlocked.forEach(badgeId => {
        upsertCustomBadgeUnlock(user.id, badgeId).then(({ error }) => {
          if (error) console.error('custom badge unlock sync error:', error);
        });
      });
    }

    return { ...nextState, badges, customBadges };
  };

  // ============================================
  // 自定义徽章（P2-2）
  // ============================================
  const addCustomBadge = useCallback(async (badge: Omit<CustomBadge, 'id' | 'createdAt' | 'unlockedAt'>) => {
    if (!user) return;
    const { data, error } = await insertCustomBadge(user.id, badge);
    if (error || !data) {
      console.error('addCustomBadge: Supabase error:', error);
      return;
    }
    const newBadge: CustomBadge = {
      ...badge,
      id: data.id,
      createdAt: Date.now(),
    };
    setState(prev => ({ ...prev, customBadges: [...prev.customBadges, newBadge] }));
  }, [user]);

  const editCustomBadge = useCallback(async (badgeId: string, updates: Partial<CustomBadge>) => {
    if (!user) return;
    const { error } = await updateCustomBadge(badgeId, updates);
    if (error) console.error('editCustomBadge: Supabase error:', error);
    setState(prev => ({
      ...prev,
      customBadges: prev.customBadges.map(b => b.id === badgeId ? { ...b, ...updates } : b),
    }));
  }, [user]);

  const deleteCustomBadge = useCallback(async (badgeId: string) => {
    if (!user) return;
    const { error } = await deleteCustomBadgeApi(badgeId);
    if (error) console.error('deleteCustomBadge: Supabase error:', error);
    deleteCustomBadgeUnlock(user.id, badgeId).then(({ error }) => {
      if (error) console.error('deleteCustomBadgeUnlock error:', error);
    });
    setState(prev => ({
      ...prev,
      customBadges: prev.customBadges.filter(b => b.id !== badgeId),
    }));
  }, [user]);

  // ============================================
  // 任务
  // ============================================
  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    // 显式携带本地 id 插入云端，保证本地与云端主键一致（否则后续 update/delete 会匹配 0 行）
    const { error } = await insertTask(user.id, task, newTask.id);
    if (error) console.error('addTask: Supabase error:', error);

    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
  }, [user]);

  const editTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    const { error } = await updateTask(taskId, updates);
    if (error) console.error('editTask: Supabase error:', error);

    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }, [user]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return;
    const { error } = await softDeleteTask(taskId);
    if (error) console.error('deleteTask: Supabase error:', error);

    const today = getTodayStr();
    setState(prev => {
      const newState: AppState = {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId),
      };

      const todayRecord = newState.dailyRecords.find(r => r.date === today);
      if (todayRecord && todayRecord.tasks.some(t => t.taskId === taskId)) {
        const newRecord = {
          ...todayRecord,
          tasks: todayRecord.tasks.filter(t => t.taskId !== taskId),
        };
        const existingRecords = newState.dailyRecords.filter(r => r.date !== today);
        newState.dailyRecords = [...existingRecords, newRecord];
      }

      return newState;
    });
  }, [user]);

  // ============================================
  // 分类（一/二/三级）
  // ============================================
  const addPrimaryCategory = useCallback(async (category: Omit<PrimaryCategory, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newCategory: PrimaryCategory = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const { error } = await insertPrimaryCategory(user.id, category, newCategory.id);
    if (error) console.error('addPrimaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      primaryCategories: [...prev.primaryCategories, newCategory],
    }));
  }, [user]);

  const editPrimaryCategory = useCallback(async (categoryId: string, updates: Partial<PrimaryCategory>) => {
    if (!user) return;
    const { error } = await updatePrimaryCategory(categoryId, updates);
    if (error) console.error('editPrimaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      primaryCategories: prev.primaryCategories.map(c => c.id === categoryId ? { ...c, ...updates } : c),
    }));
  }, [user]);

  const deletePrimaryCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    const { error } = await deletePrimaryCategoryApi(categoryId);
    if (error) console.error('deletePrimaryCategory: Supabase error:', error);

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
        tertiaryCategories: prev.tertiaryCategories.filter(c => secondaryCatIds.has(c.secondaryCategoryId)),
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
  }, [user]);

  const addSecondaryCategory = useCallback(async (category: Omit<SecondaryCategory, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newCategory: SecondaryCategory = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const { error } = await insertSecondaryCategory(user.id, category, newCategory.id);
    if (error) console.error('addSecondaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      secondaryCategories: [...prev.secondaryCategories, newCategory],
    }));
  }, [user]);

  const editSecondaryCategory = useCallback(async (categoryId: string, updates: Partial<SecondaryCategory>) => {
    if (!user) return;
    const { error } = await updateSecondaryCategory(categoryId, updates);
    if (error) console.error('editSecondaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      secondaryCategories: prev.secondaryCategories.map(c => c.id === categoryId ? { ...c, ...updates } : c),
    }));
  }, [user]);

  const deleteSecondaryCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    const { error } = await deleteSecondaryCategoryApi(categoryId);
    if (error) console.error('deleteSecondaryCategory: Supabase error:', error);

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
  }, [user]);

  const addTertiaryCategory = useCallback(async (category: Omit<TertiaryCategory, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newCategory: TertiaryCategory = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    const { error } = await insertTertiaryCategory(user.id, category, newCategory.id);
    if (error) console.error('addTertiaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      tertiaryCategories: [...prev.tertiaryCategories, newCategory],
    }));
  }, [user]);

  const editTertiaryCategory = useCallback(async (categoryId: string, updates: Partial<TertiaryCategory>) => {
    if (!user) return;
    const { error } = await updateTertiaryCategory(categoryId, updates);
    if (error) console.error('editTertiaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      tertiaryCategories: prev.tertiaryCategories.map(c => c.id === categoryId ? { ...c, ...updates } : c),
    }));
  }, [user]);

  const deleteTertiaryCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    const { error } = await deleteTertiaryCategoryApi(categoryId);
    if (error) console.error('deleteTertiaryCategory: Supabase error:', error);

    setState(prev => ({
      ...prev,
      tertiaryCategories: prev.tertiaryCategories.filter(c => c.id !== categoryId),
      tasks: prev.tasks.map(t =>
        t.tertiaryCategoryId === categoryId
          ? { ...t, tertiaryCategoryId: undefined }
          : t
      ),
    }));
  }, [user]);

  // ============================================
  // 今日任务
  // ============================================
  const addTertiaryCategoryToToday = useCallback(async (tertiaryCategoryId: string) => {
    if (!user) return;
    const today = getTodayStr();

    setState(prev => {
      const tertiaryCat = prev.tertiaryCategories.find(c => c.id === tertiaryCategoryId);
      if (!tertiaryCat) return prev;

      const record = getOrCreateTodayRecord(prev);
      const newDailyTask: DailyTask = {
        id: crypto.randomUUID(),
        taskId: tertiaryCategoryId,
        completed: false,
      };

      const newRecord = {
        ...record,
        tasks: [...record.tasks, newDailyTask],
      };

      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('addTertiaryCategoryToToday sync error:', error);
      });

      return newState;
    });
  }, [user]);

  const addTaskToToday = useCallback(async (taskId: string) => {
    if (!user) return;
    const today = getTodayStr();

    setState(prev => {
      const record = getOrCreateTodayRecord(prev);
      const newTask: DailyTask = {
        id: crypto.randomUUID(),
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

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('addTaskToToday sync error:', error);
      });

      return newState;
    });
  }, [user]);

  /** 添加一次性临时任务到今日清单（P2-1，不入作业库） */  const addTemporaryTaskToToday = useCallback(async (name: string, points: number, icon?: string) => {
    if (!user || !name.trim()) return;
    const today = getTodayStr();
    const tempId = crypto.randomUUID();

    const tempTask: Task = {
      id: tempId,
      name: name.trim(),
      basePoints: Math.max(1, points || 1),
      icon: icon || '📝',
      isTemporary: true,
      createdAt: Date.now(),
    };

    // 同步到 tasks 表（is_temporary=true，作业库中不展示；显式携带本地 id）
    const { error } = await insertTask(user.id, tempTask, tempId);
    if (error) console.error('addTemporaryTaskToToday: Supabase error:', error);

    setState(prev => {
      const record = getOrCreateTodayRecord(prev);
      const newDailyTask: DailyTask = {
        id: crypto.randomUUID(),
        taskId: tempId,
        completed: false,
      };
      const newRecord = {
        ...record,
        tasks: [...record.tasks, newDailyTask],
      };
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        tasks: [...prev.tasks, tempTask],
        dailyRecords: [...existingRecords, newRecord],
      };

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('addTemporaryTaskToToday sync error:', error);
      });

      return newState;
    });
  }, [user]);

  /** 一键生成今日清单：按重复规则把到期任务加入今日（去重，返回新增数量） */
  const generateTodayTasks = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const today = getTodayStr();
    let added = 0;

    setState(prev => {
      const record = getOrCreateTodayRecord(prev);
      const existingTaskIds = new Set(record.tasks.map(t => t.taskId));
      const dueCategories = getTertiaryDueToday(prev);
      const newDailyTasks: DailyTask[] = [];

      dueCategories.forEach(cat => {
        if (!existingTaskIds.has(cat.id)) {
          newDailyTasks.push({ id: crypto.randomUUID(), taskId: cat.id, completed: false });
        }
      });

      if (newDailyTasks.length === 0) return prev;
      added = newDailyTasks.length;

      const newRecord = {
        ...record,
        tasks: [...record.tasks, ...newDailyTasks],
      };
      const existingRecords = prev.dailyRecords.filter(r => r.date !== today);
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('generateTodayTasks sync error:', error);
      });

      return newState;
    });

    return added;
  }, [user]);

  const removeTaskFromToday = useCallback(async (dailyTaskId: string) => {
    if (!user) return;
    const today = getTodayStr();

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

      let newState: AppState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };

      newState.totalPoints = calculateTotalPoints(newState);

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('removeTaskFromToday sync error:', error);
      });
      updateProfileTotalPoints(user.id, newState.totalPoints).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });

      return newState;
    });
  }, [user]);

  const toggleTaskCompletion = useCallback(async (dailyTaskId: string) => {
    if (!user) return;
    const today = getTodayStr();

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
      let newState: AppState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };

      newState.totalPoints = calculateTotalPoints(newState);

      if (newCompleted) {
        playSuccessSound(prev.settings.soundEnabled);
        playPointSound(prev.settings.soundEnabled);
      }

      newState = unlockBadges(newState);

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('toggleTaskCompletion sync error:', error);
      });
      updateProfileTotalPoints(user.id, newState.totalPoints).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });

      return newState;
    });
  }, [user]);

  const completeAllTasks = useCallback(async () => {
    if (!user) return;
    const today = getTodayStr();

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
      let newState: AppState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };

      newState.totalPoints = calculateTotalPoints(newState);

      playSuccessSound(prev.settings.soundEnabled);

      newState = unlockBadges(newState);

      upsertDailyRecord(user.id, today, newRecord.tasks, newRecord.totalPoints).then(({ error }) => {
        if (error) console.error('completeAllTasks sync error:', error);
      });
      updateProfileTotalPoints(user.id, newState.totalPoints).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });

      return newState;
    });
  }, [user]);

  // ============================================
  // 手动刷新（重新从独立表拉取；需定义在兑换审核之前，供其失败时兜底）
  // ============================================
  const refreshData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setHasSyncedOnLogin(false);

    try {
      const data = await fetchAllUserData(user.id);

      if (hasIndependentData(data)) {
        const convertedState = buildStateFromDb(data);
        convertedState.totalPoints = calculateTotalPoints(convertedState);
        saveState(convertedState);
        setState(() => ({ ...convertedState }));
      } else {
        const backupData = await fetchLatestBackup(user.id);
        if (backupData?.backup_data) {
          const backup = backupData.backup_data as Record<string, unknown>;
          const restoredState: AppState = {
            primaryCategories: (backup.primaryCategories as AppState['primaryCategories']) || [],
            secondaryCategories: (backup.secondaryCategories as AppState['secondaryCategories']) || [],
            tertiaryCategories: (backup.tertiaryCategories as AppState['tertiaryCategories']) || [],
            tasks: (backup.tasks as AppState['tasks']) || [],
            dailyRecords: (backup.dailyRecords as AppState['dailyRecords']) || [],
            rewards: (backup.rewards as AppState['rewards']) || [],
            redemptions: (backup.redemptions as AppState['redemptions']) || [],
            badges: (backup.badges as AppState['badges']) || [],
            customBadges: (backup.customBadges as AppState['customBadges']) || [],
            pointAdjustments: (backup.pointAdjustments as AppState['pointAdjustments']) || [],
            totalPoints: (backup.totalPoints as number) || 0,
            settings: (backup.settings as AppState['settings']) || { soundEnabled: true, lastVisitDate: getTodayStr() },
          };
          restoredState.totalPoints = calculateTotalPoints(restoredState);
          saveState(restoredState);
          setState(() => ({ ...restoredState }));
        }
      }

      setHasSyncedOnLogin(true);
    } catch (error) {
      console.error('✗ 刷新数据失败:', error);
      setHasSyncedOnLogin(true);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ============================================
  // 奖品与兑换
  // ============================================
  const addReward = useCallback(async (reward: Omit<Reward, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newReward: Reward = {
      ...reward,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    // 显式携带本地 id 插入云端：redemptions.reward_id 外键依赖该 id，
    // 双轨 id 会导致兑换记录插入云端时 FK 违规而静默丢失（次日重载即消失）
    const { error } = await insertReward(user.id, reward, newReward.id);
    if (error) console.error('addReward: Supabase error:', error);

    setState(prev => ({
      ...prev,
      rewards: [...prev.rewards, newReward],
    }));
  }, [user]);

  const editReward = useCallback(async (rewardId: string, updates: Partial<Reward>) => {
    if (!user) return;
    const { error } = await updateReward(rewardId, updates);
    if (error) console.error('editReward: Supabase error:', error);

    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r),
    }));
  }, [user]);

  const deleteReward = useCallback(async (rewardId: string) => {
    if (!user) return;
    const { error } = await deleteRewardApi(rewardId);
    if (error) console.error('deleteReward: Supabase error:', error);

    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== rewardId),
    }));
  }, [user]);

  const redeemReward = useCallback(async (reward: Reward): Promise<
    { ok: boolean; reason?: 'no-user' | 'insufficient' | 'cloud-error'; message?: string }
  > => {
    if (!user) return { ok: false, reason: 'no-user' };
    // 兑换额度以「可用积分 = 总积分 - 冻结积分」为准
    if (getAvailablePoints(state) < reward.points) return { ok: false, reason: 'insufficient' };

    const redemptionId = crypto.randomUUID();
    const redemption: Redemption = {
      id: redemptionId,
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
      redeemedAt: Date.now(),
      status: 'pending', // 孩子发起兑换 → 待家长确认，积分冻结不扣分
    };

    // 云端插入失败时阻断本地提交：否则兑换记录只在本地存在，
    // 次日从独立表重建 state 时会整体丢失（积分也随之"复原"）
    const { error } = await insertRedemption(user.id, {
      id: redemptionId,
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
    });
    if (error) {
      console.error('redeemReward: Supabase error:', error);
      return { ok: false, reason: 'cloud-error', message: error.message };
    }

    setState(prev => {
      let newState: AppState = {
        ...prev,
        redemptions: [redemption, ...prev.redemptions],
      };

      playRedeemSound(prev.settings.soundEnabled);

      return newState;
    });

    return { ok: true };
  }, [user, state]);

  /** 家长审核：通过兑换（正式扣分） */
  const approveRedemption = useCallback(async (redemptionId: string) => {
    if (!user) return false;

    let newState: AppState;
    setState(prev => {
      const newRedemptions = prev.redemptions.map(r =>
        r.id === redemptionId ? { ...r, status: 'approved' as const } : r
      );
      newState = {
        ...prev,
        redemptions: newRedemptions,
      };
      newState.totalPoints = calculateTotalPoints(newState);
      saveState(newState);
      return newState;
    });

    (async () => {
      try {
        const { count, error: updateError } = await updateRedemptionStatus(user.id, redemptionId, 'approved');
        if (updateError) {
          console.error('Failed to approve redemption:', updateError);
          return;
        }
        if (count === 0) {
          // 云端无此记录（双轨 id 遗留数据）：回滚本地状态并全量刷新
          console.error('approveRedemption: 云端未找到兑换记录，触发全量刷新');
          refreshData();
          return;
        }
        const { error: profileError } = await updateProfileTotalPoints(user.id, newState!.totalPoints);
        if (profileError) console.error('Failed to sync total_points:', profileError);
        await createBackup(newState!, '通过兑换申请');
      } catch (error) {
        console.error('Error syncing approval:', error);
      }
    })();

    return true;
  }, [user, createBackup, refreshData]);

  /** 家长审核：驳回兑换（冻结退还，不扣分） */
  const rejectRedemption = useCallback(async (redemptionId: string) => {
    if (!user) return false;

    let newState: AppState;
    setState(prev => {
      const newRedemptions = prev.redemptions.map(r =>
        r.id === redemptionId ? { ...r, status: 'rejected' as const } : r
      );
      newState = {
        ...prev,
        redemptions: newRedemptions,
      };
      newState.totalPoints = calculateTotalPoints(newState);
      saveState(newState);
      return newState;
    });

    (async () => {
      try {
        const { count, error: updateError } = await updateRedemptionStatus(user.id, redemptionId, 'rejected');
        if (updateError) {
          console.error('Failed to reject redemption:', updateError);
          return;
        }
        if (count === 0) {
          console.error('rejectRedemption: 云端未找到兑换记录，触发全量刷新');
          refreshData();
          return;
        }
        await createBackup(newState!, '驳回兑换申请');
      } catch (error) {
        console.error('Error syncing rejection:', error);
      }
    })();

    return true;
  }, [user, createBackup, refreshData]);

  /** 家长确认：奖品已兑现 */
  const fulfillRedemption = useCallback(async (redemptionId: string) => {
    if (!user) return false;

    setState(prev => {
      const newRedemptions = prev.redemptions.map(r =>
        r.id === redemptionId ? { ...r, status: 'fulfilled' as const } : r
      );
      return { ...prev, redemptions: newRedemptions };
    });

    const { count, error } = await updateRedemptionStatus(user.id, redemptionId, 'fulfilled');
    if (error) {
      console.error('Failed to fulfill redemption:', error);
      return false;
    }
    if (count === 0) {
      console.error('fulfillRedemption: 云端未找到兑换记录，触发全量刷新');
      refreshData();
      return false;
    }
    return true;
  }, [user, refreshData]);

  const deleteRedemption = useCallback(async (redemptionId: string) => {
    if (!user) return false;

    let newState: AppState;
    setState(prev => {
      const newRedemptions = prev.redemptions.filter(r => r.id !== redemptionId);

      newState = {
        ...prev,
        redemptions: newRedemptions,
      };

      newState.totalPoints = calculateTotalPoints(newState);

      saveState(newState);

      return newState;
    });

    (async () => {
      try {
        const { error: deleteError } = await deleteRedemptionApi(user.id, redemptionId);
        if (deleteError) {
          console.error('Failed to delete from redemptions:', deleteError);
          return;
        }

        const { error: profileError } = await updateProfileTotalPoints(user.id, newState!.totalPoints);
        if (profileError) {
          console.error('Failed to update profiles total_points:', profileError);
        }

        await createBackup(newState!, '删除兑换记录');
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
      }
    })();

    return true;
  }, [user, createBackup]);

  // ============================================
  // 积分调整
  // ============================================
  const adjustPoints = useCallback(async (points: number, reason: string) => {
    if (!user) return false;

    const { data, error } = await insertPointAdjustment(user.id, points, reason);
    if (error) {
      console.error('Failed to insert point adjustment:', error);
      return false;
    }

    const adjustment: PointAdjustment = {
      id: data.id,
      points,
      reason,
      adjustedAt: Date.now(),
      createdAt: Date.now(),
    };

    setState(prev => {
      let newState: AppState = {
        ...prev,
        pointAdjustments: [adjustment, ...prev.pointAdjustments],
      };

      newState.totalPoints = calculateTotalPoints(newState);

      if (points > 0) {
        playPointSound(newState.settings.soundEnabled);
        newState = unlockBadges(newState);
      }

      updateProfileTotalPoints(user.id, newState.totalPoints).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });

      return newState;
    });

    return true;
  }, [user]);

  const editPointAdjustment = useCallback(async (id: string, points: number, reason: string) => {
    if (!user) return false;

    let newState: AppState;
    setState(prev => {
      const newPointAdjustments = prev.pointAdjustments.map(adj =>
        adj.id === id ? { ...adj, points, reason } : adj
      );

      newState = {
        ...prev,
        pointAdjustments: newPointAdjustments,
      };

      newState.totalPoints = calculateTotalPoints(newState);

      saveState(newState);

      return newState;
    });

    (async () => {
      try {
        const { error: adjustError } = await updatePointAdjustment(id, user.id, points, reason);
        if (adjustError) {
          console.error('Failed to update point_adjustments:', adjustError);
          return;
        }

        const { error: profileError } = await updateProfileTotalPoints(user.id, newState!.totalPoints);
        if (profileError) {
          console.error('Failed to update profiles total_points:', profileError);
        }

        await createBackup(newState!, '编辑积分调整记录');
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
      }
    })();

    return true;
  }, [user, createBackup]);

  const deletePointAdjustment = useCallback(async (id: string) => {
    if (!user) return false;

    let newState: AppState;
    setState(prev => {
      const newPointAdjustments = prev.pointAdjustments.filter(adj => adj.id !== id);

      newState = {
        ...prev,
        pointAdjustments: newPointAdjustments,
      };

      newState.totalPoints = calculateTotalPoints(newState);

      saveState(newState);

      return newState;
    });

    (async () => {
      try {
        const { error: deleteError } = await deletePointAdjustmentApi(id, user.id);
        if (deleteError) {
          console.error('Failed to delete from point_adjustments:', deleteError);
          return;
        }

        const { error: profileError } = await updateProfileTotalPoints(user.id, newState!.totalPoints);
        if (profileError) {
          console.error('Failed to update profiles total_points:', profileError);
        }

        await createBackup(newState!, '删除积分调整记录');
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
      }
    })();

    return true;
  }, [user, createBackup]);

  // ============================================
  // 补签卡（P1-5：连击友好化）
  // ============================================
  /** 购买补签卡（消耗积分，记录积分流水） */
  const buyMakeupCard = useCallback(async () => {
    if (!user) return false;
    if (getAvailablePoints(state) < MAKEUP_CARD_PRICE) return false;

    // 扣分走积分调整流水，保证审计链完整
    const { data, error } = await insertPointAdjustment(user.id, -MAKEUP_CARD_PRICE, '购买补签卡');
    if (error) {
      console.error('buyMakeupCard: insert adjustment error:', error);
      return false;
    }

    const adjustment: PointAdjustment = {
      id: data.id,
      points: -MAKEUP_CARD_PRICE,
      reason: '购买补签卡',
      adjustedAt: Date.now(),
      createdAt: Date.now(),
    };

    setState(prev => {
      let newState: AppState = {
        ...prev,
        pointAdjustments: [adjustment, ...prev.pointAdjustments],
        settings: {
          ...prev.settings,
          makeupCards: (prev.settings.makeupCards || 0) + 1,
        },
      };
      newState.totalPoints = calculateTotalPoints(newState);
      updateProfileTotalPoints(user.id, newState.totalPoints).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });
      return newState;
    });

    return true;
  }, [user, state]);

  /** 使用补签卡：将昨天补记为"达成"，保住连击 */
  const useMakeupCard = useCallback(async () => {
    if (!user) return false;
    const yesterday = getYesterdayStr();

    let canUse = false;
    setState(prev => {
      const hasCard = (prev.settings.makeupCards || 0) > 0;
      const alreadyUsed = prev.settings.usedMakeupDates?.includes(yesterday);
      // 昨天本身已达成则无需补签
      const yesterdayAchieved = isDayAchieved(prev, yesterday);

      if (!hasCard || alreadyUsed || yesterdayAchieved) {
        return prev;
      }
      canUse = true;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          makeupCards: prev.settings.makeupCards - 1,
          usedMakeupDates: [...(prev.settings.usedMakeupDates || []), yesterday],
        },
      };
    });

    return canUse;
  }, [user]);

  // ============================================
  // 设置与数据管理
  // ============================================
  const toggleSound = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, []);

  /** 更新提醒设置（PWA 本地通知） */
  const updateReminder = useCallback((enabled: boolean, time?: string) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        remindEnabled: enabled,
        remindTime: time ?? prev.settings.remindTime ?? '19:00',
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

  /** 重置所有数据：重置前强制创建云端备份快照（防误触丢失） */
  const resetAll = useCallback(async () => {
    if (!user) return;
    try {
      await createBackup(state, '重置所有数据前自动备份');
    } catch (error) {
      console.error('重置前备份失败:', error);
    }
    setState(resetAllData());
  }, [user, state, createBackup]);

  /** 重置今日记录：重置前强制创建云端备份快照 */
  const resetToday = useCallback(async () => {
    if (!user) return;
    try {
      await createBackup(state, '重置今日记录前自动备份');
    } catch (error) {
      console.error('重置前备份失败:', error);
    }
    setState(prev => resetTodayRecord(prev));
  }, [user, state, createBackup]);

  const clearNewlyUnlockedBadges = useCallback(() => {
    setNewlyUnlockedBadges([]);
  }, []);

  const getTodayRecord = useCallback(() => {
    const today = getTodayStr();
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

  // ============================================
  // Realtime 订阅（清理旧订阅后重建）
  // ============================================
  useEffect(() => {
    if (!user || !hasSyncedOnLogin) return;

    subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    subscriptionsRef.current = [];

    const unsubscribers = subscribeToChanges(user.id, {
      onTasksChange: () => refreshData(),
      onDailyRecordsChange: () => refreshData(),
      onProfileChange: (totalPoints) => {
        setState(prev => ({ ...prev, totalPoints }));
      },
      onPointAdjustmentsChange: () => refreshData(),
      onCategoriesChange: () => refreshData(),
      onRedemptionsChange: () => refreshData(),
    });
    subscriptionsRef.current = unsubscribers;
  }, [user, hasSyncedOnLogin, refreshData]);

  // 组件卸载时清理订阅
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current = [];
    };
  }, []);

  return {
    state,
    newlyUnlockedBadges,
    isLoading,
    isSyncing,
    /** 可用积分（总积分 - 冻结中的兑换），孩子兑换额度判断 */
    availablePoints: getAvailablePoints(state),
    addTask,
    editTask,
    deleteTask,
    addPrimaryCategory,
    editPrimaryCategory,
    deletePrimaryCategory,
    addSecondaryCategory,
    editSecondaryCategory,
    deleteSecondaryCategory,
    addTertiaryCategory,
    editTertiaryCategory,
    deleteTertiaryCategory,
    addTaskToToday,
    addTertiaryCategoryToToday,
    addTemporaryTaskToToday,
    generateTodayTasks,
    removeTaskFromToday,
    toggleTaskCompletion,
    completeAllTasks,
    addReward,
    editReward,
    deleteReward,
    redeemReward,
    approveRedemption,
    rejectRedemption,
    fulfillRedemption,
    deleteRedemption,
    toggleSound,
    updateReminder,
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
    buyMakeupCard,
    useMakeupCard,
    addCustomBadge,
    editCustomBadge,
    deleteCustomBadge,
  };
};
