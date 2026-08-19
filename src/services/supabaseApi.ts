/**
 * Supabase 数据访问层（services）
 *
 * 职责：封装所有对 Supabase 表的读写、Realtime 订阅，以及「数据库行 ↔ 领域模型」的转换。
 * 不依赖 React，可独立测试。
 *
 * 说明：原逻辑位于 useSyncedAppState.ts（1,700+ 行），本次拆分后该 hook 仅保留
 * 状态编排与副作用，本文件提供类型化的数据访问（无 any）。
 */
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type {
  AppState,
  Task,
  Reward,
  Redemption,
  BadgeType,
  DailyTask,
  PrimaryCategory,
  SecondaryCategory,
  TertiaryCategory,
  PointAdjustment,
  CustomBadge,
} from '@/types';
import { loadState } from '@/utils/storage';

// ============================================
// 行类型（数据库）
// ============================================
type PrimaryCategoryRow = Database['public']['Tables']['primary_categories']['Row'];
type SecondaryCategoryRow = Database['public']['Tables']['secondary_categories']['Row'];
type TertiaryCategoryRow = Database['public']['Tables']['tertiary_categories']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type DailyRecordRow = Database['public']['Tables']['daily_records']['Row'];
type RewardRow = Database['public']['Tables']['rewards']['Row'];
type RedemptionRow = Database['public']['Tables']['redemptions']['Row'];
type BadgeRow = Database['public']['Tables']['badges']['Row'];
type PointAdjustmentRow = Database['public']['Tables']['point_adjustments']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CustomBadgeRow = Database['public']['Tables']['custom_badges']['Row'];

// ============================================
// 行 → 领域模型 转换
// ============================================
export const toPrimaryCategory = (r: PrimaryCategoryRow): PrimaryCategory => ({
  id: r.id,
  name: r.name,
  icon: r.icon || '📚',
  key: r.key || 'category',
  createdAt: new Date(r.created_at).getTime(),
});

export const toSecondaryCategory = (r: SecondaryCategoryRow): SecondaryCategory => ({
  id: r.id,
  name: r.name,
  icon: r.icon || '📖',
  primaryCategoryId: r.primary_category_id || '',
  createdAt: new Date(r.created_at).getTime(),
});

export const toTertiaryCategory = (r: TertiaryCategoryRow): TertiaryCategory => ({
  id: r.id,
  name: r.name,
  icon: r.icon || '📝',
  defaultPoints: r.default_points || 1,
  secondaryCategoryId: r.secondary_category_id || '',
  repeat: r.repeat_rule as unknown as TertiaryCategory['repeat'] | undefined,
  createdAt: new Date(r.created_at).getTime(),
});

export const toTask = (r: TaskRow): Task => ({
  id: r.id,
  name: r.name,
  basePoints: r.base_points || 1,
  icon: r.icon || '📚',
  primaryCategoryId: r.primary_category_id || undefined,
  secondaryCategoryId: r.secondary_category_id || undefined,
  tertiaryCategoryId: r.tertiary_category_id || undefined,
  isTemporary: r.is_temporary || false,
  createdAt: new Date(r.created_at).getTime(),
});

export const toDailyRecord = (r: DailyRecordRow) => ({
  date: r.date,
  tasks: r.tasks || [],
  totalPoints: r.total_points || 0,
});

export const toReward = (r: RewardRow): Reward => ({
  id: r.id,
  name: r.name,
  points: r.points,
  icon: r.icon || '🎁',
  description: r.description || '',
  category: (r.category as Reward['category']) || 'other',
  createdAt: new Date(r.created_at).getTime(),
});

export const toRedemption = (r: RedemptionRow): Redemption => ({
  id: r.id,
  rewardId: r.reward_id,
  rewardName: r.reward_name,
  points: r.points,
  redeemedAt: new Date(r.created_at).getTime(),
  status: r.status || 'approved',
});

export const toPointAdjustment = (r: PointAdjustmentRow): PointAdjustment => ({
  id: r.id,
  points: r.points,
  reason: r.reason,
  adjustedAt: new Date(r.created_at).getTime(),
  createdAt: new Date(r.created_at).getTime(),
});

