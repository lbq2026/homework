import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth.tsx';
import type { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const handleError = (error: unknown, context: string = '') => {
  console.error(`Supabase error${context ? ` (${context})` : ''}:`, error);
  return null;
};

/**
 * 用户资料操作（唯一被引用的 hook，其余 useTasks/useDailyRecords/useRewards
 * 等历史实现已随 useSyncedAppState 统一管理而移除）。
 */
export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
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
      handleError(error, 'fetchProfile');
      setProfile(null);
    } else if (data) {
      setProfile(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updatePhone = useCallback(async (phone: string) => {
    if (!user) {
      console.error('updatePhone failed: user not authenticated');
      return false;
    }

    // 先尝试更新，如果记录不存在则创建
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone })
      .eq('id', user.id)
      .select();

    if (error) {
      const insertResult = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          phone: phone,
          role: 'child',
          total_points: 0
        })
        .select();

      if (insertResult.error) {
        handleError(insertResult.error, 'insertProfile');
        return false;
      }
    }

    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  const updateUsername = useCallback(async (username: string) => {
    if (!user) {
      console.error('updateUsername failed: user not authenticated');
      return false;
    }

    // 先尝试更新，如果记录不存在则创建
    const { error } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', user.id)
      .select();

    if (error) {
      const insertResult = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: username,
          role: 'child',
          total_points: 0
        })
        .select();

      if (insertResult.error) {
        handleError(insertResult.error, 'insertProfile');
        return false;
      }
    }

    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!user) {
      console.error('updateAvatar failed: user not authenticated');
      return false;
    }

    // 先尝试更新，如果记录不存在则创建
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id)
      .select();

    if (error) {
      const insertResult = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          avatar_url: avatarUrl,
          role: 'child',
          total_points: 0
        })
        .select();

      if (insertResult.error) {
        handleError(insertResult.error, 'insertProfile');
        return false;
      }
    }

    await fetchProfile();
    return true;
  }, [user, fetchProfile]);

  return { profile, loading, updatePhone, updateUsername, updateAvatar, refresh: fetchProfile };
};
