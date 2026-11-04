(some characters truncated)...
se;
    });
  }

  return state;
};

// ============================================
// 写入：各类业务操作（与 useSyncedAppState 原逻辑一一对应）
// 注意：insert 均显式携带前端生成的 id（与本地 state 保持一致）。
// 此前不传 id 时由数据库另行生成主键，导致「本地 id ≠ 云端 id」，
// 后续 update/delete 按本地 id 匹配云端 0 行静默失败，
// 外键（如 redemptions.reward_id）也会因指向不存在的 id 而插入失败。
// ============================================
export const insertTask = (userId: string, task: Omit<Task, 'id' | 'createdAt'>, taskId: string) =>
  supabase.from('tasks').insert({
    id: taskId,
    user_id: userId,
    name: task.name,
    base_points: task.basePoints,
    icon: task.icon,
    primary_category_id: task.primaryCategoryId,
    secondary_category_id: task.secondaryCategoryId,
    tertiary_category_id: task.tertiaryCategoryId,
    is_active: true,
    is_temporary: task.isTemporary || false,
  }).select();

export const updateTask = (taskId: string, updates: Partial<Task>) =>
  supabase.from('tasks').update({
    name: updates.name,
    base_points: updates.basePoints,
    icon: updates.icon,
    primary_category_id: updates.primaryCategoryId,
    secondary_category_id: updates.secondaryCategoryId,
    tertiary_category_id: updates.tertiaryCategoryId,
  }).eq('id', taskId);

export const softDeleteTask = (taskId: string) =>
  supabase.from('tasks').update({ is_active: false }).eq('id', taskId);

export const insertPrimaryCategory = (userId: string, category: Omit<PrimaryCategory, 'id' | 'createdAt'>, categoryId: string) =>
  supabase.from('primary_categories').insert({
    id: categoryId,
    user_id: userId,
    name: category.name,
    icon: category.icon,
    key: category.key,
  });

export const updatePrimaryCategory = (categoryId: string, updates: Partial<PrimaryCategory>) =>
  supabase.from('primary_categories').update({
    name: updates.name,
    icon: updates.icon,
    key: updates.key,
  }).eq('id', categoryId);

export const deletePrimaryCategory = (categoryId: string) =>
  supabase.from('primary_categories').delete().eq('id', categoryId);

export const insertSecondaryCategory = (userId: string, category: Omit<SecondaryCategory, 'id' | 'createdAt'>, categoryId: string) =>
  supabase.from('secondary_categories').insert({
    id: categoryId,
    user_id: userId,
    name: category.name,
    icon: category.icon,
    primary_category_id: category.primaryCategoryId,
  });

export const updateSecondaryCategory = (categoryId: string, updates: Partial<SecondaryCategory>) =>
  supabase.from('secondary_categories').update({
    name: updates.name,
    icon: updates.icon,
    primary_category_id: updates.primaryCategoryId,
  }).eq('id', categoryId);

export const deleteSecondaryCategory = (categoryId: string) =>
  supabase.from('secondary_categories').delete().eq('id', categoryId);

export const insertTertiaryCategory = (userId: string, category: Omit<TertiaryCategory, 'id' | 'createdAt'>, categoryId: string) =>
  supabase.from('tertiary_categories').insert({
    id: categoryId,
    user_id: userId,
    name: category.name,
    icon: category.icon,
    default_points: category.defaultPoints,
    secondary_category_id: category.secondaryCategoryId,
    repeat_rule: category.repeat ? JSON.parse(JSON.stringify(category.repeat)) : null,
  });

export const updateTertiaryCategory = (categoryId: string, updates: Partial<TertiaryCategory>) =>
  supabase.from('tertiary_categories').update({
    name: updates.name,
    icon: updates.icon,
    default_points: updates.defaultPoints,
    repeat_rule: updates.repeat !== undefined
      ? (updates.repeat ? JSON.parse(JSON.stringify(updates.repeat)) : null)
      : undefined,
  }).eq('id', categoryId);

