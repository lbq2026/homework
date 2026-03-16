import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, User, Mail, Star, Award, Edit2, Check, X, Coins, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useProfile } from '@/hooks/useSupabaseData';
import type { AppState } from '@/types';
import { toast } from 'sonner';

interface ProfileProps {
  state: AppState;
  onBack: () => void;
  onOpenPointManagement?: () => void;
}

const AVATAR_OPTIONS = [
  { emoji: '😊', label: '微笑' },
  { emoji: '😎', label: '酷' },
  { emoji: '🤩', label: '兴奋' },
  { emoji: '🌟', label: '星星' },
  { emoji: '🚀', label: '火箭' },
  { emoji: '👑', label: '皇冠' },
  { emoji: '💎', label: '钻石' },
  { emoji: '✨', label: '闪光' },
  { emoji: '🎨', label: '艺术' },
  { emoji: '🎵', label: '音乐' },
  { emoji: '🎮', label: '游戏' },
  { emoji: '📚', label: '阅读' },
  { emoji: '🏆', label: '奖杯' },
  { emoji: '🥇', label: '金牌' },
  { emoji: '🦄', label: '独角兽' },
  { emoji: '🐱', label: '猫咪' },
  { emoji: '🐶', label: '狗狗' },
  { emoji: '🦋', label: '蝴蝶' },
  { emoji: '🌈', label: '彩虹' },
];

export const Profile = ({ state, onBack, onOpenPointManagement }: ProfileProps) => {
  const { user, signOut } = useAuth();
  const { profile, loading, updatePhone, updateUsername, updateAvatar } = useProfile();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSaveUsername = async () => {
    console.log('handleSaveUsername called with username:', username);
    if (!username.trim()) {
      toast.error('用户名不能为空');
      return;
    }
    setIsSaving(true);
    const success = await updateUsername(username.trim());
    console.log('updateUsername result:', success);
    if (success) {
      setIsEditingUsername(false);
      toast.success('用户名更新成功');
    } else {
      toast.error('用户名更新失败，请查看控制台了解详情');
    }
    setIsSaving(false);
  };

  const handleSavePhone = async () => {
    if (!phone.trim()) {
      toast.error('手机号不能为空');
      return;
    }
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      toast.error('请输入正确的手机号格式');
      return;
    }
    setIsSaving(true);
    const success = await updatePhone(phone.trim());
    if (success) {
      setIsEditingPhone(false);
      toast.success('手机号更新成功');
    } else {
      toast.error('手机号更新失败');
    }
    setIsSaving(false);
  };

  const handleSelectAvatar = async (emoji: string) => {
    setIsSaving(true);
    const success = await updateAvatar(emoji);
    if (success) {
      setAvatarDialogOpen(false);
      toast.success('头像更新成功');
    } else {
      toast.error('头像更新失败');
    }
    setIsSaving(false);
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

  const formatCreatedAt = (createdAt?: string) => {
    if (!createdAt) return '-';
    try {
      const date = new Date(createdAt);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">个人中心</h1>
          <div className="w-10" />
        </div>
      </header>

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      ) : (
        <div className="p-4 pb-24 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-4xl">
                  {profile?.avatar_url ? (
                    <span className="text-4xl">{profile.avatar_url}</span>
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                <button
                  onClick={() => setAvatarDialogOpen(true)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center hover:bg-amber-600 transition-colors shadow-md"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              <div className="flex-1">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-40"
                      placeholder="用户名"
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveUsername} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingUsername(false); setUsername(profile?.username || ''); }}>
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">{profile?.username || user?.email?.split('@')[0]}</h2>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingUsername(true)}>
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
                  {formatCreatedAt(profile?.created_at) || formatCreatedAt(user?.created_at)}
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
                      <Button size="icon" variant="ghost" onClick={handleSavePhone} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
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
      )}

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>选择头像</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-3 py-4">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.emoji}
                onClick={() => handleSelectAvatar(option.emoji)}
                className="w-14 h-14 bg-gray-100 hover:bg-amber-100 rounded-xl flex items-center justify-center text-3xl transition-all hover:scale-110 active:scale-95"
                title={option.label}
              >
                {option.emoji}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
