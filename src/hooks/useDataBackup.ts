import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { AppState } from '@/types';

export interface BackupRecord {
  id: string;
  createdAt: string;
  backupName: string;
  deviceInfo: string;
  fileSize: number;
}

// 获取设备信息
const getDeviceInfo = (): string => {
  const userAgent = navigator.userAgent;
  let deviceInfo = '未知设备';
  
  if (/Windows/.test(userAgent)) deviceInfo = 'Windows';
  else if (/Mac/.test(userAgent)) deviceInfo = 'Mac';
  else if (/Linux/.test(userAgent)) deviceInfo = 'Linux';
  else if (/Android/.test(userAgent)) deviceInfo = 'Android';
  else if (/iPhone|iPad|iPod/.test(userAgent)) deviceInfo = 'iOS';
  
  return deviceInfo;
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const useDataBackup = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupRecord[]>([]);

  // 创建云端备份
  const createBackup = useCallback(async (appState: AppState, customName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: '未登录' };
    
    setLoading(true);
    try {
      const backupData = {
        primaryCategories: appState.primaryCategories,
        secondaryCategories: appState.secondaryCategories,
        tertiaryCategories: appState.tertiaryCategories,
        tasks: appState.tasks,
        dailyRecords: appState.dailyRecords,
        rewards: appState.rewards,
        redemptions: appState.redemptions,
        badges: appState.badges,
        pointAdjustments: appState.pointAdjustments,
        totalPoints: appState.totalPoints,
        settings: appState.settings,
        backupVersion: '1.0',
        backupAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(backupData);
      const fileSize = new Blob([jsonString]).size;
      const backupName = customName || `自动备份 ${new Date().toLocaleString('zh-CN')}`;

      const { error } = await supabase
        .from('data_backups')
        .insert({
          user_id: user.id,
          backup_name: backupName,
          backup_data: backupData,
          device_info: getDeviceInfo(),
          file_size: fileSize,
        });

      if (error) throw error;
      
      return { success: true };
    } catch (err) {
      console.error('Create backup error:', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 获取备份列表
  const fetchBackups = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: '未登录' };
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_backups')
        .select('id, created_at, backup_name, device_info, file_size')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBackups: BackupRecord[] = (data || []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        createdAt: item.created_at as string,
        backupName: item.backup_name as string,
        deviceInfo: item.device_info as string,
        fileSize: item.file_size as number,
      }));

      setBackups(formattedBackups);
      return { success: true };
    } catch (err) {
      console.error('Fetch backups error:', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 从云端恢复备份
  const restoreBackup = useCallback(async (backupId: string): Promise<{ success: boolean; data?: AppState; error?: string }> => {
    if (!user) return { success: false, error: '未登录' };
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_backups')
        .select('backup_data')
        .eq('id', backupId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data?.backup_data) throw new Error('备份数据为空');

      const backupData = data.backup_data as Record<string, unknown>;
      
      // 转换数据格式
      const restoredState: AppState = {
        primaryCategories: (backupData.primaryCategories as AppState['primaryCategories']) || [],
        secondaryCategories: (backupData.secondaryCategories as AppState['secondaryCategories']) || [],
        tertiaryCategories: (backupData.tertiaryCategories as AppState['tertiaryCategories']) || [],
        tasks: (backupData.tasks as AppState['tasks']) || [],
        dailyRecords: (backupData.dailyRecords as AppState['dailyRecords']) || [],
        rewards: (backupData.rewards as AppState['rewards']) || [],
        redemptions: (backupData.redemptions as AppState['redemptions']) || [],
        badges: (backupData.badges as AppState['badges']) || [],
        pointAdjustments: (backupData.pointAdjustments as AppState['pointAdjustments']) || [],
        totalPoints: (backupData.totalPoints as number) || 0,
        settings: (backupData.settings as AppState['settings']) || { soundEnabled: true, lastVisitDate: new Date().toISOString().split('T')[0] },
      };

      return { success: true, data: restoredState };
    } catch (err) {
      console.error('Restore backup error:', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 删除备份
  const deleteBackup = useCallback(async (backupId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: '未登录' };
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('data_backups')
        .delete()
        .eq('id', backupId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      // 刷新列表
      await fetchBackups();
      return { success: true };
    } catch (err) {
      console.error('Delete backup error:', err);
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  }, [user, fetchBackups]);

  // 自动备份（静默备份，不显示加载状态）
  const autoBackup = useCallback(async (appState: AppState): Promise<void> => {
    if (!user) return;
    
    try {
      const backupData = {
        primaryCategories: appState.primaryCategories,
        secondaryCategories: appState.secondaryCategories,
        tertiaryCategories: appState.tertiaryCategories,
        tasks: appState.tasks,
        dailyRecords: appState.dailyRecords,
        rewards: appState.rewards,
        redemptions: appState.redemptions,
        badges: appState.badges,
        pointAdjustments: appState.pointAdjustments,
        totalPoints: appState.totalPoints,
        settings: appState.settings,
        backupVersion: '1.0',
        backupAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(backupData);
      const fileSize = new Blob([jsonString]).size;

      await supabase.from('data_backups').insert({
        user_id: user.id,
        backup_name: `自动备份 ${new Date().toLocaleString('zh-CN')}`,
        backup_data: backupData,
        device_info: getDeviceInfo(),
        file_size: fileSize,
      });
    } catch (err) {
      // 自动备份失败不报错
      console.error('Auto backup failed:', err);
    }
  }, [user]);

  return {
    backups,
    loading,
    createBackup,
    fetchBackups,
    restoreBackup,
    deleteBackup,
    autoBackup,
    formatFileSize,
  };
};

export default useDataBackup;
