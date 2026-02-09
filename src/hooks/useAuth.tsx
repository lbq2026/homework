import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  // 登录相关
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { username?: string; role?: 'parent' | 'child'; phone?: string }) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signOut: () => Promise<void>;
  // 密码管理
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  // 用户信息管理
  updateProfile: (data: { username?: string; avatar_url?: string; phone?: string }) => Promise<{ error: Error | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  updatePhone: (newPhone: string) => Promise<{ error: Error | null }>;
  // 会话管理
  refreshSession: () => Promise<void>;
  getRememberMe: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 记住登录状态的存储键
const REMEMBER_ME_KEY = 'littleWarrior_rememberMe';
const SESSION_EXPIRY_SHORT = 60 * 60 * 24; // 1天（秒）
const SESSION_EXPIRY_LONG = 60 * 60 * 24 * 30; // 30天（秒）

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // 获取当前会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isConfigured]);

  // 邮箱登录
  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    // 存储记住我选项
    localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(rememberMe));
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password,
      options: {
        // 根据记住我选项设置会话过期时间
        // @ts-ignore - Supabase JS 库支持此属性但类型定义未更新
        expiresIn: rememberMe ? SESSION_EXPIRY_LONG : SESSION_EXPIRY_SHORT,
      }
    });

    // 更新用户资料的 remember_me 字段
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ remember_me: rememberMe }).eq('id', user.id);
      }
    }

    return { error };
  }, []);

  // 手机号登录
  const signInWithPhone = useCallback(async (phone: string, password: string, rememberMe: boolean = false) => {
    localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify(rememberMe));
    
    // Supabase 支持手机号登录，格式为 +86138xxxx
    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password,
      options: {
        // @ts-ignore - Supabase JS 库支持此属性但类型定义未更新
        expiresIn: rememberMe ? SESSION_EXPIRY_LONG : SESSION_EXPIRY_SHORT,
      }
    });

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ remember_me: rememberMe }).eq('id', user.id);
      }
    }

    return { error };
  }, []);

  // 注册
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    metadata?: { username?: string; role?: 'parent' | 'child'; phone?: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: metadata?.username || email.split('@')[0],
          role: metadata?.role || 'child',
          phone: metadata?.phone,
        },
      },
    });

    // 如果注册成功，更新 profiles 表
    if (!error && data.user) {
      await supabase.from('profiles').update({
        username: metadata?.username || email.split('@')[0],
        email: email,
        phone: metadata?.phone,
        role: metadata?.role || 'child',
      }).eq('id', data.user.id);
    }

    return { error, data };
  }, []);

  // 登出
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(REMEMBER_ME_KEY);
  }, []);

  // 重置密码
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  // 更新密码
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  // 更新用户资料
  const updateProfile = useCallback(async (data: { username?: string; avatar_url?: string; phone?: string }): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const updates: Record<string, unknown> = {};
    if (data.username !== undefined) updates.username = data.username;
    if (data.avatar_url !== undefined) updates.avatar_url = data.avatar_url;
    if (data.phone !== undefined) updates.phone = data.phone;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    return { error };
  }, [user]);

  // 更新邮箱
  const updateEmail = useCallback(async (newEmail: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (!error) {
      // 同步更新 profiles 表
      await supabase.from('profiles').update({ email: newEmail }).eq('id', user.id);
    }
    
    return { error };
  }, [user]);

  // 更新手机号
  const updatePhone = useCallback(async (newPhone: string) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    const { error } = await supabase.auth.updateUser({ phone: newPhone });
    
    if (!error) {
      // 同步更新 profiles 表
      await supabase.from('profiles').update({ phone: newPhone }).eq('id', user.id);
    }
    
    return { error };
  }, [user]);

  // 刷新会话
  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
  }, []);

  // 获取记住我状态
  const getRememberMe = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(REMEMBER_ME_KEY) || 'false');
    } catch {
      return false;
    }
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isConfigured,
    signIn,
    signInWithPhone,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    updateEmail,
    updatePhone,
    refreshSession,
    getRememberMe,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
