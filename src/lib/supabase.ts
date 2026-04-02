import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端（带安全检查）
let supabaseInstance: SupabaseClient | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any> = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase 配置缺失！请检查 .env 文件中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
    // 创建一个模拟客户端以避免运行时错误
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as SupabaseClient<any>;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseInstance = createClient<any>(supabaseUrl, supabaseAnonKey);
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
