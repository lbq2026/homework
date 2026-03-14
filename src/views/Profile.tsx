import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, User, Mail, Star, Award, Edit2, Check, X, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useProfile } from '@/hooks/useSupabaseData';
import type { AppState } from '@/types';

interface ProfileProps {
  state: AppState;
  onBack: () => void;
  onOpenPointManagement?: () => void;
}

export const Profile = ({ state, onBack, onOpenPointManagement }: ProfileProps) => {
  const { user, signOut } = useAuth();
  const { profile, updatePhone } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSave = async () => {
    setIsLoading(true);
    // 这里可以添加更新用户名的逻辑
    setIsEditing(false);
    setIsLoading(false);
  };

  const handleSavePhone = async () => {
    setIsLoading(true);
    const success = await updatePhone(phone);
    if (success) {
      setIsEditingPhone(false);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">个人中心</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
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
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-40"
                    placeholder="用户名"
                  />
                  <Button size="icon" variant="ghost" onClick={handleSave} disabled={isLoading}>
                    <Check className="w-4 h-4 text-green-500" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setIsEditing(false); setUsername(profile?.username || ''); }}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-800">{profile?.username || user?.email?.split('@')[0]}</h2>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(profile?.role)}`}>
                  {getRoleLabel(profile?.role)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
                <Mail className="w-4 h-4" />
                <span>{user?.email}</span>
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
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-gray-600">总积分</span>
            </div>
            <div className="text-3xl font-bold text-amber-600">
              {state.totalPoints}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-purple-500" />
              <span className="text-gray-600">徽章</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {state.badges.filter(badge => badge.unlockedAt).length}
            </div>
          </div>
        </motion.div>

        {/* 积分管理按钮 */}
        {onOpenPointManagement && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Button
              onClick={onOpenPointManagement}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl"
            >
              <Coins className="w-5 h-5 mr-2" />
              积分管理
            </Button>
          </motion.div>
        )}

        {/* 账户信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-md"
        >
          <h3 className="font-bold text-gray-800 mb-4">账户信息</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-500">注册时间</span>
              <span className="text-gray-800">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              {isEditingPhone ? (
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-gray-500">手机号</span>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="请输入手机号"
                      className="max-w-[200px]"
                    />
                    <Button size="icon" variant="ghost" onClick={handleSavePhone} disabled={isLoading}>
                      <Check className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingPhone(false); setPhone(profile?.phone || ''); }}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-gray-500">手机号</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">
                      {profile?.phone || '-'}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingPhone(true)}>
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">认证方式</span>
              <span className="text-gray-800">
                {user?.app_metadata?.provider === 'email' ? '邮箱' : user?.app_metadata?.provider || '邮箱'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 退出登录 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
    </div>
  );
};