export const toCustomBadge = (r: CustomBadgeRow): CustomBadge => ({
  id: r.id,
  name: r.name,
  icon: r.icon || '🏅',
  description: r.description || '',
  conditionType: r.condition_type,
  conditionValue: r.condition_value,
  createdAt: new Date(r.created_at).getTime(),
});

// ============================================
// 查询：并行拉取用户全量数据
// ============================================
export interface UserDataResult {
  primaryCategories: PrimaryCategoryRow[];
  secondaryCategories: SecondaryCategoryRow[];
  tertiaryCategories: TertiaryCategoryRow[];
  tasks: TaskRow[];
  dailyRecords: DailyRecordRow[];
  rewards: RewardRow[];
  redemptions: RedemptionRow[];
  badges: BadgeRow[];
  pointAdjustments: PointAdjustmentRow[];
  customBadges: CustomBadgeRow[];
  profile: ProfileRow | null;
}

export const fetchAllUserData = async (userId: string): Promise<UserDataResult> => {
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
    { data: customBadgesData },
    { data: profileData },
  ] = await Promise.all([
    supabase.from('primary_categories').select('*').eq('user_id', userId),
    supabase.from('secondary_categories').select('*').eq('user_id', userId),
    supabase.from('tertiary_categories').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('daily_records').select('*').eq('user_id', userId),
    supabase.from('rewards').select('*').eq('user_id', userId),
    supabase.from('redemptions').select('*').eq('user_id', userId),
    supabase.from('badges').select('*').eq('user_id', userId),
    supabase.from('point_adjustments').select('*').eq('user_id', userId),
    supabase.from('custom_badges').select('*').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).single(),
  ]);

  return {
    primaryCategories: primaryCategoriesData ?? [],
    secondaryCategories: secondaryCategoriesData ?? [],
    tertiaryCategories: tertiaryCategoriesData ?? [],
    tasks: tasksData ?? [],
    dailyRecords: dailyRecordsData ?? [],
    rewards: rewardsData ?? [],
    redemptions: redemptionsData ?? [],
    badges: badgesData ?? [],
    pointAdjustments: pointAdjustmentsData ?? [],
    customBadges: customBadgesData ?? [],
    profile: profileData ?? null,
  };
};

/** 是否存在任何独立表数据（用于判断走独立表加载还是备份表加载） */
export const hasIndependentData = (data: UserDataResult): boolean => {
  return (
    data.primaryCategories.length > 0 ||
    data.secondaryCategories.length > 0 ||
    data.tertiaryCategories.length > 0 ||
    data.tasks.length > 0 ||
    data.dailyRecords.length > 0 ||
    data.rewards.length > 0 ||
    data.redemptions.length > 0 ||
    data.pointAdjustments.length > 0
  );
};

// ============================================
// 多孩子档案（P1-4）
// ============================================

/** 查询家长名下的孩子档案（profiles.parent_id = parentId） */
export const fetchChildren = async (parentId: string): Promise<ProfileRow[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('fetchChildren error:', error);
    return [];
  }
  return data ?? [];
};

/** 建立亲子关联：将孩子 profile.parent_id 设为家长 id */
export const linkChildToParent = async (childId: string, parentId: string) => {
  return supabase.from('profiles').update({ parent_id: parentId }).eq('id', childId);
};

/** 家长读取孩子数据（只读数据面板，依赖 RLS 放行） */
export const fetchChildData = async (childId: string): Promise<UserDataResult | null> => {
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
    { data: customBadgesData },
    { data: profileData },
  ] = await Promise.all([
    supabase.from('primary_categories').select('*').eq('user_id', childId),
    supabase.from('secondary_categories').select('*').eq('user_id', childId),
    supabase.from('tertiary_categories').select('*').eq('user_id', childId),
    supabase.from('tasks').select('*').eq('user_id', childId),
    supabase.from('daily_records').select('*').eq('user_id', childId),
    supabase.from('rewards').select('*').eq('user_id', childId),
    supabase.from('redemptions').select('*').eq('user_id', childId),
    supabase.from('badges').select('*').eq('user_id', childId),
    supabase.from('point_adjustments').select('*').eq('user_id', childId),
    supabase.from('custom_badges').select('*').eq('user_id', childId),
    supabase.from('profiles').select('*').eq('id', childId).single(),
  ]);

  return {
    primaryCategories: primaryCategoriesData ?? [],
    secondaryCategories: secondaryCategoriesData ?? [],
    tertiaryCategories: tertiaryCategoriesData ?? [],
    tasks: tasksData ?? [],
    dailyRecords: dailyRecordsData ?? [],
    rewards: rewardsData ?? [],
    redemptions: redemptionsData ?? [],
    badges: badgesData ?? [],
    pointAdjustments: pointAdjustmentsData ?? [],
    customBadges: customBadgesData ?? [],
    profile: profileData ?? null,
  };
};

