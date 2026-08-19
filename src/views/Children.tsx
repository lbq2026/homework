import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Star, Award, Flame, Loader2, Eye, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth.tsx';
import { fetchChildren, fetchChildData, type UserDataResult } from '@/services/supabaseApi';
import { calculateStreak, getWeeklyReport, getAvailablePoints } from '@/utils/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const Children = () => {
  const navigate = useNavigate();
  const { isParent, user, createChildAccount } = useAuth();
  const [children, setChildren] = useState<Array<{ id: string; username: string | null; avatar_url: string | null; total_points: number; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [viewingChild, setViewingChild] = useState<{ id: string; username: string; data: UserDataResult } | null>(null);

  const loadChildren = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const list = await fetchChildren(user.id);
    setChildren(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim()) {
      toast.error('请输入孩子昵称');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('密码至少需要 6 位');
      return;
    }
    setIsCreating(true);
    if (!user) {
      toast.error('未检测到家长账号，请重新登录');
      setIsCreating(false);
      return;
    }

    // 通过 RPC 直接创建子账号（不走 signUp，避免邮件速率限制）
    const { error, childEmail } = await createChildAccount(
      formData.username.trim(),
      formData.password,
      user.id,
    );

    if (error) {
      toast.error('创建失败', { description: error.message });
      setIsCreating(false);
      return;
    }

    if (childEmail) {
      toast.success('孩子档案已创建', {
        description: `登录邮箱：${childEmail}`,
        icon: '👧',
      });
    } else {
      toast.success('孩子档案已创建', { icon: '👧' });
    }
    setShowAddDialog(false);
    setFormData({ username: '', password: '' });
    setIsCreating(false);
    await loadChildren();
  };

  const handleViewChild = async (childId: string, username: string) => {
    setViewingChild({ id: childId, username, data: null as unknown as UserDataResult });
    const data = await fetchChildData(childId);
    if (data) {
      setViewingChild({ id: childId, username, data });
    } else {
      toast.error('加载孩子数据失败');
      setViewingChild(null);
    }
  };

  // 孩子数据面板
  const renderChildPanel = () => {
    if (!viewingChild) return null;
    const { data } = viewingChild;
    if (!data) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">正在加载孩子数据...</p>
        </div>
      );
    }

    // 构建该孩子的 state 以复用统计函数
    const childState = {
      primaryCategories: data.primaryCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📚', key: c.key || 'category', createdAt: 0 })),
      secondaryCategories: data.secondaryCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📖', primaryCategoryId: c.primary_category_id || '', createdAt: 0 })),
      tertiaryCategories: data.tertiaryCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📝', defaultPoints: c.default_points || 1, secondaryCategoryId: c.secondary_category_id || '', createdAt: 0 })),
      tasks: data.tasks.map(t => ({ id: t.id, name: t.name, basePoints: t.base_points || 1, icon: t.icon || '📚', isTemporary: t.is_temporary || false, createdAt: 0 })),
      dailyRecords: data.dailyRecords.map(r => ({ date: r.date, tasks: r.tasks || [], totalPoints: r.total_points || 0 })),
      rewards: data.rewards.map(r => ({ id: r.id, name: r.name, points: r.points, icon: r.icon || '🎁', description: r.description || '', category: (r.category || 'other') as 'entertainment' | 'physical' | 'privilege' | 'other', createdAt: 0 })),
      redemptions: data.redemptions.map(r => ({ id: r.id, rewardId: r.reward_id, rewardName: r.reward_name, points: r.points, redeemedAt: 0, status: r.status || 'approved' })),
      badges: data.badges.map(b => ({ id: b.badge_type as never, name: b.badge_type, description: '', icon: '🏅', unlockedAt: new Date(b.unlocked_at).getTime() })),
      pointAdjustments: data.pointAdjustments.map(a => ({ id: a.id, points: a.points, reason: a.reason, adjustedAt: 0, createdAt: 0 })),
      totalPoints: data.profile?.total_points || 0,
      settings: { soundEnabled: true, lastVisitDate: '', streakThreshold: 0.8, makeupCards: 0, usedMakeupDates: [] },
    } as never;

    const streak = calculateStreak(childState as never);
    const weekly = getWeeklyReport(childState as never);
    const unlockedCount = data.badges.length;
    const available = getAvailablePoints(childState as never);

    return (
      <div className="bg-white rounded-card p-5 shadow-card border border-neutral-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-300 to-brand-500 rounded-full flex items-center justify-center text-3xl ring-2 ring-white">
            {data.profile?.avatar_url || '👧'}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-neutral-800 text-subtitle">{viewingChild.username}</h3>
            <span className="text-caption bg-role-child-soft text-role-child px-2 py-0.5 rounded-badge">孩子档案</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setViewingChild(null)}>关闭</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-accent-yellow-300/30 rounded-card p-3 text-center">
            <Star className="w-5 h-5 text-accent-yellow-600 mx-auto mb-1" />
            <div className="text-title font-bold text-accent-yellow-600">{available}</div>
            <div className="text-caption text-neutral-600">可用积分</div>
          </div>
          <div className="bg-role-child-soft rounded-card p-3 text-center">
            <Award className="w-5 h-5 text-role-child mx-auto mb-1" />
            <div className="text-title font-bold text-role-child">{unlockedCount}</div>
            <div className="text-caption text-neutral-600">已获徽章</div>
          </div>
          <div className="bg-accent-orange-300/30 rounded-card p-3 text-center">
            <Flame className="w-5 h-5 text-accent-orange-600 mx-auto mb-1" />
            <div className="text-title font-bold text-accent-orange-600">{streak}</div>
            <div className="text-caption text-neutral-600">连续天数</div>
          </div>
          <div className="bg-accent-green-300/30 rounded-card p-3 text-center">
            <Star className="w-5 h-5 text-accent-green-600 mx-auto mb-1" />
            <div className="text-title font-bold text-accent-green-600">{weekly.thisWeek.completed}</div>
            <div className="text-caption text-neutral-600">本周完成</div>
          </div>
        </div>

        <p className="text-caption text-neutral-400 text-center">
          当前为家长只读视图，孩子使用自己的账号登录操作
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-brand-400 to-brand-500 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">我的孩子</h1>
          <div className="w-10" />
        </div>
        <p className="text-brand-100 text-body">统一管理家庭中每个小勇士的成长</p>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {!isParent ? (
          <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="font-medium text-neutral-600 mb-2">仅家长可用</h3>
            <p className="text-caption text-neutral-400">请使用家长账号登录后管理孩子档案</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          </div>
        ) : (
          <>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="w-full bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white rounded-button shadow-button py-6"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              添加孩子档案
            </Button>

            {children.length === 0 ? (
              <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
                <div className="text-6xl mb-4">👨‍👩‍👧</div>
                <h3 className="font-medium text-neutral-600 mb-2">还没有孩子档案</h3>
                <p className="text-caption text-neutral-400">
                  创建孩子档案后，孩子可用独立账号登录
                  <br />
                  你可以在下方查看孩子的成长数据
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child) => (
                  <motion.div
                    key={child.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-card p-4 shadow-card border border-neutral-100 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-300 to-brand-500 rounded-full flex items-center justify-center text-2xl">
                      {child.avatar_url || '👧'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-800 truncate">{child.username || '小勇士'}</div>
                      <div className="text-body text-accent-yellow-600 flex items-center gap-1 font-bold">
                        <Star className="w-3.5 h-3.5" />
                        {child.total_points} 积分
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-brand-500 border-brand-200 hover:bg-brand-50 rounded-button"
                      onClick={() => handleViewChild(child.id, child.username || '小勇士')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      数据面板
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            {viewingChild && renderChildPanel()}
          </>
        )}
      </div>

      {/* 添加孩子对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">添加孩子档案</DialogTitle>
            <DialogDescription className="text-center text-caption">
              创建后孩子使用独立账号登录，数据互不干扰
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChild} className="space-y-4 py-2">
            <div>
              <Label>孩子昵称</Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="例如：小宝"
                className="mt-1 rounded-input"
required
            />
          </div>
          <div>
            <Label>登录密码</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="至少 6 位"
                  className="pl-9 rounded-input"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-brand-500 hover:bg-brand-400 rounded-button shadow-button"
              disabled={isCreating}
            >
              {isCreating ? '创建中...' : '创建并关联'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