export const deleteTertiaryCategory = (categoryId: string) =>
  supabase.from('tertiary_categories').delete().eq('id', categoryId);

export const upsertDailyRecord = (userId: string, date: string, tasks: DailyTask[], totalPoints: number) =>
  supabase.from('daily_records').upsert({
    user_id: userId,
    date,
    tasks,
    total_points: totalPoints,
  }, { onConflict: 'user_id,date' });

export const insertReward = (userId: string, reward: Omit<Reward, 'id' | 'createdAt'>, rewardId: string) =>
  supabase.from('rewards').insert({
    id: rewardId,
    user_id: userId,
    name: reward.name,
    points: reward.points,
    icon: reward.icon,
    description: reward.description,
    category: reward.category,
  }).select().single();

export const updateReward = (rewardId: string, updates: Partial<Reward>) =>
  supabase.from('rewards').update({
    name: updates.name,
    points: updates.points,
    icon: updates.icon,
    description: updates.description,
    category: updates.category,
  }).eq('id', rewardId);

export const deleteReward = (rewardId: string) =>
  supabase.from('rewards').delete().eq('id', rewardId);

export const insertRedemption = async (userId: string, redemption: { id: string; rewardId: string; rewardName: string; points: number }) => {
  const payload = {
    id: redemption.id,
    user_id: userId,
    reward_id: redemption.rewardId,
    reward_name: redemption.rewardName,
    points: redemption.points,
    status: 'pending' as const, // 孩子发起兑换 → 待家长确认，积分冻结
  };

  const first = await supabase.from('redemptions').insert(payload).select().single();

  // 异常处理：区分常见的两种 schema 不匹配，给出可执行的修复指引
  // - 42703（undefined_column）：表缺列 → 需要执行 status 迁移脚本
  // - 23503（foreign_key_violation）：外键缺失 → 存量奖品云端缺失，降级重插
  const err = first.error as (null | { code?: string; message?: string });
  if (err) {
    const msg = err.message ?? '';

    // 场景 1：status 列不存在 —— 通常是没跑 now-phase-trust-fix.sql
    if (err.code === '42703' && /status/i.test(msg)) {
      console.error(
        '[insertRedemption] 数据库 redemptions 表缺 status 列。\n' +
        '请在 Supabase Dashboard → SQL Editor 执行 sql/now-phase-trust-fix.sql（含 status 字段、is_parent() 函数、redemptions RLS 重建）。',
      );
      return first;
    }

    // 场景 2：reward_id 外键不存在 —— 存量奖品云端缺失，降级重插
    if (err.code === '23503') {
      console.warn('insertRedemption: reward_id 外键不存在（云端奖品缺失），降级为不关联奖品重插');
      return supabase.from('redemptions').insert({
        ...payload,
        reward_id: null as unknown as string, // DB 列 reward_id 实际可空，类型未对齐故断言
      }).select().single();
    }
  }

  return first;
};

/** 更新兑换状态（家长审核：approved/fulfilled/rejected）。
 *  返回 affected rows 数量：0 表示本地 id 在云端不存在（双轨 id 遗留数据），
 *  调用方可据此提示并触发全量刷新，避免“本地已审核、云端仍 pending”。 */
export const updateRedemptionStatus = async (userId: string, redemptionId: string, status: Redemption['status']) => {
  const { data, error } = await supabase
    .from('redemptions')
    .update({ status })
    .eq('id', redemptionId)
    .eq('user_id', userId)
    .select('id');
  return { count: data?.length ?? 0, error };
};

export const deleteRedemption = (userId: string, redemptionId: string) =>
  supabase.from('redemptions').delete().eq('id', redemptionId).eq('user_id', userId);

