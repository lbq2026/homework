import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Shield, Smile, Phone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth.tsx';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth = ({ onLoginSuccess }: AuthProps) => {
  const { signIn, signInWithPhone, signUp, isConfigured } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 登录方式切换
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  
  // 登录表单
  const [loginData, setLoginData] = useState({
    email: '',
    phone: '',
    password: '',
    rememberMe: false,
  });
  
  // 注册表单
  const [registerData, setRegisterData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'child' as 'parent' | 'child',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    let result;
    if (loginMethod === 'email') {
      result = await signIn(loginData.email, loginData.password, loginData.rememberMe);
    } else {
      // 手机号登录，添加+86前缀
      const fullPhone = loginData.phone.startsWith('+') ? loginData.phone : `+86${loginData.phone}`;
      result = await signInWithPhone(fullPhone, loginData.password, loginData.rememberMe);
    }
    
    if (result.error) {
      setError(result.error.message);
    } else {
      onLoginSuccess();
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (registerData.password !== registerData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (registerData.password.length < 6) {
      setError('密码至少需要6位');
      return;
    }
    
    setIsLoading(true);
    
    const metadata: { username?: string; role?: 'parent' | 'child'; phone?: string } = {
      username: registerData.username,
      role: registerData.role,
    };
    
    // 如果有手机号，添加到 metadata
    if (registerData.phone) {
      metadata.phone = registerData.phone.startsWith('+') ? registerData.phone : `+86${registerData.phone}`;
    }
    
    const { error } = await signUp(
      registerData.email, 
      registerData.password,
      metadata
    );
    
    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage('注册成功！请查看邮箱验证邮件');
      // 清空表单
      setRegisterData({
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        username: '',
        role: 'child',
      });
    }
    setIsLoading(false);
  };

  // 如果 Supabase 未配置，显示提示
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full text-center"
        >
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">需要配置 Supabase</h2>
          <p className="text-gray-600 mb-6">
            请在项目根目录创建 <code className="bg-gray-100 px-2 py-1 rounded">.env</code> 文件，
            并添加您的 Supabase 配置信息。
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left text-sm">
            <p className="text-gray-500 mb-2">.env 文件内容：</p>
            <code className="text-blue-600">
              VITE_SUPABASE_URL=your_supabase_url<br/>
              VITE_SUPABASE_ANON_KEY=your_anon_key
            </code>
          </div>
          <Button 
            onClick={onLoginSuccess}
            className="mt-6 w-full bg-gray-500 hover:bg-gray-600"
          >
            先使用本地模式
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* 头部装饰 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">小勇士积分王国</h1>
          <p className="text-blue-100 mt-1">登录开始你的积分之旅</p>
        </div>

        {/* 表单区域 */}
        <div className="p-6">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">登录</TabsTrigger>
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
                  {/* 登录方式切换 */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                        loginMethod === 'email'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Mail className="w-4 h-4 inline mr-1" />
                      邮箱登录
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('phone')}
                      className={`flex-1 py-2 text-sm rounded-lg transition-all ${
                        loginMethod === 'phone'
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Phone className="w-4 h-4 inline mr-1" />
                      手机号登录
                    </button>
                  </div>

                  {loginMethod === 'email' ? (
                    <div>
                      <Label htmlFor="login-email">邮箱</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="login-phone">手机号</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            +86
                          </span>
                          <Input
                            id="login-phone"
                            type="tel"
                            placeholder="请输入手机号"
                            value={loginData.phone}
                            onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                            className="rounded-l-none pl-3"
                            required
                            maxLength={11}
                          />
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* 记住我选项 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={loginData.rememberMe}
                        onCheckedChange={(checked) => 
                          setLoginData({ ...loginData, rememberMe: checked as boolean })
                        }
                      />
                      <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                        记住登录状态（30天）
                      </Label>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6"
                    disabled={isLoading}
                  >
                    {isLoading ? '登录中...' : '登录'}
                  </Button>
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
                    <Label htmlFor="register-username">用户名 <span className="text-red-500">*</span></Label>
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
                    <Label htmlFor="register-email">邮箱 <span className="text-red-500">*</span></Label>
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
                    <Label htmlFor="register-phone">手机号（可选）</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                          +86
                        </span>
                        <Input
                          id="register-phone"
                          type="tel"
                          placeholder="绑定手机号用于登录"
                          value={registerData.phone}
                          onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                          className="rounded-l-none pl-3"
                          maxLength={11}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="register-password">密码 <span className="text-red-500">*</span></Label>
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
                        minLength={6}
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
                    <Label htmlFor="register-confirm">确认密码 <span className="text-red-500">*</span></Label>
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
                    <Label>角色 <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'parent' })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          registerData.role === 'parent'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Shield className="w-5 h-5" />
                        <span>家长</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegisterData({ ...registerData, role: 'child' })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          registerData.role === 'child'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Smile className="w-5 h-5" />
                        <span>孩子</span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg"
                    >
                      {error}
                    </motion.div>
                  )}

                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-green-600 text-sm text-center bg-green-50 p-2 rounded-lg flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {successMessage}
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full py-6"
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

export default Auth;
