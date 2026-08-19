import { useEffect, useRef } from 'react';
import { getTodayStr } from '@/utils/date';
import type { AppState } from '@/types';

/**
 * 本地作业提醒（PWA Later 阶段降级方案）：
 * 通过浏览器 Notification API 在指定时间触发提醒，无需服务端推送。
 * 注意：Notification 仅在 HTTPS 或 localhost 可用，需用户授权。
 */

/** 请求通知授权（需用户手势触发） */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
};

/** 计算今日未完成任务数 */
const getTodayIncomplete = (state: AppState): number => {
  const today = getTodayStr();
  const record = state.dailyRecords.find(r => r.date === today);
  if (!record || record.tasks.length === 0) return 0;
  return record.tasks.filter(t => !t.completed).length;
};

/** 已提醒日期（避免同一天重复提醒） */
const remindedDates = new Set<string>();

export const useReminder = (state: AppState, remindEnabled: boolean, remindTime: string) => {
  const stateRef = useRef(state);
  stateRef.current = state;
  const enabledRef = useRef(remindEnabled);
  enabledRef.current = remindEnabled;
  const timeRef = useRef(remindTime);
  timeRef.current = remindTime;

  useEffect(() => {
    if (!remindEnabled) return;
    if (!('Notification' in window)) return;

    // 定时检查（每 30 秒）
    const timer = setInterval(() => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const today = getTodayStr();

      if (`${hh}:${mm}` !== timeRef.current) return;
      if (remindedDates.has(today)) return;

      const incomplete = getTodayIncomplete(stateRef.current);
      if (incomplete === 0) return; // 今日已完成，无需提醒

      remindedDates.add(today);
      try {
        new Notification('小勇士积分王国', {
          body: `今天还有 ${incomplete} 项作业没完成，快来打卡吧！`,
          icon: '/icons/icon-192.png',
          tag: 'daily-task-reminder',
        });
      } catch {
        // 部分环境需在 Service Worker 中触发，忽略
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [remindEnabled]);
};