export const upsertBadge = (userId: string, badgeType: BadgeType) =>
  supabase.from('badges').upsert({
    user_id: userId,
    badge_type: badgeType,
  }, { onConflict: 'user_id,badge_type' });

// ---- 自定义徽章（P2-2） ----
export const insertCustomBadge = (userId: string, badge: Omit<CustomBadge, 'id' | 'createdAt' | 'unlockedAt'>) =>
  supabase.from('custom_badges').insert({
    user_id: userId,
    name: badge.name,
    icon: badge.icon,
    description: badge.description,
    condition_type: badge.conditionType,
    condition_value: badge.conditionValue,
  }).select().single();

export const updateCustomBadge = (badgeId: string, updates: Partial<CustomBadge>) =>
  supabase.from('custom_badges').update({
    name: updates.name,
    icon: updates.icon,
    description: updates.description,
    condition_type: updates.conditionType,
    condition_value: updates.conditionValue,
  }).eq('id', badgeId);

export const deleteCustomBadge = (badgeId: string) =>
  supabase.from('custom_badges').delete().eq('id', badgeId);

/** 解锁记录写入 badges 表（badge_type = `custom:${id}`） */
export const upsertCustomBadgeUnlock = (userId: string, badgeId: string) =>
  supabase.from('badges').upsert({
    user_id: userId,
    badge_type: `custom:${badgeId}`,
  }, { onConflict: 'user_id,badge_type' });

/** 删除自定义徽章时清理其解锁记录 */
export const deleteCustomBadgeUnlock = (userId: string, badgeId: string) =>
  supabase.from('badges').delete().eq('user_id', userId).eq('badge_type', `custom:${badgeId}`);

export const insertPointAdjustment = (userId: string, points: number, reason: string) =>
  supabase.from('point_adjustments').insert({
    user_id: userId,
    points,
    reason,
  }).select().single();

export const updatePointAdjustment = (id: string, userId: string, points: number, reason: string) =>
  supabase.from('point_adjustments').update({ points, reason }).eq('id', id).eq('user_id', userId);

export const deletePointAdjustment = (id: string, userId: string) =>
  supabase.from('point_adjustments').delete().eq('id', id).eq('user_id', userId);

export const updateProfileTotalPoints = (userId: string, totalPoints: number) =>
  supabase.from('profiles').update({ total_points: totalPoints }).eq('id', userId);

// 家长写孩子积分：走 SECURITY DEFINER RPC（服务端校验 is_parent_of 并同步总分）
export const adjustChildPointsRpc = (childId: string, points: number, reason: string) =>
  supabase.rpc('adjust_child_points', {
    p_child_id: childId,
    p_points: points,
    p_reason: reason,
  });

export const updateChildPointAdjustmentRpc = (adjustmentId: string, points: number, reason: string) =>
  supabase.rpc('update_child_point_adjustment', {
    p_adjustment_id: adjustmentId,
    p_points: points,
    p_reason: reason,
  });

export const deleteChildPointAdjustmentRpc = (adjustmentId: string) =>
  supabase.rpc('delete_child_point_adjustment', {
    p_adjustment_id: adjustmentId,
  });

// ============================================
// 备份表：读取最新备份 / 本地数据上传
// ============================================
export interface BackupRow {
  id: string;
  created_at: string;
  backup_data: Record<string, unknown>;
}

