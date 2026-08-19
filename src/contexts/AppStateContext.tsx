import { createContext, useContext, type ReactNode } from 'react';
import type { AppState } from '@/types';
import { useSyncedAppState } from '@/hooks/useSyncedAppState';

/** useSyncedAppState 的返回值类型（Context 对外契约） */
export interface AppStateContextValue extends ReturnType<typeof useSyncedAppState> {
  state: AppState;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

/**
 * 全局状态 Provider：向整棵组件树提供 AppState 与业务操作方法，
 * 消除 App.tsx → views 之间的 20+ 回调 prop drilling。
 */
export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const value = useSyncedAppState();
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

/** 消费全局状态：const { state, addTask, ... } = useAppState(); */
export const useAppState = (): AppStateContextValue => {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState 必须在 <AppStateProvider> 内使用');
  }
  return ctx;
};
