import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, LogOut, User, Mail, Star, Award, Edit2, Check, X, 
  RefreshCw, Cloud, Phone, Lock, Shield, Smartphone, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useProfile } from '@/hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


interface ProfileProps {
  totalPoints?: number;
  onBack: () => void;
  onRefresh?: () => Promise<void>;
  isSyncing?: boolean;
  onManagePoints?: () => void;
}

export const Profile = ({ totalPoints, onBack, onRefresh, isSyncing, onManagePoints }: ProfileProps) => {
  const { user, signOut, updateProfile, updateEmail, updatePhone, updatePassword } = useAuth();
  const { profile, refresh } = useProfile();
  
  // 编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // 表单数据
  const [username, setUsername] = useState(profile?.username || '');
  
  // 对话框状态
  const [showBindPhone, setShowBindPhone] = useState(false);
  const [showBindEmail, setShowBindEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // 绑定表单
  const [phoneForm, setPhoneForm] = useState({ phone: '', verifyCode: '' });
  const [emailForm, setEmailForm] = useState({ email: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSaveName = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    const { error } = await updateProfile({ username: username.trim() });
    if (error) {
      setMessage({ type: 'error', text: '更新失败：' + error.message });
    } else {
      setMessage({ type: 'success', text: '昵称已更新' });
      setIsEditingName(false);
      await refresh();
    }
    setIsLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // 绑定手机号
  const handleBindPhone = async () => {
    if (!phoneForm.phone.trim()) {
      setMessage({ type: 'error', text: '请输入手机号' });
      return;
    }
    setIsLoading(true);
    const fullPhone = phoneForm.phone.startsWith('+') ? phoneForm.phone : `+86${phoneForm.phone}`;
    const { error } = await updatePhone(fullPhone);
    if (error) {
      setMessage({ type: 'error', text: '绑定失败：' + error.message });
    } else {
      setMessage({ type: 'success', text: '手机号绑定成功' });
      setShowBindPhone(false);
      await refresh();
    }
    setIsLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  // 绑定/修改邮箱
  const handleBindEmail = async () => {
    if (!emailForm.email.trim()) {
      setMessage({ type: 'error', text: '请输入邮箱' });
      return;
    }
    setIsLoading(true);
    const { error } = await updateEmail(emailForm.email.trim());
    if (error) {
      setMessage({ type: 'error', text: '绑定失败：' + error.message });
    } else {
      setMessage({ type: 'success', text: '验证邮件已发送，请查收' });
      setShowBindEmail(false);
    }
    setIsLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少需要6位' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }
    setIsLoading(true);
    const { error } = await updatePassword(passwordForm.newPassword);
    if (error) {
      setMessage({ type: 'error', text: '修改失败：' + error.message });
    } else {
      setMessage({ type: 'success', text: '密码修改成功' });
      setShowChangePassword(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
    setIsLoading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'parent': return '家长';
      case 'child': return '小勇士';
      default: return '用户';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'parent': return 'bg-purple-100 text-purple-700';
      case 'child': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // 隐藏部分信息的辅助函数
  const maskPhone = (phone?: string) => {
    if (!phone) return '未绑定';
    return phone.replace(/(\+\d{2})\d{7}(\d{4})/, '$1****$2');
  };

  const maskEmail = (email?: string) => {
    if (!email) return '未绑定';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">个人资料</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 消息提示 */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-3 rounded-xl text-center text-sm ${
                message.type === 'success' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 用户信息卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-3xl text-white">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-10 h-10" />
              )}
            </div>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-40"
                    placeholder="用户名"
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={isLoading}>
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { 
                    setIsEditingName(false); 
                    setUsername(profile?.username || ''); 
                  }}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">
                    {profile?.username || user?.email?.split('@')[0]}
                  </h2>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)}>
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(profile?.role)}`}>
                  {getRoleLabel(profile?.role)}
                </span>
                {profile?.remember_me && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    已记住登录
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 统计信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onManagePoints}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 text-left border-2 border-transparent hover:border-amber-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-gray-600">总积分</span>
              <span className="text-xs text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">管理</span>
            </div>
            <div className="text-3xl font-bold text-amber-600">
              {totalPoints ?? profile?.total_points ?? 0}
            </div>
          </motion.button>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="text-gray-600">徽章</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              0
            </div>
          </div>
        </motion.div>

        {/* 账户信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-md"
        >
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            账户信息
          </h3>
          <div className="space-y-3">
            {/* 邮箱 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">邮箱</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-800 text-sm">{maskEmail(user?.email)}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-blue-600"
                  onClick={() => setShowBindEmail(true)}
                >
                  {user?.email ? '修改' : '绑定'}
                </Button>
              </div>
            </div>

            {/* 手机号 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">手机号</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-800 text-sm">{maskPhone(profile?.phone || user?.phone)}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-blue-600"
                  onClick={() => setShowBindPhone(true)}
                >
                  {(profile?.phone || user?.phone) ? '修改' : '绑定'}
                </Button>
              </div>
            </div>

            {/* 密码 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">密码</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-blue-600"
                onClick={() => setShowChangePassword(true)}
              >
                修改密码
              </Button>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">注册时间</span>
              <span className="text-gray-800">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 数据同步 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-md"
        >
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            数据同步
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">同步状态</span>
              <span className={`flex items-center gap-1 ${isSyncing ? 'text-blue-600' : 'text-green-600'}`}>
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">同步中...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span className="text-sm">已同步</span>
                  </>
                )}
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isSyncing}
              variant="outline"
              className="w-full h-12 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '同步中...' : '立即同步'}
            </Button>
          </div>
        </motion.div>

        {/* 退出登录 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full h-14 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="w-5 h-5 mr-2" />
            退出登录
          </Button>
        </motion.div>
      </div>

      {/* 绑定手机号对话框 */}
      <Dialog open={showBindPhone} onOpenChange={setShowBindPhone}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              {(profile?.phone || user?.phone) ? '修改手机号' : '绑定手机号'}
            </DialogTitle>
            <DialogDescription>
              绑定手机号后可以使用手机号登录
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>手机号</Label>
              <div className="flex mt-1">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  +86
                </span>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phoneForm.phone}
                  onChange={(e) => setPhoneForm({ ...phoneForm, phone: e.target.value })}
                  className="rounded-l-none"
                  maxLength={11}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBindPhone(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={handleBindPhone}
                disabled={isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? '处理中...' : '确认'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 绑定邮箱对话框 */}
      <Dialog open={showBindEmail} onOpenChange={setShowBindEmail}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              {user?.email ? '修改邮箱' : '绑定邮箱'}
            </DialogTitle>
            <DialogDescription>
              {user?.email 
                ? '修改邮箱后需要重新验证' 
                : '绑定邮箱后可以使用邮箱登录和找回密码'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>邮箱地址</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowBindEmail(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={handleBindEmail}
                disabled={isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? '发送中...' : '发送验证'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 修改密码对话框 */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-500" />
              修改密码
            </DialogTitle>
            <DialogDescription>
              请设置一个新的安全密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>新密码</Label>
              <Input
                type="password"
                placeholder="至少6位"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="mt-1"
                minLength={6}
              />
            </div>
            <div>
              <Label>确认密码</Label>
              <Input
                type="password"
                placeholder="再次输入新密码"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowChangePassword(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button 
                onClick={handleChangePassword}
                disabled={isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? '保存中...' : '确认修改'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
