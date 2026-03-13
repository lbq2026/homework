import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Task, Reward, Redemption, BadgeType, DailyTask, PointAdjustment, SecondaryCategory, TertiaryCategory, PrimaryCategory } from '@/types';
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
import { useAuth } from './useAuth.tsx';
import { useDataBackup } from './useDataBackup.ts';
import { supabase } from '@/lib/supabase';

export const useSyncedAppState = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSyncedOnLogin, setHasSyncedOnLogin] = useState(false);
  const { user } = useAuth();
  const { createBackup, autoBackup } = useDataBackup();
  const backupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscriptionsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    setState(prev => {
      const calculatedPoints = calculateTotalPoints(prev);
      if (calculatedPoints !== prev.totalPoints) {
        return { ...prev, totalPoints: calculatedPoints };
      }
      return prev;
    });
  }, [state.dailyRecords, state.pointAdjustments, state.redemptions, hasSyncedOnLogin]);

  // 登录后从 Supabase 加载历史数据
  useEffect(() => {
    const loadUserDataFromSupabase = async () => {
      if (!user || hasSyncedOnLogin) return;
      
      console.log('=== 开始加载用户数据 ===');
      console.log('用户ID:', user.id);
      setIsLoading(true);
      
      try {
        // 1. 优先从独立表加载数据
        console.log('步骤1: 尝试从独立表加载数据...');
        
        const [
          { data: primaryCategoriesData },
          { data: secondaryCategoriesData },
          { data: tertiaryCategoriesData },
          { data: tasksData },
          { data: dailyRecordsData },
          { data: rewardsData },
          { data: redemptionsData },
          { data: badgesData },
          { data: pointAdjustmentsData },
          { data: profileData }
        ] = await Promise.all([
          supabase.from('primary_categories').select('*').eq('user_id', user.id),
          supabase.from('secondary_categories').select('*').eq('user_id', user.id),
          supabase.from('tertiary_categories').select('*').eq('user_id', user.id),
          supabase.from('tasks').select('*').eq('user_id', user.id),
          supabase.from('daily_records').select('*').eq('user_id', user.id),
          supabase.from('rewards').select('*').eq('user_id', user.id),
          supabase.from('redemptions').select('*').eq('user_id', user.id),
          supabase.from('badges').select('*').eq('user_id', user.id),
          supabase.from('point_adjustments').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('*').eq('id', user.id).single()
        ]);
        
        console.log('从独立表获取的数据:');
        console.log('- primaryCategories:', primaryCategoriesData?.length || 0);
        console.log('- secondaryCategories:', secondaryCategoriesData?.length || 0);
        console.log('- tertiaryCategories:', tertiaryCategoriesData?.length || 0);
        console.log('- tasks:', tasksData?.length || 0);
        console.log('- dailyRecords:', dailyRecordsData?.length || 0);
        console.log('- rewards:', rewardsData?.length || 0);
        console.log('- redemptions:', redemptionsData?.length || 0);
        console.log('- badges:', badgesData?.length || 0);
        console.log('- pointAdjustments:', pointAdjustmentsData?.length || 0);
        console.log('- profile:', profileData);
        
        const hasIndependentData = 
          (primaryCategoriesData && primaryCategoriesData.length > 0) ||
          (secondaryCategoriesData && secondaryCategoriesData.length > 0) ||
          (tertiaryCategoriesData && tertiaryCategoriesData.length > 0) ||
          (tasksData && tasksData.length > 0) ||
          (dailyRecordsData && dailyRecordsData.length > 0) ||
          (rewardsData && rewardsData.length > 0) ||
          (redemptionsData && redemptionsData.length > 0) ||
          (pointAdjustmentsData && pointAdjustmentsData.length > 0);
        
        if (hasIndependentData) {
          console.log('✓ 找到独立表数据，开始转换...');
          
          // 转换独立表数据到新格式
          const convertedState: AppState = loadState();
          
          // 转换 primaryCategories
          if (primaryCategoriesData && primaryCategoriesData.length > 0) {
            convertedState.primaryCategories = primaryCategoriesData.map((c: any) => ({
              id: c.id,
              name: c.name,
              icon: c.icon || '📚',
              key: c.key || 'category',
              createdAt: new Date(c.created_at).getTime(),
            }));
          }
          
          // 转换 secondaryCategories
          if (secondaryCategoriesData && secondaryCategoriesData.length > 0) {
            convertedState.secondaryCategories = secondaryCategoriesData.map((c: any) => ({
              id: c.id,
              name: c.name,
              icon: c.icon || '📖',
              primaryCategoryId: c.primary_category_id,
              createdAt: new Date(c.created_at).getTime(),
            }));
          }
          
          // 转换 tertiaryCategories
          if (tertiaryCategoriesData && tertiaryCategoriesData.length > 0) {
            convertedState.tertiaryCategories = tertiaryCategoriesData.map((c: any) => ({
              id: c.id,
              name: c.name,
              icon: c.icon || '📝',
              defaultPoints: c.default_points || 1,
              secondaryCategoryId: c.secondary_category_id,
              createdAt: new Date(c.created_at).getTime(),
            }));
          }
          
          // 转换 tasks
          if (tasksData && tasksData.length > 0) {
            convertedState.tasks = tasksData.map((t: any) => ({
              id: t.id,
              name: t.name,
              basePoints: t.base_points || 1,
              icon: t.icon || '📚',
              primaryCategoryId: t.primary_category_id,
              secondaryCategoryId: t.secondary_category_id,
              tertiaryCategoryId: t.tertiary_category_id,
              createdAt: new Date(t.created_at).getTime(),
            }));
          }
          
          // 转换 dailyRecords
          if (dailyRecordsData && dailyRecordsData.length > 0) {
            convertedState.dailyRecords = dailyRecordsData.map((r: any) => ({
              date: r.date,
              tasks: r.tasks || [],
              totalPoints: r.total_points || 0,
            }));
          }
          
          // 转换 rewards
          if (rewardsData && rewardsData.length > 0) {
            convertedState.rewards = rewardsData.map((r: any) => ({
              id: r.id,
              name: r.name,
              points: r.points,
              icon: r.icon || '🎁',
              description: r.description || '',
              category: (r.category as 'entertainment' | 'physical' | 'privilege' | 'other') || 'other',
              createdAt: new Date(r.created_at).getTime(),
            }));
          }
          
          // 转换 redemptions
          if (redemptionsData && redemptionsData.length > 0) {
            convertedState.redemptions = redemptionsData.map((r: any) => ({
              id: r.id,
              rewardId: r.reward_id,
              rewardName: r.reward_name,
              points: r.points,
              redeemedAt: new Date(r.created_at).getTime(),
            }));
          }
          
          // 转换 badges
          if (badgesData && badgesData.length > 0) {
            convertedState.badges = convertedState.badges.map(b => {
              const unlocked = badgesData.find((ub: any) => ub.badge_type === b.id);
              if (unlocked) {
                return { ...b, unlockedAt: new Date(unlocked.unlocked_at).getTime() };
              }
              return b;
            });
          }
          
          // 转换 pointAdjustments
          if (pointAdjustmentsData && pointAdjustmentsData.length > 0) {
            convertedState.pointAdjustments = pointAdjustmentsData.map((p: any) => ({
              id: p.id,
              points: p.points,
              reason: p.reason,
              adjustedAt: new Date(p.created_at || p.adjusted_at).getTime(),
              createdAt: new Date(p.created_at).getTime(),
            }));
          }
          
          // 设置总积分
          if (profileData?.total_points !== undefined) {
            convertedState.totalPoints = profileData.total_points;
          }
          
          // 确保重新计算总积分
          convertedState.totalPoints = calculateTotalPoints(convertedState);
          console.log('重新计算后的总积分:', convertedState.totalPoints);
          
          // 保存并更新状态 - 使用函数式更新
          saveState(convertedState);
          setState(() => ({ ...convertedState }));
          console.log('✓ 已从独立表转换并加载数据');
          
          // 保存到备份表
          await createBackup(convertedState, '从独立表迁移');
          console.log('✓ 已将转换后的数据保存到备份表');
        } else {
          console.log('✗ 独立表没有数据，尝试从备份表加载...');
          
          // 2. 尝试从 data_backups 表获取最新备份
          const { data: backupData, error: backupError } = await supabase
            .from('data_backups')
            .select('id, backup_data, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!backupError && backupData?.backup_data) {
            console.log('✓ 找到备份数据，创建时间:', backupData.created_at);
            console.log('备份数据内容:', backupData.backup_data);
            
            const backup = backupData.backup_data as Record<string, unknown>;
            
            // 转换数据格式，确保包含所有分类数据
            const restoredState: AppState = {
              primaryCategories: (backup.primaryCategories as AppState['primaryCategories']) || [],
              secondaryCategories: (backup.secondaryCategories as AppState['secondaryCategories']) || [],
              tertiaryCategories: (backup.tertiaryCategories as AppState['tertiaryCategories']) || [],
              tasks: (backup.tasks as AppState['tasks']) || [],
              dailyRecords: (backup.dailyRecords as AppState['dailyRecords']) || [],
              rewards: (backup.rewards as AppState['rewards']) || [],
              redemptions: (backup.redemptions as AppState['redemptions']) || [],
              badges: (backup.badges as AppState['badges']) || [],
              pointAdjustments: (backup.pointAdjustments as AppState['pointAdjustments']) || [],
              totalPoints: (backup.totalPoints as number) || 0,
              settings: (backup.settings as AppState['settings']) || { soundEnabled: true, lastVisitDate: new Date().toISOString().split('T')[0] },
            };
            
            console.log('恢复后的状态:', restoredState);
            
            // 确保重新计算总积分
            restoredState.totalPoints = calculateTotalPoints(restoredState);
            console.log('重新计算后的总积分:', restoredState.totalPoints);
            
            // 保存到 localStorage 并更新状态
            saveState(restoredState);
            setState(() => ({ ...restoredState }));
            console.log('✓ 已从备份表恢复历史数据');
          } else {
            console.log('✗ 备份表也没有数据，backupError:', backupError);
            
            // 3. 检查本地是否有数据需要上传
            const localState = loadState();
            console.log('本地数据检查:', {
              primaryCategories: localState.primaryCategories.length,
              secondaryCategories: localState.secondaryCategories.length,
              tertiaryCategories: localState.tertiaryCategories.length,
              tasks: localState.tasks.length,
              dailyRecords: localState.dailyRecords.length,
            });
            
            const hasData = 
              localState.primaryCategories.length > 0 ||
              localState.secondaryCategories.length > 0 ||
              localState.tertiaryCategories.length > 0 ||
              localState.tasks.length > 0 ||
              localState.dailyRecords.length > 0;
            
            if (hasData) {
              console.log('✓ 有本地数据，上传到云端');
              
              // 先同步分类数据到独立表
              console.log('正在同步分类数据到 Supabase 独立表...');
              
              // 同步 primary_categories
              for (const cat of localState.primaryCategories) {
                await supabase.from('primary_categories').upsert({
                  id: cat.id,
                  user_id: user.id,
                  name: cat.name,
                  icon: cat.icon,
                  key: cat.key,
                  created_at: new Date(cat.createdAt).toISOString(),
                });
              }
              
              // 同步 secondary_categories
              for (const cat of localState.secondaryCategories) {
                await supabase.from('secondary_categories').upsert({
                  id: cat.id,
                  user_id: user.id,
                  name: cat.name,
                  icon: cat.icon,
                  primary_category_id: cat.primaryCategoryId,
                  created_at: new Date(cat.createdAt).toISOString(),
                });
              }
              
              // 同步 tertiary_categories
              for (const cat of localState.tertiaryCategories) {
                await supabase.from('tertiary_categories').upsert({
                  id: cat.id,
                  user_id: user.id,
                  name: cat.name,
                  icon: cat.icon,
                  default_points: cat.defaultPoints,
                  secondary_category_id: cat.secondaryCategoryId,
                  created_at: new Date(cat.createdAt).toISOString(),
                });
              }
              
              console.log('✓ 分类数据已同步到独立表');
              
              await createBackup(localState, '初始同步');
              console.log('✓ 已将本地数据同步到云端');
            } else {
              console.log('✗ 没有找到任何数据，使用默认数据');
            }
          }
        }
        
        setHasSyncedOnLogin(true);
        console.log('=== 数据加载完成 ===');
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
      
      // 自动备份到 Supabase - 使用防抖避免频繁备份
      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }
      
      backupTimerRef.current = setTimeout(async () => {
        if (user) {
          console.log('=== 自动备份到 Supabase ===');
          setIsSyncing(true);
          try {
            await autoBackup(state);
            console.log('✓ 自动备份完成');
          } catch (error) {
            console.error('✗ 自动备份失败:', error);
          } finally {
            setIsSyncing(false);
          }
        }
      }, 2000); // 2秒防抖
    }
    
    return () => {
      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }
    };
  }, [state, hasSyncedOnLogin, user, autoBackup]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) {
      console.error('addTask: user is null');
      return;
    }
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    const insertData = {
      user_id: user.id,
      name: task.name,
      base_points: task.basePoints,
      icon: task.icon,
      primary_category_id: task.primaryCategoryId,
      secondary_category_id: task.secondaryCategoryId,
      tertiary_category_id: task.tertiaryCategoryId,
      is_active: true,
    };
    console.log('addTask: inserting to Supabase:', insertData);
    
    const { data, error } = await supabase.from('tasks').insert(insertData).select();
    if (error) {
      console.error('addTask: Supabase error:', error);
    } else {
      console.log('addTask: Supabase success:', data);
    }
    
    setState(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
    }));
  }, [user]);

  const editTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;
    await supabase.from('tasks').update({
      name: updates.name,
      base_points: updates.basePoints,
      icon: updates.icon,
      primary_category_id: updates.primaryCategoryId,
      secondary_category_id: updates.secondaryCategoryId,
      tertiary_category_id: updates.tertiaryCategoryId,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId);
    
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
    }));
  }, [user]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!user) return;
    await supabase.from('tasks').update({ is_active: false }).eq('id', taskId);
    
    const today = new Date().toISOString().split('T')[0];
    setState(prev => {
      const newState = {
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

  const addSecondaryCategory = useCallback(async (category: Omit<SecondaryCategory, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newCategory: SecondaryCategory = {
      ...category,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    await supabase.from('secondary_categories').insert({
      user_id: user.id,
      name: category.name,
      icon: category.icon,
      primary_category_id: category.primaryCategoryId,
    });
    
    setState(prev => ({
      ...prev,
      secondaryCategories: [...prev.secondaryCategories, newCategory],
    }));
  }, [user]);

  const editSecondaryCategory = useCallback(async (categoryId: string, updates: Partial<SecondaryCategory>) => {
    if (!user) return;
    await supabase.from('secondary_categories').update({
      name: updates.name,
      icon: updates.icon,
      primary_category_id: updates.primaryCategoryId,
      updated_at: new Date().toISOString(),
    }).eq('id', categoryId);
    
    setState(prev => ({
      ...prev,
      secondaryCategories: prev.secondaryCategories.map(c => c.id === categoryId ? { ...c, ...updates } : c),
    }));
  }, [user]);

  const deleteSecondaryCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    await supabase.from('secondary_categories').delete().eq('id', categoryId);
    
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
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    await supabase.from('tertiary_categories').insert({
      user_id: user.id,
      name: category.name,
      icon: category.icon,
      default_points: category.defaultPoints,
      secondary_category_id: category.secondaryCategoryId,
    });
    
    setState(prev => ({
      ...prev,
      tertiaryCategories: [...prev.tertiaryCategories, newCategory],
    }));
  }, [user]);

  const editTertiaryCategory = useCallback(async (categoryId: string, updates: Partial<TertiaryCategory>) => {
    if (!user) return;
    await supabase.from('tertiary_categories').update({
      name: updates.name,
      icon: updates.icon,
      default_points: updates.defaultPoints,
      updated_at: new Date().toISOString(),
    }).eq('id', categoryId);
    
    setState(prev => ({
      ...prev,
      tertiaryCategories: prev.tertiaryCategories.map(c => c.id === categoryId ? { ...c, ...updates } : c),
    }));
  }, [user]);

  const deleteTertiaryCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    await supabase.from('tertiary_categories').delete().eq('id', categoryId);
    
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

  const addPrimaryCategory = useCallback(async (category: Omit<PrimaryCategory, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newCategory: PrimaryCategory = {
      ...category,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    await supabase.from('primary_categories').insert({
      user_id: user.id,
      name: category.name,
      icon: category.icon,
      key: category.key,
    });
    
    setState(prev => ({
      ...prev,
      primaryCategories: [...prev.primaryCategories, newCategory],
    }));
  }, [user]);

  const editPrimaryCategory = useCallback(async (categoryId: string, updates: Partial<PrimaryCategory>) => {
    if (!user) return;
    await supabase.from('primary_categories').update({
      name: updates.name,
      icon: updates.icon,
      key: updates.key,
      updated_at: new Date().toISOString(),
    }).eq('id', categoryId);
    
    setState(prev => ({
      ...prev,
      primaryCategories: prev.primaryCategories.map(c => c.id === categoryId ? { ...c, ...updates } : c),
    }));
  }, [user]);

  const deletePrimaryCategory = useCallback(async (categoryId: string) => {
    if (!user) return;
    await supabase.from('primary_categories').delete().eq('id', categoryId);
    
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

  const addTertiaryCategoryToToday = useCallback(async (tertiaryCategoryId: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    setState(prev => {
      const tertiaryCat = prev.tertiaryCategories.find(c => c.id === tertiaryCategoryId);
      if (!tertiaryCat) return prev;
      
      const record = getOrCreateTodayRecord(prev);
      const newDailyTask: DailyTask = {
        id: Date.now().toString(),
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
      
      // 同步到 Supabase
      supabase.from('daily_records').upsert({
        user_id: user.id,
        date: today,
        tasks: newRecord.tasks,
        total_points: newRecord.totalPoints,
      }, { onConflict: 'user_id,date' }).then(({ error }) => {
        if (error) console.error('addTertiaryCategoryToToday sync error:', error);
      });
      
      return newState;
    });
  }, [user]);

  const addTaskToToday = useCallback(async (taskId: string) => {
    if (!user) return;
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
      const newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      // 同步到 Supabase
      supabase.from('daily_records').upsert({
        user_id: user.id,
        date: today,
        tasks: newRecord.tasks,
        total_points: newRecord.totalPoints,
      }, { onConflict: 'user_id,date' }).then(({ error }) => {
        if (error) console.error('addTaskToToday sync error:', error);
      });
      
      return newState;
    });
  }, [user]);

  const removeTaskFromToday = useCallback(async (dailyTaskId: string) => {
    if (!user) return;
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
      
      let newState = {
        ...prev,
        dailyRecords: [...existingRecords, newRecord],
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      // 同步到 Supabase
      supabase.from('daily_records').upsert({
        user_id: user.id,
        date: today,
        tasks: newRecord.tasks,
        total_points: newRecord.totalPoints,
      }, { onConflict: 'user_id,date' }).then(({ error }) => {
        if (error) console.error('removeTaskFromToday sync error:', error);
      });
      
      // 更新 profiles 表的总积分
      supabase.from('profiles').update({
        total_points: newState.totalPoints,
      }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });
      
      return newState;
    });
  }, [user]);

  const toggleTaskCompletion = useCallback(async (dailyTaskId: string) => {
    if (!user) return;
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
      let newState = {
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
        
        // 同步徽章解锁到 Supabase
        unlocked.forEach(badgeType => {
          supabase.from('badges').upsert({
            user_id: user.id,
            badge_type: badgeType,
            unlocked_at: new Date(now).toISOString(),
          }).then(({ error }) => {
            if (error) console.error('badge unlock sync error:', error);
          });
        });
      }
      
      // 同步到 Supabase
      supabase.from('daily_records').upsert({
        user_id: user.id,
        date: today,
        tasks: newRecord.tasks,
        total_points: newRecord.totalPoints,
      }, { onConflict: 'user_id,date' }).then(({ error }) => {
        if (error) console.error('toggleTaskCompletion sync error:', error);
      });
      
      // 更新 profiles 表的总积分
      supabase.from('profiles').update({
        total_points: newState.totalPoints,
      }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });
      
      return newState;
    });
  }, [user]);

  const completeAllTasks = useCallback(async () => {
    if (!user) return;
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
      let newState = {
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
        
        // 同步徽章解锁到 Supabase
        unlocked.forEach(badgeType => {
          supabase.from('badges').upsert({
            user_id: user.id,
            badge_type: badgeType,
            unlocked_at: new Date().toISOString(),
          }).then(({ error }) => {
            if (error) console.error('badge unlock sync error:', error);
          });
        });
      }
      
      // 同步到 Supabase
      supabase.from('daily_records').upsert({
        user_id: user.id,
        date: today,
        tasks: newRecord.tasks,
        total_points: newRecord.totalPoints,
      }, { onConflict: 'user_id,date' }).then(({ error }) => {
        if (error) console.error('completeAllTasks sync error:', error);
      });
      
      // 更新 profiles 表的总积分
      supabase.from('profiles').update({
        total_points: newState.totalPoints,
      }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });
      
      return newState;
    });
  }, [user]);

  const addReward = useCallback(async (reward: Omit<Reward, 'id' | 'createdAt'>) => {
    if (!user) return;
    const newReward: Reward = {
      ...reward,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };
    
    await supabase.from('rewards').insert({
      user_id: user.id,
      name: reward.name,
      points: reward.points,
      icon: reward.icon,
      description: reward.description,
      category: reward.category,
    });
    
    setState(prev => ({
      ...prev,
      rewards: [...prev.rewards, newReward],
    }));
  }, [user]);

  const editReward = useCallback(async (rewardId: string, updates: Partial<Reward>) => {
    if (!user) return;
    await supabase.from('rewards').update({
      name: updates.name,
      points: updates.points,
      icon: updates.icon,
      description: updates.description,
      category: updates.category,
    }).eq('id', rewardId);
    
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => r.id === rewardId ? { ...r, ...updates } : r),
    }));
  }, [user]);

  const deleteReward = useCallback(async (rewardId: string) => {
    if (!user) return;
    await supabase.from('rewards').delete().eq('id', rewardId);
    
    setState(prev => ({
      ...prev,
      rewards: prev.rewards.filter(r => r.id !== rewardId),
    }));
  }, [user]);

  const redeemReward = useCallback(async (reward: Reward) => {
    if (!user || state.totalPoints < reward.points) return false;
    
    const redemptionId = Date.now().toString();
    const redemption: Redemption = {
      id: redemptionId,
      rewardId: reward.id,
      rewardName: reward.name,
      points: reward.points,
      redeemedAt: Date.now(),
    };
    
    // 同步兑换记录到 Supabase
    await supabase.from('redemptions').insert({
      user_id: user.id,
      reward_id: reward.id,
      reward_name: reward.name,
      points: reward.points,
    });
    
    setState(prev => {
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
        
        // 同步徽章解锁到 Supabase
        unlocked.forEach(badgeType => {
          supabase.from('badges').upsert({
            user_id: user.id,
            badge_type: badgeType,
            unlocked_at: new Date().toISOString(),
          }).then(({ error }) => {
            if (error) console.error('badge unlock sync error:', error);
          });
        });
      }
      
      // 更新 profiles 表的总积分
      supabase.from('profiles').update({
        total_points: newState.totalPoints,
      }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });
      
      return newState;
    });
    
    return true;
  }, [user, state.totalPoints]);

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

  const adjustPoints = useCallback(async (points: number, reason: string) => {
    if (!user) return false;
    
    // 同步积分调整到 Supabase 并获取返回的 id
    const { data, error } = await supabase.from('point_adjustments').insert({
      user_id: user.id,
      points,
      reason,
    }).select().single();
    
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
      const newState = {
        ...prev,
        pointAdjustments: [adjustment, ...prev.pointAdjustments],
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      if (points > 0) {
        playPointSound(newState.settings.soundEnabled);
      }
      
      if (points > 0) {
        const newlyUnlocked = checkAndUnlockBadges(newState);
        if (newlyUnlocked.length > 0) {
          setNewlyUnlockedBadges(prev => [...prev, ...newlyUnlocked]);
          playBadgeSound(newState.settings.soundEnabled);
          
          // 同步徽章解锁到 Supabase
          newlyUnlocked.forEach(badgeType => {
            supabase.from('badges').upsert({
              user_id: user.id,
              badge_type: badgeType,
              unlocked_at: new Date().toISOString(),
            }).then(({ error }) => {
              if (error) console.error('badge unlock sync error:', error);
            });
          });
        }
      }
      
      // 更新 profiles 表的总积分
      supabase.from('profiles').update({
        total_points: newState.totalPoints,
      }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('total points sync error:', error);
      });
      
      return newState;
    });
    
    return true;
  }, [user]);

  const editPointAdjustment = useCallback(async (id: string, points: number, reason: string) => {
    if (!user) return false;
    
    console.log('editPointAdjustment called with:', { id, points, reason });
    
    // 先立即更新本地状态，让对话框可以立即关闭
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
      
      // 立即保存到 localStorage
      saveState(newState);
      
      return newState;
    });
    
    // 异步更新 Supabase（不阻塞对话框关闭）
    (async () => {
      try {
        console.log('Updating point_adjustments table...');
        const { error: adjustError } = await supabase
          .from('point_adjustments')
          .update({ points, reason })
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (adjustError) {
          console.error('Failed to update point_adjustments:', adjustError);
          return;
        }
        console.log('point_adjustments updated successfully!');
        
        // 更新 profiles 表的总积分
        console.log('Updating profiles total_points to:', newState!.totalPoints);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ total_points: newState!.totalPoints })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Failed to update profiles total_points:', profileError);
        }
        
        // 创建备份
        await createBackup(newState!, '编辑积分调整记录');
        
        console.log('All done!');
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
      }
    })();
    
    // 立即返回 true 让对话框关闭
    return true;
  }, [user, createBackup]);

  const deletePointAdjustment = useCallback(async (id: string) => {
    if (!user) return false;
    
    console.log('deletePointAdjustment called with id:', id);
    
    // 先立即更新本地状态，让对话框可以立即关闭
    let newState: AppState;
    setState(prev => {
      const newPointAdjustments = prev.pointAdjustments.filter(adj => adj.id !== id);
      
      newState = {
        ...prev,
        pointAdjustments: newPointAdjustments,
      };
      
      newState.totalPoints = calculateTotalPoints(newState);
      
      // 立即保存到 localStorage
      saveState(newState);
      
      return newState;
    });
    
    // 异步更新 Supabase（不阻塞对话框关闭）
    (async () => {
      try {
        console.log('Deleting from point_adjustments table...');
        const { error: deleteError } = await supabase
          .from('point_adjustments')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
        
        if (deleteError) {
          console.error('Failed to delete from point_adjustments:', deleteError);
          return;
        }
        console.log('Deleted from point_adjustments successfully!');
        
        // 更新 profiles 表的总积分
        console.log('Updating profiles total_points to:', newState!.totalPoints);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ total_points: newState!.totalPoints })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Failed to update profiles total_points:', profileError);
        }
        
        // 创建备份
        await createBackup(newState!, '删除积分调整记录');
        
        console.log('All done!');
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
      }
    })();
    
    // 立即返回 true 让对话框关闭
    return true;
  }, [user, createBackup]);

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

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    console.log('=== 手动刷新数据 ===');
    setIsLoading(true);
    setHasSyncedOnLogin(false);
    
    try {
      // 首先尝试从独立表读取数据（优先使用独立表）
      console.log('优先从独立表读取数据...');
      
      const [
        { data: primaryCategoriesData },
        { data: secondaryCategoriesData },
        { data: tertiaryCategoriesData },
        { data: tasksData },
        { data: dailyRecordsData },
        { data: rewardsData },
        { data: redemptionsData },
        { data: badgesData },
        { data: pointAdjustmentsData },
        { data: profileData }
      ] = await Promise.all([
        supabase.from('primary_categories').select('*').eq('user_id', user.id),
        supabase.from('secondary_categories').select('*').eq('user_id', user.id),
        supabase.from('tertiary_categories').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('daily_records').select('*').eq('user_id', user.id),
        supabase.from('rewards').select('*').eq('user_id', user.id),
        supabase.from('redemptions').select('*').eq('user_id', user.id),
        supabase.from('badges').select('*').eq('user_id', user.id),
        supabase.from('point_adjustments').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);
      
      // 检查是否有任何独立表数据
      const hasIndependentData = 
        (primaryCategoriesData && primaryCategoriesData.length > 0) ||
        (secondaryCategoriesData && secondaryCategoriesData.length > 0) ||
        (tertiaryCategoriesData && tertiaryCategoriesData.length > 0) ||
        (tasksData && tasksData.length > 0) ||
        (dailyRecordsData && dailyRecordsData.length > 0) ||
        (rewardsData && rewardsData.length > 0) ||
        (redemptionsData && redemptionsData.length > 0) ||
        (pointAdjustmentsData && pointAdjustmentsData.length > 0);
      
      if (hasIndependentData) {
        console.log('✓ 找到独立表数据，开始转换...');
        
        const convertedState: AppState = loadState();
        
        // 转换 primaryCategories
        if (primaryCategoriesData && primaryCategoriesData.length > 0) {
          convertedState.primaryCategories = primaryCategoriesData.map((c: any) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || '📚',
            key: c.key || 'category',
            createdAt: new Date(c.created_at).getTime(),
          }));
        }
        
        // 转换 secondaryCategories
        if (secondaryCategoriesData && secondaryCategoriesData.length > 0) {
          convertedState.secondaryCategories = secondaryCategoriesData.map((c: any) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || '📖',
            primaryCategoryId: c.primary_category_id,
            createdAt: new Date(c.created_at).getTime(),
          }));
        }
        
        // 转换 tertiaryCategories
        if (tertiaryCategoriesData && tertiaryCategoriesData.length > 0) {
          convertedState.tertiaryCategories = tertiaryCategoriesData.map((c: any) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || '📝',
            defaultPoints: c.default_points || 1,
            secondaryCategoryId: c.secondary_category_id,
            createdAt: new Date(c.created_at).getTime(),
          }));
        }
        
        // 转换 tasks
        if (tasksData && tasksData.length > 0) {
          convertedState.tasks = tasksData.map((t: any) => ({
            id: t.id,
            name: t.name,
            basePoints: t.base_points || 1,
            icon: t.icon || '📚',
            primaryCategoryId: t.primary_category_id,
            secondaryCategoryId: t.secondary_category_id,
            tertiaryCategoryId: t.tertiary_category_id,
            createdAt: new Date(t.created_at).getTime(),
          }));
        }
        
        // 转换 dailyRecords
        if (dailyRecordsData && dailyRecordsData.length > 0) {
          convertedState.dailyRecords = dailyRecordsData.map((r: any) => ({
            date: r.date,
            tasks: r.tasks || [],
            totalPoints: r.total_points || 0,
          }));
        }
        
        // 转换 rewards
        if (rewardsData && rewardsData.length > 0) {
          convertedState.rewards = rewardsData.map((r: any) => ({
            id: r.id,
            name: r.name,
            points: r.points,
            icon: r.icon || '🎁',
            description: r.description || '',
            category: (r.category as 'entertainment' | 'physical' | 'privilege' | 'other') || 'other',
            createdAt: new Date(r.created_at).getTime(),
          }));
        }
        
        // 转换 redemptions
        if (redemptionsData && redemptionsData.length > 0) {
          convertedState.redemptions = redemptionsData.map((r: any) => ({
            id: r.id,
            rewardId: r.reward_id,
            rewardName: r.reward_name,
            points: r.points,
            redeemedAt: new Date(r.created_at).getTime(),
          }));
        }
        
        // 转换 badges
        if (badgesData && badgesData.length > 0) {
          convertedState.badges = convertedState.badges.map(b => {
            const unlocked = badgesData.find((ub: any) => ub.badge_type === b.id);
            if (unlocked) {
              return { ...b, unlockedAt: new Date(unlocked.unlocked_at).getTime() };
            }
            return b;
          });
        }
        
        // 转换 pointAdjustments
        if (pointAdjustmentsData && pointAdjustmentsData.length > 0) {
          convertedState.pointAdjustments = pointAdjustmentsData.map((p: any) => ({
            id: p.id,
            points: p.points,
            reason: p.reason,
            adjustedAt: new Date(p.created_at || p.adjusted_at).getTime(),
            createdAt: new Date(p.created_at).getTime(),
          }));
        }
        
        // 设置总积分
        if (profileData?.total_points !== undefined) {
          convertedState.totalPoints = profileData.total_points;
        }
        
        // 确保重新计算总积分
        convertedState.totalPoints = calculateTotalPoints(convertedState);
        console.log('重新计算后的总积分:', convertedState.totalPoints);
        
        // 保存并更新状态
        saveState(convertedState);
        setState(() => ({ ...convertedState }));
        console.log('✓ 已从独立表转换并加载数据');
      } else {
        // 如果没有独立表数据，尝试从 data_backups 表获取最新备份
        console.log('✗ 独立表没有数据，尝试从备份表加载...');
        
        const { data: backupData, error: backupError } = await supabase
          .from('data_backups')
          .select('id, backup_data, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!backupError && backupData?.backup_data) {
          console.log('✓ 找到备份数据，创建时间:', backupData.created_at);
          
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
            pointAdjustments: (backup.pointAdjustments as AppState['pointAdjustments']) || [],
            totalPoints: (backup.totalPoints as number) || 0,
            settings: (backup.settings as AppState['settings']) || { soundEnabled: true, lastVisitDate: new Date().toISOString().split('T')[0] },
          };
          
          restoredState.totalPoints = calculateTotalPoints(restoredState);
          saveState(restoredState);
          setState(() => ({ ...restoredState }));
          console.log('✓ 已从备份刷新数据');
        } else {
          console.log('✗ 备份表也没有数据');
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

  // 清理订阅
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
      subscriptionsRef.current = [];
    };
  }, []);

  // 设置实时订阅
  useEffect(() => {
    if (!user || !hasSyncedOnLogin) return;

    console.log('=== 设置 Supabase 实时订阅 ===');
    
    // 清理旧订阅
    subscriptionsRef.current.forEach(unsubscribe => unsubscribe());
    subscriptionsRef.current = [];

    // 订阅 tasks 表
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Tasks change detected:', payload);
          refreshData();
        }
      )
      .subscribe();
    subscriptionsRef.current.push(() => tasksSubscription.unsubscribe());

    // 订阅 daily_records 表
    const dailyRecordsSubscription = supabase
      .channel('daily-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_records',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Daily records change detected:', payload);
          refreshData();
        }
      )
      .subscribe();
    subscriptionsRef.current.push(() => dailyRecordsSubscription.unsubscribe());

    // 订阅 profiles 表 (总积分)
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          // 更新总积分
          if (payload.new && typeof payload.new === 'object' && 'total_points' in (payload.new as Record<string, unknown>)) {
            setState(prev => ({
              ...prev,
              totalPoints: (payload.new as Record<string, unknown>).total_points as number,
            }));
          }
        }
      )
      .subscribe();
    subscriptionsRef.current.push(() => profilesSubscription.unsubscribe());

    // 订阅 point_adjustments 表
    const pointAdjustmentsSubscription = supabase
      .channel('point-adjustments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'point_adjustments',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Point adjustments change detected:', payload);
          refreshData();
        }
      )
      .subscribe();
    subscriptionsRef.current.push(() => pointAdjustmentsSubscription.unsubscribe());

    // 订阅分类表
    const categoriesToSubscribe = ['primary_categories', 'secondary_categories', 'tertiary_categories'];
    categoriesToSubscribe.forEach(table => {
      const subscription = supabase
        .channel(`${table}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log(`${table} change detected:`, payload);
            refreshData();
          }
        )
        .subscribe();
      subscriptionsRef.current.push(() => subscription.unsubscribe());
    });

    console.log('✓ 实时订阅已设置');
  }, [user, hasSyncedOnLogin, refreshData]);

  return {
    state,
    newlyUnlockedBadges,
    isLoading,
    isSyncing,
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