export const fetchLatestBackup = async (userId: string): Promise<BackupRow | null> => {
  const { data, error } = await supabase
    .from('data_backups')
    .select('id, backup_data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
};

/** 将本地 AppState 全量上传（upsert）到各独立表（登录首次同步用） */
export const syncLocalStateToDb = async (userId: string, localState: AppState): Promise<void> => {
  for (const cat of localState.primaryCategories) {
    await supabase.from('primary_categories').upsert({
      id: cat.id,
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      key: cat.key,
      created_at: new Date(cat.createdAt).toISOString(),
    });
  }
  for (const cat of localState.secondaryCategories) {
    await supabase.from('secondary_categories').upsert({
      id: cat.id,
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      primary_category_id: cat.primaryCategoryId,
      created_at: new Date(cat.createdAt).toISOString(),
    });
  }
  for (const cat of localState.tertiaryCategories) {
    await supabase.from('tertiary_categories').upsert({
      id: cat.id,
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      default_points: cat.defaultPoints,
      secondary_category_id: cat.secondaryCategoryId,
      created_at: new Date(cat.createdAt).toISOString(),
    });
  }
  for (const task of localState.tasks) {
    await supabase.from('tasks').upsert({
      id: task.id,
      user_id: userId,
      name: task.name,
      base_points: task.basePoints,
      icon: task.icon,
      primary_category_id: task.primaryCategoryId,
      secondary_category_id: task.secondaryCategoryId,
      tertiary_category_id: task.tertiaryCategoryId,
      created_at: new Date(task.createdAt).toISOString(),
    });
  }
  for (const record of localState.dailyRecords) {
    await supabase.from('daily_records').upsert({
      user_id: userId,
      date: record.date,
      tasks: record.tasks,
      total_points: record.totalPoints,
    }, { onConflict: 'user_id,date' });
  }
  for (const reward of localState.rewards) {
    await supabase.from('rewards').upsert({
      id: reward.id,
      user_id: userId,
      name: reward.name,
      points: reward.points,
      icon: reward.icon,
      description: reward.description,
      category: reward.category,
      created_at: new Date(reward.createdAt).toISOString(),
    });
  }
};

// ============================================
// Realtime 订阅
// ============================================
export interface ChangeHandlers {
  onTasksChange?: () => void;
  onDailyRecordsChange?: () => void;
  onProfileChange?: (totalPoints: number) => void;
  onPointAdjustmentsChange?: () => void;
  onCategoriesChange?: () => void;
  onRedemptionsChange?: () => void;
}

/** 建立用户相关表的实时订阅，返回取消订阅函数数组 */
export const subscribeToChanges = (userId: string, handlers: ChangeHandlers): Array<() => void> => {
  const unsubscribers: Array<() => void> = [];
  const { onTasksChange, onDailyRecordsChange, onProfileChange, onPointAdjustmentsChange, onCategoriesChange, onRedemptionsChange } = handlers;

  if (onTasksChange) {
    const sub = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, () => onTasksChange())
      .subscribe();
    unsubscribers.push(() => sub.unsubscribe());
  }

  if (onDailyRecordsChange) {
    const sub = supabase
      .channel('daily-records-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_records', filter: `user_id=eq.${userId}` }, () => onDailyRecordsChange())
      .subscribe();
    unsubscribers.push(() => sub.unsubscribe());
  }

  if (onProfileChange) {
    const sub = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, (payload) => {
        const newRow = payload.new as { total_points?: number } | null;
        if (newRow && typeof newRow.total_points === 'number') {
          onProfileChange(newRow.total_points);
        }
      })
      .subscribe();
    unsubscribers.push(() => sub.unsubscribe());
  }

  if (onPointAdjustmentsChange) {
    const sub = supabase
      .channel('point-adjustments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'point_adjustments', filter: `user_id=eq.${userId}` }, () => onPointAdjustmentsChange())
      .subscribe();
    unsubscribers.push(() => sub.unsubscribe());
  }

  if (onCategoriesChange) {
    (['primary_categories', 'secondary_categories', 'tertiary_categories'] as const).forEach(table => {
      const sub = supabase
        .channel(`${table}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${userId}` }, () => onCategoriesChange())
        .subscribe();
      unsubscribers.push(() => sub.unsubscribe());
    });
  }

  // 兑换记录变更（孩子发起兑换 / 家长审核状态流转）→ 全量刷新，
  // 此前缺失订阅导致家长端审核后孩子端不更新，次日重载状态被云端 pending 覆盖
  if (onRedemptionsChange) {
    const sub = supabase
      .channel('redemptions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'redemptions', filter: `user_id=eq.${userId}` }, () => onRedemptionsChange())
      .subscribe();
    unsubscribers.push(() => sub.unsubscribe());
  }

  return unsubscribers;
};

