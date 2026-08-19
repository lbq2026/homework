import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Shield, Smile, Smartphone, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth.tsx';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth = ({ onLoginSuccess }: AuthProps) => {
  const { signIn, signInWithUsername, signUp, resetPassword, sendPhoneOtp, verifyPhoneOtp, isConfigured } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // 手机号登录
  const [phoneData, setPhoneData] = useState({ phone: '', otp: '' });
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  
  // 登录表单
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  /** 登录账号类型：email=邮箱登录（默认）｜username=用户名登录 */
  const [loginMode, setLoginMode] = useState<'email' | 'username'>('email');
  
  // 注册表单
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'child' as 'parent' | 'child',
  });

  // 发送密码重置邮件
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('请输入邮箱');
      return;
    }
    setIsSendingReset(true);
    setError(null);
    const { error } = await resetPassword(forgotEmail.trim());
    setIsSendingReset(false);
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  };

  // 发送手机验证码
  const handleSendOtp = async () => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneData.phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setError(null);
    setIsSendingOtp(true);
    const { error } = await sendPhoneOtp(phoneData.phone);
    setIsSendingOtp(false);
    if (error) {
      setError(`验证码发送失败：${error.message}`);
      return;
    }
    setOtpSent(true);
    setOtpCountdown(60);
    const timer = setInterval(() => {
      setOtpCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // 手机验证码登录
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneData.otp.trim()) {
      setError('请输入验证码');
      return;
    }
    setError(null);
    setIsLoading(true);
    const { error } = await verifyPhoneOtp(phoneData.phone, phoneData.otp.trim());
    setIsLoading(false);
    if (error) {
      setError(`登录失败：${error.message}`);
    } else {
      onLoginSuccess();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = loginMode === 'username'
      ? await signInWithUsername(loginData.email.trim(), loginData.password)
      : await signIn(loginData.email.trim(), loginData.password);

    if (error) {
      setError(error.message);
    } else {
      onLoginSuccess();
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (registerData.password.length < 6) {
      setError('密码至少需要6位');
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await signUp(
      registerData.email, 
      registerData.password,
      { username: registerData.username, role: registerData.role }
    );
    
    if (error) {
      setError(error.message);
    } else {
      setError('注册成功！请查看邮箱验证邮件');
    }
    setIsLoading(false);
  };

  // 如果 Supabase 未配置，显示提示
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-surface p-8 shadow-card max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-title font-bold text-neutral-800 mb-4">需要配置 Supabase</h2>
          <p className="text-neutral-600 mb-6">
            请在项目根目录创建 <code className="bg-neutral-100 px-2 py-1 rounded">.env</code> 文件，
            并添加您的 Supabase 配置信息。
          </p>
          <div className="bg-neutral-50 rounded-card p-4 text-left text-body">
            <p className="text-neutral-400 mb-2">.env 文件内容：</p>
            <code className="text-brand-600">
              VITE_SUPABASE_URL=your_supabase_url<br/>
              VITE_SUPABASE_ANON_KEY=your_anon_key
            </code>
          </div>
          <Button 
            onClick={onLoginSuccess}
            className="mt-6 w-full bg-neutral-600 hover:bg-neutral-800 rounded-button"
          >
            先使用本地模式
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-surface shadow-card max-w-md w-full overflow-hidden"
      >
        {/* 头部装饰 */}
        <div className="bg-gradient-to-r from-brand-400 to-brand-500 p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-title font-bold text-white">小勇士积分王国</h1>
          <p className="text-brand-100 mt-1">登录开始你的积分之旅</p>
        </div>

        {/* 表单区域 */}
        <div className="p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="phone">手机登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {/* 登录表单 */}
              <TabsContent value="login">
                <motion.form
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div>
                    <Label>账号类型</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => { setLoginMode('email'); setError(null); }}
                        className={`py-2 rounded-input text-body font-bold border-2 transition-all ${
                          loginMode === 'email'
                            ? 'bg-brand-50 border-brand-500 text-brand-600'
                            : 'bg-white border-neutral-200 text-neutral-400'
                        }`}
                      >
                        邮箱登录
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLoginMode('username'); setError(null); }}
                        className={`py-2 rounded-input text-body font-bold border-2 transition-all ${
                          loginMode === 'username'
                            ? 'bg-brand-50 border-brand-500 text-brand-600'
                            : 'bg-white border-neutral-200 text-neutral-400'
                        }`}
                      >
                        用户名登录
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="login-email">{loginMode === 'username' ? '用户名' : '邮箱'}</Label>
                    <div className="relative mt-1">
                      {loginMode === 'username'
                        ? <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        : <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
                      <Input
                        id="login-email"
                        type={loginMode === 'username' ? 'text' : 'email'}
                        placeholder={loginMode === 'username' ? '输入用户名，如 TIMO' : 'your@email.com'}
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="login-password">密码</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="输入密码"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-semantic-danger text-body text-center bg-semantic-danger-soft p-2 rounded-card"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-brand-500 hover:bg-brand-400 text-white rounded-button shadow-button py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? '登录中...' : '登录'}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgot(!showForgot)}
                      className="text-body text-brand-500 hover:text-brand-600"
                    >
                      忘记密码？
                    </button>
                  </div>

                  {showForgot && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleForgotPassword}
                      className="space-y-3 bg-brand-50 rounded-card p-4"
                    >
                      <p className="text-body text-neutral-600">
                        输入注册邮箱，我们将发送密码重置链接
                      </p>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="bg-white rounded-input"
                        required
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full rounded-button"
                        disabled={isSendingReset}
                      >
                        {isSendingReset ? '发送中...' : resetSent ? '已发送，请查收邮件' : '发送重置链接'}
                      </Button>
                      {resetSent && (
                        <p className="text-caption text-semantic-success text-center">
                          重置邮件已发送，请点击邮件中的链接设置新密码
                        </p>
                      )}
                    </motion.form>
                  )}
                </motion.form>
              </TabsContent>

              {/* 手机验证码登录 */}
              <TabsContent value="phone">
                <motion.form
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handlePhoneLogin}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="phone-number">手机号</Label>
                    <div className="relative mt-1">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone-number"
                        type="tel"
                        placeholder="请输入手机号"
                        value={phoneData.phone}
                        onChange={(e) => setPhoneData({ ...phoneData, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone-otp">验证码</Label>
                    <div className="relative mt-1">
                      <MessageSquareText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="phone-otp"
                        type="text"
                        inputMode="numeric"
                        placeholder="6 位验证码"
                        value={phoneData.otp}
                        onChange={(e) => setPhoneData({ ...phoneData, otp: e.target.value })}
                        className="pl-10 pr-24"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || otpCountdown > 0}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-brand-500 text-caption font-bold"
                      >
                        {otpCountdown > 0 ? `${otpCountdown}s` : isSendingOtp ? '发送中...' : otpSent ? '重新发送' : '获取验证码'}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-semantic-danger text-body text-center bg-semantic-danger-soft p-2 rounded-card"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-brand-500 hover:bg-brand-400 text-white rounded-button shadow-button py-6"
                    disabled={isLoading || !otpSent}
                  >
                    {isLoading ? '登录中...' : '验证码登录'}
                  </Button>
                  {!otpSent && (
                    <p className="text-caption text-neutral-400 text-center">
                      需先在 Supabase 启用手机号认证并配置短信服务
                    </p>
                  )}
                </motion.form>
              </TabsContent>

              {/* 注册表单 */}
              <TabsContent value="register">
                <motion.form
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="register-username">用户名</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="输入用户名"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-email">邮箱</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-password">密码</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="至少6位密码"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-confirm">确认密码</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="register-confirm"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="再次输入密码"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label>角色</Label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'parent' })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-card border-2 transition-all ${
                          registerData.role === 'parent'
                            ? 'border-role-parent bg-role-parent-soft text-role-parent'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                        <span className="font-bold">家长</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'child' })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-card border-2 transition-all ${
                          registerData.role === 'child'
                            ? 'border-role-child bg-role-child-soft text-role-child'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <Smile className="w-5 h-5" />
                        <span className="font-bold">孩子</span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-body text-center p-2 rounded-card ${
                        error.includes('成功') ? 'text-semantic-success bg-semantic-success-soft' : 'text-semantic-danger bg-semantic-danger-soft'
                      }`}
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-brand-500 hover:bg-brand-400 text-white rounded-button shadow-button py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? '注册中...' : '注册'}
                  </Button>
                </motion.form>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};
