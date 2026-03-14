import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth.tsx';
import type { Task, Reward, BadgeType, DailyRecord } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleError = (error: any) => {
  console.error('Supabase error:', error);
  return null;
};

// 任务相关操作
export const useTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      handleError(error);
    } else if (data) {
      setTasks(data.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        basePoints: t.base_points as number,
        icon: t.icon as string,
        category: t.category as Task['category'],
        primaryCategoryId: t.primary_category_id as string | undefined,
        secondaryCategoryId: t.secondary_category_id as string | undefined,
        tertiaryCategoryId: t.tertiary_category_id as string | undefined,
        createdAt: new Date(t.created_at as string).getTime(),
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        name: task.name,
        base_points: task.basePoints,
        icon: task.icon,
        category: task.category,
        primary_category_id: task.primaryCategoryId,
        secondary_category_id: task.secondaryCategoryId,
        tertiary_category_id: task.tertiaryCategoryId,
        is_active: true,
      })
      .select()
      .single();
    
    if (error) {
      handleError(error);
      return null;
    }
    await fetchTasks();
    return data?.id as string;
  }, [user, fetchTasks]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        name: updates.name,
        base_points: updates.basePoints,
        icon: updates.icon,
        category: updates.category,
        primary_category_id: updates.primaryCategoryId,
        secondary_category_id: updates.secondaryCategoryId,
        tertiary_category_id: updates.tertiaryCategoryId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    
    if (error) handleError(error);
    else await fetchTasks();
    return !error;
  }, [fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ is_active: false })
      .eq('id', taskId);
    
    if (error) handleError(error);
    else await fetchTasks();
    return !error;
  }, [fetchTasks]);

  return { tasks, loading, addTask, updateTask, deleteTask, refresh: fetchTasks };
};

// 每日记录相关操作
export const useDailyRecords = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('daily_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      handleError(error);
    } else if (data) {
      setRecords(data.map((r: Record<string, unknown>) => ({
        date: r.date as string,
        tasks: (r.tasks as DailyRecord['tasks']) || [],
        totalPoints: r.total_points as number,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const upsertRecord = useCallback(async (record: DailyRecord) => {
    if (!user) return false;
    const { error } = await supabase
      .from('daily_records')
      .upsert({
        user_id: user.id,
        date: record.date,
        tasks: record.tasks,
        total_points: record.totalPoints,
      }, { onConflict: 'user_id,date' });
    
    if (error) handleError(error);
    else await fetchRecords();
    return !error;
  }, [user, fetchRecords]);

  return { records, loading, upsertRecord, refresh: fetchRecords };
};

// 奖品相关操作
export const useRewards = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('points', { ascending: true });
    
    if (error) {
      handleError(error);
    } else if (data) {
      setRewards(data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        name: r.name as string,
        points: r.points as number,
        icon: r.icon as string,
        description: r.description as string,
        category: r.category as Reward['category'],
        createdAt: new Date(r.created_at as string).getTime(),
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const addReward = useCallback(async (reward: Omit<Reward, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('rewards')
      .insert({
        user_id: user.id,
        name: reward.name,
        points: reward.points,
        icon: reward.icon,
        description: reward.description,
        category: reward.category,
      })
      .select()
      .single();
    
    if (error) {
      handleError(error);
      return null;
    }
    await fetchRewards();
    return data?.id as string;
  }, [user, fetchRewards]);

  const updateReward = useCallback(async (rewardId: string, updates: Partial<Reward>) => {
    const { error } = await supabase
      .from('rewards')
      .update({
        name: updates.name,
        points: updates.points,
        icon: updates.icon,
        description: updates.description,
        category: updates.category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rewardId);
    
    if (error) handleError(error);
    else await fetchRewards();
    return !error;
  }, [fetchRewards]);

  const deleteReward = useCallback(async (rewardId: string) => {
    const { error } = await supabase
      .from('rewards')
      .update({ is_active: false })
      .eq('id', rewardId);
    
    if (error) handleError(error);
    else await fetchRewards();
    return !error;
  }, [fetchRewards]);

  return { rewards, loading, addReward, updateReward, deleteReward, refresh: fetchRewards };
};

// 兑换记录相关操作
export const useRedemptions = () => {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRedemptions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('redemptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      handleError(error);
    } else if (data) {
      setRedemptions(data.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        rewardId: r.reward_id as string,
        rewardName: r.reward_name as string,
        points: r.points as number,
        redeemedAt: new Date(r.created_at as string).getTime(),
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  const addRedemption = useCallback(async (reward: Reward) => {
    if (!user) return false;
    
    const { error } = await supabase.rpc('redeem_reward', {
      p_user_id: user.id,
      p_reward_id: reward.id,
      p_reward_name: reward.name,
      p_points: reward.points,
    });
    
    if (error) {
      handleError(error);
      return false;
    }
    await fetchRedemptions();
    return true;
  }, [user, fetchRedemptions]);

  return { redemptions, loading, addRedemption, refresh: fetchRedemptions };
};

// 徽章相关操作
export const useBadges = () => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<{ badge_type: string; unlocked_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBadges = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('badges')
      .select('badge_type, unlocked_at')
      .eq('user_id', user.id);
    
    if (error) handleError(error);
    else if (data) setBadges(data as { badge_type: string; unlocked_at: string }[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const addBadge = useCallback(async (badgeType: BadgeType) => {
    if (!user) return false;
    const { error } = await supabase
      .from('badges')
      .upsert({
        user_id: user.id,
        badge_type: badgeType,
      }, { onConflict: 'user_id,badge_type' });
    
    if (error) handleError(error);
    else await fetchBadges();
    return !error;
  }, [user, fetchBadges]);

  return { badges, loading, addBadge, refresh: fetchBadges };
};

// 用户资料相关操作
export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      handleError(error);
      setProfile(null);
    } else if (data) {
      setProfile(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateTotalPoints = useCallback(async (points: number) => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ total_points: points })
      .eq('id', user.id);
    
    if (error) {
      handleError(error);
      return false;
    }
    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  const updatePhone = useCallback(async (phone: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone })
      .eq('id', user.id);
    
    if (error) {
      handleError(error);
      return false;
    }
    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  const updateUsername = useCallback(async (username: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', user.id);
    
    if (error) {
      handleError(error);
      return false;
    }
    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);
    
    if (error) {
      handleError(error);
      return false;
    }
    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  return { profile, loading, updateTotalPoints, updatePhone, updateUsername, updateAvatar, refresh: fetchProfile };
};