// ============================================
// 家长控制（方案 C）：跨孩子读 + 管理动作 RPC
// ============================================

/** 家长批量读取名下孩子的待审核兑换（读走 RLS） */
export const fetchPendingRedemptions = async (
  childIds: string[],
): Promise<ChildRedemptionRow[]> => {
  if (childIds.length === 0) return [];
  const { data, error } = await supabase
    .from('redemptions')
    .select('id, user_id, reward_name, points, status, created_at')
    .in('user_id', childIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchPendingRedemptions error:', error);
    return [];
  }
  return data ?? [];
};

/** 编辑孩子资料（昵称 + 头像 emoji），RPC 内校验亲子关系与昵称占用 */
export const updateChildProfileRpc = (
  childId: string,
  username: string,
  avatar: string | null,
) =>
  supabase.rpc('update_child_profile', {
    p_child_id: childId,
    p_username: username,
    p_avatar: avatar,
  });

/** 重置孩子登录密码（RPC 内同时清除孩子会话，旧登录立即失效） */
export const resetChildPasswordRpc = (childId: string, newPassword: string) =>
  supabase.rpc('reset_child_password', {
    p_child_id: childId,
    p_new_password: newPassword,
  });

/** 解绑孩子（parent_id 置空，账号与数据保留） */
export const unbindChildRpc = (childId: string) =>
  supabase.rpc('unbind_child', { p_child_id: childId });

/** 绑定已有孩子账号（按登录邮箱，RPC 内校验角色/归属/不能绑自己） */
export const bindExistingChildRpc = (childEmail: string) =>
  supabase.rpc('bind_existing_child', { p_child_email: childEmail });

/** 兑换审批：true→fulfilled 且扣积分；false→rejected 冻结退回 */
export const approveRedemptionRpc = (redemptionId: string, approve: boolean) =>
  supabase.rpc('approve_redemption', {
    p_redemption_id: redemptionId,
    p_approve: approve,
  });

/** 下发复制：作业(三级分类)/奖品/徽章 → 指定孩子，分类沿父链自动补齐；返回各类实际新增数 */
export const dispatchToChildRpc = (
  childId: string,
  taskIds: string[],
  rewardIds: string[],
  badgeIds: string[],
) =>
  supabase.rpc('dispatch_to_child', {
    p_child_id: childId,
    p_task_ids: taskIds.length > 0 ? taskIds : null,
    p_reward_ids: rewardIds.length > 0 ? rewardIds : null,
    p_badge_ids: badgeIds.length > 0 ? badgeIds : null,
  });

/** 家长替孩子删模板：p_table ∈ tasks|rewards|custom_badges|primary/secondary/tertiary_categories */
export const deleteChildTemplateRpc = (childId: string, table: string, itemId: string) =>
  supabase.rpc('delete_child_template', {
    p_child_id: childId,
    p_table: table,
    p_item_id: itemId,
  });

/** 拉孩子端作业/奖品/徽章名称集合，用于下发对话框「已下发」禁勾标记 */
export const fetchChildTemplateNames = async (childId: string) => {
  const [{ data: taskRows }, { data: rewardRows }, { data: badgeRows }] = await Promise.all([
    supabase.from('tertiary_categories').select('name').eq('user_id', childId),
    supabase.from('rewards').select('name').eq('user_id', childId),
    supabase.from('custom_badges').select('name').eq('user_id', childId),
  ]);
  return {
    taskNames: (taskRows ?? []).map((r) => r.name),
    rewardNames: (rewardRows ?? []).map((r) => r.name),
    badgeNames: (badgeRows ?? []).map((r) => r.name),
  };
};
