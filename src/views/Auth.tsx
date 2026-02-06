import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, Shield, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth.tsx';

interface AuthProps {
  onLoginSuccess: () => void;
}

export const Auth = ({ onLoginSuccess }: AuthProps) => {
  const { signIn, signUp, isConfigured } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 登录表单
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  // 注册表单
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    role: 'child' as 'parent' | 'child',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const { error } = await signIn(loginData.email, loginData.password);
    
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
                      className={`text-sm text-center p-2 rounded-lg ${
                        error.includes('成功') ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                      }`}
                    >
                      {error}
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
