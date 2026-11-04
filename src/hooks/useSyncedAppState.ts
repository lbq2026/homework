(some characters truncated)...
nsole.error('removeTaskFromToday sync error:', error);
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

  /** 家长审核：一次确认即兑换成功（正式扣分，无需二次兑现确认） */
  const approveRedemption = useCallback(async (redemptionId: string) => {
    if (!user) return false;

    let newState: AppState;
    setState(prev => {
      const newRedemptions = prev.redemptions.map(r =>
        r.id === redemptionId ? { ...r, status: 'fulfilled' as const } : r
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
        const { count, error: updateError } = await updateRedemptionStatus(user.id, redemptionId, 'fulfilled');
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
    buyMakeupCard,
    useMakeupCard,
    addCustomBadge,
    editCustomBadge,
    deleteCustomBadge,
  };
};