/** 由数据库数据构建完整 AppState（合并本地空状态，徽章保留默认定义并合并解锁时间） */
export const buildStateFromDb = (data: UserDataResult): AppState => {
  const base = loadState();

  const state: AppState = {
    ...base,
    primaryCategories: data.primaryCategories.map(toPrimaryCategory),
    secondaryCategories: data.secondaryCategories.map(toSecondaryCategory),
    tertiaryCategories: data.tertiaryCategories.map(toTertiaryCategory),
    tasks: data.tasks.map(toTask),
    dailyRecords: data.dailyRecords.map(toDailyRecord),
    rewards: data.rewards.map(toReward),
    redemptions: data.redemptions.map(toRedemption),
    pointAdjustments: data.pointAdjustments.map(toPointAdjustment),
  };

  // 徽章：默认定义 + 数据库解锁时间
  if (data.badges.length > 0) {
    state.badges = base.badges.map(b => {
      const unlocked = data.badges.find(ub => ub.badge_type === b.id);
      return unlocked ? { ...b, unlockedAt: new Date(unlocked.unlocked_at).getTime() } : b;
    });
  }

  // 自定义徽章（P2-2）：数据库定义 + 解锁时间（badges 表 badge_type = `custom:${id}`）
  if (data.customBadges.length > 0) {
    state.customBadges = data.customBadges.map(cb => {
      const base = toCustomBadge(cb);
      const unlocked = data.badges.find(ub => ub.badge_type === `custom:${cb.id}`);
      return unlocked ? { ...base, unlockedAt: new Date(unlocked.unlocked_at).getTime() } : base;
    });
  }

  return state;
};

// ============================================
// 写入：各类业务操作（与 useSyncedAppState 原逻辑一一对应）
// ============================================
export const insertTask = (userId: string, task: Omit<Task, 'id' | 'createdAt'>) =>
  supabase.from('tasks').insert({
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

export const insertPrimaryCategory = (userId: string, category: Omit<PrimaryCategory, 'id' | 'createdAt'>) =>
  supabase.from('primary_categories').insert({
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

export const insertSecondaryCategory = (userId: string, category: Omit<SecondaryCategory, 'id' | 'createdAt'>) =>
  supabase.from('secondary_categories').insert({
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

export const insertTertiaryCategory = (userId: string, category: Omit<TertiaryCategory, 'id' | 'createdAt'>) =>
  supabase.from('tertiary_categories').insert({
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

export const insertReward = (userId: string, reward: Omit<Reward, 'id' | 'createdAt'>) =>
  supabase.from('rewards').insert({
    user_id: userId,
    name: reward.name,
    points: reward.points,
    icon: reward.icon,
    description: reward.description,
    category: reward.category,
  });

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

export const insertRedemption = (userId: string, redemption: { rewardId: string; rewardName: string; points: number }) =>
  supabase.from('redemptions').insert({
    user_id: userId,
    reward_id: redemption.rewardId,
    reward_name: redemption.rewardName,
    points: redemption.points,
    status: 'pending', // 孩子发起兑换 → 待家长确认，积分冻结
  }).select().single();

/** 更新兑换状态（家长审核：approved/fulfilled/rejected） */
export const updateRedemptionStatus = (userId: string, redemptionId: string, status: Redemption['status']) =>
  supabase.from('redemptions').update({ status }).eq('id', redemptionId).eq('user_id', userId);

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
}

/** 建立用户相关表的实时订阅，返回取消订阅函数数组 */
export const subscribeToChanges = (userId: string, handlers: ChangeHandlers): Array<() => void> => {
  const unsubscribers: Array<() => void> = [];
  const { onTasksChange, onDailyRecordsChange, onProfileChange, onPointAdjustmentsChange, onCategoriesChange } = handlers;

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

  return unsubscribers;
};
