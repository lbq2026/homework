import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, LogOut, User, Mail, Star, Award, Edit2, Check, X, Coins, Camera, Loader2, Users, Medal, LayoutDashboard, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useProfile } from '@/hooks/useSupabaseData';
import { useAppState } from '@/contexts/AppStateContext';
import { calculateStreak } from '@/utils/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

export const Profile = () => {
  const navigate = useNavigate();
  const { state } = useAppState();
  const { user, signOut, isParent } = useAuth();
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
    if (!username.trim()) {
      toast.error('用户名不能为空');
      return;
    }
    setIsSaving(true);
    const success = await updateUsername(username.trim());
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
      case 'parent': return 'bg-role-parent-soft text-role-parent';
      case 'child': return 'bg-role-child-soft text-role-child';
      default: return 'bg-neutral-100 text-neutral-600';
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

  const badgesCount = state.badges.filter(badge => badge.unlockedAt).length;
  const streakDays = calculateStreak(state);

  const actionTiles = [
    { icon: LayoutDashboard, label: '家长控制台', color: 'bg-role-parent-soft text-role-parent', onClick: () => navigate('/parent'), show: isParent },
    { icon: Coins, label: '积分管理', color: 'bg-accent-yellow-300/40 text-accent-yellow-600', onClick: () => navigate('/profile/points'), show: true },
    { icon: Users, label: '我的孩子', color: 'bg-role-parent-soft text-role-parent', onClick: () => navigate('/profile/children'), show: isParent },
    { icon: Medal, label: '徽章管理', color: 'bg-role-child-soft text-role-child', onClick: () => navigate('/profile/badges'), show: isParent },
  ].filter(t => t.show);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-brand-400 to-brand-500 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">个人中心</h1>
          <div className="w-10" />
        </div>
      </header>

      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <span className="ml-2 text-neutral-600">加载中...</span>
        </div>
      ) : (
        <div className="p-4 pb-24 space-y-4">
          {/* 个人信息卡 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-card p-5 shadow-card border border-neutral-100"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-300 to-brand-500 rounded-full flex items-center justify-center text-4xl ring-4 ring-white">
                  {profile?.avatar_url ? (
                    <span className="text-4xl">{profile.avatar_url}</span>
                  ) : (
                    <User className="w-10 h-10 text-white" />
                  )}
                </div>
                <button
                  onClick={() => setAvatarDialogOpen(true)}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent-yellow-400 rounded-full flex items-center justify-center hover:bg-accent-yellow-300 transition-colors shadow-card"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 text-neutral-800 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-neutral-800" />
                  )}
                </button>
              </div>
              <div className="flex-1">
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-40 rounded-input"
                      placeholder="用户名"
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveUsername} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-semantic-success" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingUsername(false); setUsername(profile?.username || ''); }}>
                      <X className="w-4 h-4 text-semantic-danger" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-subtitle font-bold text-neutral-800">{profile?.username || user?.email?.split('@')[0]}</h2>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingUsername(true)}>
                      <Edit2 className="w-4 h-4 text-neutral-400" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-caption font-bold px-3 py-1 rounded-badge ${getRoleColor(profile?.role)}`}>
                    {getRoleLabel(profile?.role)}
                  </span>
                </div>
                <div className="flex items-start gap-2 mt-2 text-neutral-400 text-caption min-w-0">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="break-all min-w-0 flex-1">{user?.email}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 数据卡 3 列 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="bg-accent-yellow-300/30 rounded-card p-3 text-center border border-accent-yellow-300/50">
              <Star className="w-5 h-5 text-accent-yellow-600 mx-auto mb-1" />
              <div className="text-title font-extrabold text-neutral-800">{state.totalPoints}</div>
              <div className="text-caption font-medium text-neutral-600">总积分</div>
            </div>
            <div className="bg-accent-green-300/30 rounded-card p-3 text-center border border-accent-green-300/50">
              <Flame className="w-5 h-5 text-accent-green-600 mx-auto mb-1" />
              <div className="text-title font-extrabold text-neutral-800">{streakDays}</div>
              <div className="text-caption font-medium text-neutral-600">连击天数</div>
            </div>
            <div className="bg-role-child-soft rounded-card p-3 text-center border border-role-child/20">
              <Award className="w-5 h-5 text-role-child mx-auto mb-1" />
              <div className="text-title font-extrabold text-neutral-800">{badgesCount}</div>
              <div className="text-caption font-medium text-neutral-600">徽章</div>
            </div>
          </motion.div>

          {/* 操作网格 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="grid grid-cols-2 gap-3"
          >
            {actionTiles.map((tile) => (
              <button
                key={tile.label}
                onClick={tile.onClick}
                className="bg-white rounded-card border border-neutral-100 p-4 flex flex-col items-center gap-2 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${tile.color} flex items-center justify-center`}>
                  <tile.icon className="w-5 h-5" />
                </div>
                <span className="text-caption font-bold text-neutral-800">{tile.label}</span>
              </button>
            ))}
          </motion.div>

          {/* 账户信息 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-card p-5 shadow-card border border-neutral-100"
          >
            <h3 className="font-bold text-neutral-800 mb-4">账户信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                <span className="text-neutral-400">注册时间</span>
                <span className="text-neutral-800">
                  {formatCreatedAt(profile?.created_at) || formatCreatedAt(user?.created_at)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                {isEditingPhone ? (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-neutral-400">手机号</span>
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="请输入手机号"
                        className="max-w-[200px] rounded-input"
                      />
                      <Button size="icon" variant="ghost" onClick={handleSavePhone} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-semantic-success" />
                        )}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setIsEditingPhone(false); setPhone(profile?.phone || ''); }}>
                        <X className="w-4 h-4 text-semantic-danger" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-neutral-400">手机号</span>
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-800">
                        {profile?.phone || '-'}
                      </span>
                      <Button size="icon" variant="ghost" onClick={() => setIsEditingPhone(true)}>
                        <Edit2 className="w-4 h-4 text-neutral-400" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-neutral-400">认证方式</span>
                <span className="text-neutral-800">
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
              className="w-full h-14 text-semantic-danger border-semantic-danger/30 hover:bg-semantic-danger-soft hover:text-semantic-danger rounded-button"
            >
              <LogOut className="w-5 h-5 mr-2" />
              退出登录
            </Button>
          </motion.div>
        </div>
      )}

      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent className="max-w-md rounded-surface">
          <DialogHeader>
            <DialogTitle>选择头像</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-3 py-4">
            {AVATAR_OPTIONS.map((option) => (
              <button
                key={option.emoji}
                onClick={() => handleSelectAvatar(option.emoji)}
                className="w-14 h-14 bg-neutral-100 hover:bg-accent-yellow-300/40 rounded-xl flex items-center justify-center text-3xl transition-all hover:scale-110 active:scale-95"
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
