import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
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
  /** 查询当前登录用户在 profiles.role 的角色；未登录或查询失败返回 null（登录落地用） */
  fetchUserRole: () => Promise<UserRole | null>;
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
  const loadedRoleFor = useRef<string | null>(null);
  const loadingRoleFor = useRef<string | null>(null);
  const loadRole = useCallback(async (userId: string, fallbackRole?: UserRole) => {
    // 成功加载过的用户不再重复请求，避免 getSession/onAuthStateChange/signIn 重复触发；
    // 进行中的请求同样去重。成功标记在拿到角色后才写入：
    // 查询失败（网络瞬断等）不标记，下一个 auth 事件（如 token 刷新）可重试自愈
    if (loadedRoleFor.current === userId || loadingRoleFor.current === userId) return;
    loadingRoleFor.current = userId;

    const fetchRole = async (): Promise<UserRole | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (!error && data) return data.role as UserRole;
      } catch {
        // ignore, retry below
      }
      return null;
    };

    let role = await fetchRole();
    if (!role) {
      // 请求可能被页面刷新/HMR/网络抖动中断，稍候重试一次
      await new Promise(resolve => setTimeout(resolve, 500));
      role = await fetchRole();
    }
    loadingRoleFor.current = null;
    if (role) {
      loadedRoleFor.current = userId;
      setRole(role);
    } else {
      // 两次均失败：落到注册元数据兜底，但不写成功标记，后续 auth 事件可重新查询
      setRole(fallbackRole ?? null);
    }
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
        loadedRoleFor.current = null;
        loadingRoleFor.current = null;
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

  // 查询当前登录用户角色（用于登录成功后按角色落地）
  const fetchUserRole = useCallback(async (): Promise<UserRole | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!error && data) return data.role as UserRole;
    } catch {
      // 查询失败按无角色处理
    }
    return null;
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
    fetchUserRole,
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
