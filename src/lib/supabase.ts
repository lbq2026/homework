import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// 从环境变量获取 Supabase 配置
// 请确保在项目根目录创建 .env 文件并配置以下变量
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端（带安全检查）
let supabaseInstance: SupabaseClient<Database> | null = null;

export const supabase: SupabaseClient<Database> = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase 配置缺失！请检查 .env 文件中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
    // 创建一个模拟客户端以避免运行时错误
    return {} as SupabaseClient<Database>;
  }
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
    },
  });
  return supabaseInstance;
})();

// 检查 Supabase 是否已配置
export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};

// 获取当前用户
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured() || !supabaseInstance) {
    return null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 获取当前会话
export const getCurrentSession = async () => {
  if (!isSupabaseConfigured() || !supabaseInstance) {
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
