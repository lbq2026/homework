import { Star, Award, Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserDataResult } from '@/services/supabaseApi';
import { calculateStreak, getWeeklyReport, getAvailablePoints } from '@/utils/storage';

interface ChildDataPanelProps {
  /** 孩子昵称（来自孩子列表，无需等待数据加载） */
  username: string;
  /** fetchChildData 的结果；null 表示仍在加载或已失败 */
  data: UserDataResult | null;
  /** 加载失败标记（true 且 data 为 null 时显示失败空态 + 重试按钮，而非转圈） */
  error?: boolean;
  /** 重试回调（与 error 配套传入） */
  onRetry?: () => void;
  /** 关闭回调；家长中心内嵌时不传则不渲染关闭按钮 */
  onClose?: () => void;
}

/** 孩子只读数据面板（自 Children.tsx 迁出，家长中心与「我的孩子」页共用） */
export const ChildDataPanel = ({ username, data, error, onRetry, onClose }: ChildDataPanelProps) => {
  if (!data) {
    if (error) {
      return (
        <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
          <div className="text-5xl mb-3">🌩️</div>
          <p className="text-neutral-500 text-sm mb-4">孩子数据加载失败，请检查网络后重试</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="rounded-button">重试</Button>
          )}
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
        <p className="text-neutral-500 text-sm">正在加载孩子数据...</p>
      </div>
    );
  }

  // 构建该孩子的 state 以复用统计函数（与 Children.tsx 原逻辑一致）
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
          <h3 className="font-bold text-neutral-800 text-subtitle">{username}</h3>
          <span className="text-caption bg-role-child-soft text-role-child px-2 py-0.5 rounded-badge">孩子档案</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        )}
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
