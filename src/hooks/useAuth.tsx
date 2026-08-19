import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'parent' | 'child';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  /** 用户角色（家长/孩子），登录后从 profiles 表加载 */
  role: UserRole | null;
  isParent: boolean;
  isChild: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** 用户名密码登录（需先执行 sql/username-login.sql 创建映射函数） */
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata?: { username?: string; role?: UserRole }) => Promise<{ error: Error | null; user?: User | null }>;
  /** 家长通过 RPC 直接创建子账号（不触发 signUp 邮件速率限制） */
  createChildAccount: (username: string, password: string, parentId: string) => Promise<{ error: Error | null; childEmail?: string }>;
  signOut: () => Promise<void>;
  /** 手机号验证码登录：发送验证码 */
  sendPhoneOtp: (phone: string) => Promise<{ error: Error | null }>;
  /** 手机号验证码登录：校验验证码并登录 */
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (data: { username?: string; avatar_url?: string }) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  // 加载用户角色（profiles.role），失败时回退到注册元数据
  const loadRole = useCallback(async (userId: string, fallbackRole?: UserRole) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (!error && data) {
        setRole(data.role);
        return;
      }
    } catch {
      // ignore, fallback below
    }
    setRole(fallbackRole ?? null);
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        const metaRole = session.user.user_metadata?.role;
        loadRole(session.user.id, metaRole === 'parent' ? 'parent' : metaRole === 'child' ? 'child' : undefined);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const metaRole = session.user.user_metadata?.role;
        loadRole(session.user.id, metaRole === 'parent' ? 'parent' : metaRole === 'child' ? 'child' : undefined);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isConfigured, loadRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user) {
      const metaRole = data.user.user_metadata?.role;
      loadRole(data.user.id, metaRole === 'parent' ? 'parent' : metaRole === 'child' ? 'child' : undefined);
    }
    return { error };
  }, [loadRole]);

  /** 用户名密码登录：先通过 RPC 反查邮箱，再走标准密码登录 */
  const signInWithUsername = useCallback(async (username: string, password: string) => {
    const { data: email, error: lookupError } = await supabase.rpc('get_email_by_username', {
      p_username: username,
    });
    if (lookupError || !email) {
      return { error: new Error('用户名不存在，请检查后重试') };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user) {
      const metaRole = data.user.user_metadata?.role;
      loadRole(data.user.id, metaRole === 'parent' ? 'parent' : metaRole === 'child' ? 'child' : undefined);
    }
    return { error: error ? new Error(error.message) : null };
  }, [loadRole]);

  /**
   * 家长创建子账号（绕过 signUp 邮件校验/速率限制）：
   * 通过 RPC 直接插入 auth.users + profiles，不再走标准 signUp。
   * 需先执行 sql/create-child-account.sql。
   */
  const createChildAccount = useCallback(async (
    username: string,
    password: string,
    parentId: string,
  ): Promise<{ error: Error | null; childEmail?: string }> => {
    const { data, error } = await supabase.rpc('create_child_account', {
      p_username: username,
      p_password: password,
      p_parent_id: parentId,
    });
    if (error || !data) {
      return { error: new Error(error?.message || '创建失败') };
    }
    return { error: null, childEmail: data.email };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { username?: string; role?: UserRole }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: metadata?.username || email.split('@')[0],
          role: metadata?.role || 'child',
        },
      },
    });
    return { error, user: data?.user ?? null };
  }, []);

  const signOut = useCallback(async () => {
    setRole(null);
    await supabase.auth.signOut();
  }, []);

  /** 手机号验证码登录：发送验证码（需 Supabase 启用 Phone provider + 短信服务） */
  const sendPhoneOtp = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error };
  }, []);

  /** 手机号验证码登录：校验验证码并建立会话 */
  const verifyPhoneOtp = useCallback(async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (data.user) {
      const metaRole = data.user.user_metadata?.role;
      loadRole(data.user.id, metaRole === 'parent' ? 'parent' : metaRole === 'child' ? 'child' : undefined);
    }
    return { error };
  }, [loadRole]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const updateProfile = useCallback(async (data: { username?: string; avatar_url?: string }): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);
    return { error };
  }, [user]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isConfigured,
    role,
    isParent: role === 'parent',
    isChild: role === 'child',
    signIn,
    signInWithUsername,
    signUp,
    signOut,
    sendPhoneOtp,
    verifyPhoneOtp,
    createChildAccount,
    resetPassword,
    updatePassword,
    updateProfile,
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
