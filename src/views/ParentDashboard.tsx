import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, Gift, Coins, Users, Medal, ShieldCheck, CheckCircle2, XCircle, LayoutDashboard, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/hooks/useAuth.tsx';
import { fetchChildren } from '@/services/supabaseApi';
import { getTodayStr } from '@/utils/date';
import { getWeeklyReport } from '@/utils/storage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * 家长控制台（Later 阶段）：数据总览 + 兑换审核 + 管理快捷入口
 */
export const ParentDashboard = () => {
  const navigate = useNavigate();
  const { isParent, user } = useAuth();
  const { state, approveRedemption, rejectRedemption } = useAppState();
  const [childCount, setChildCount] = useState(0);

  const today = getTodayStr();
  const todayRecord = state.dailyRecords.find(r => r.date === today);
  const todayDone = todayRecord?.tasks.filter(t => t.completed).length || 0;
  const todayTotal = todayRecord?.tasks.length || 0;
  const weekly = getWeeklyReport(state);
  const pendingRedemptions = state.redemptions
    .filter(r => r.status === 'pending')
    .sort((a, b) => b.redeemedAt - a.redeemedAt);

  useEffect(() => {
    if (user) {
      fetchChildren(user.id).then(list => setChildCount(list.length));
    }
  }, [user]);

  const quickLinks = [
    { label: '作业管理', desc: '配置分类与任务', icon: <ClipboardList className="w-6 h-6" />, to: '/tasks', cls: 'from-brand-400 to-brand-500' },
    { label: '奖品兑换', desc: '奖品墙与审核', icon: <Gift className="w-6 h-6" />, to: '/rewards', cls: 'from-accent-yellow-400 to-accent-orange-400' },
    { label: '积分管理', desc: '手动调整积分', icon: <Coins className="w-6 h-6" />, to: '/profile/points', cls: 'from-accent-green-400 to-accent-green-600' },
    { label: '我的孩子', desc: '孩子档案与数据', icon: <Users className="w-6 h-6" />, to: '/profile/children', cls: 'from-brand-300 to-brand-500' },
    { label: '徽章管理', desc: '自定义成就徽章', icon: <Medal className="w-6 h-6" />, to: '/profile/badges', cls: 'from-role-child to-accent-purple-400' },
    { label: '隐私政策', desc: '儿童数据保护', icon: <ShieldCheck className="w-6 h-6" />, to: '/privacy', cls: 'from-neutral-400 to-neutral-600' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-brand-400 to-brand-500 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">家长控制台</h1>
          <div className="w-10" />
        </div>
        <p className="text-brand-100 text-body">一站式管理小勇士的积分王国</p>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {!isParent ? (
          <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="font-medium text-neutral-600 mb-2">仅家长可用</h3>
            <p className="text-caption text-neutral-400">请使用家长账号登录后访问控制台</p>
          </div>
        ) : (
          <>
            {/* 数据总览 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 孩子档案
                </div>
                <div className="text-title font-bold text-brand-500">{childCount}</div>
              </div>
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> 今日进度
                </div>
                <div className="text-title font-bold text-accent-green-600">
                  {todayDone}<span className="text-body text-neutral-400">/{todayTotal}</span>
                </div>
              </div>
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> 本周积分
                </div>
                <div className="text-title font-bold text-accent-yellow-600">{weekly.thisWeek.points}</div>
              </div>
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5" /> 待审核兑换
                </div>
                <div className={`text-title font-bold ${pendingRedemptions.length > 0 ? 'text-accent-orange-600' : 'text-neutral-400'}`}>
                  {pendingRedemptions.length}
                </div>
              </div>
            </div>

            {/* 待审核兑换 */}
            {pendingRedemptions.length > 0 && (
              <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <h3 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-accent-orange-600" />
                  待审核兑换（{pendingRedemptions.length}）
                </h3>
                <div className="space-y-2">
                  {pendingRedemptions.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-accent-yellow-300/20 rounded-card">
                      <div className="text-2xl">
                        {state.rewards.find(x => x.id === r.rewardId)?.icon || '🎁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-800 text-body truncate">{r.rewardName}</div>
                        <div className="text-caption text-accent-yellow-600 font-bold">{r.points} ⭐</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-accent-green-300/30"
                        title="通过"
                        onClick={async () => {
                          await approveRedemption(r.id);
                          toast.success('已通过兑换', { icon: '✅' });
                        }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-accent-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-semantic-danger-soft"
                        title="驳回"
                        onClick={async () => {
                          await rejectRedemption(r.id);
                          toast.success('已驳回兑换', { icon: '↩️' });
                        }}
                      >
                        <XCircle className="w-5 h-5 text-semantic-danger" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 管理快捷入口 */}
            <section>
              <h3 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-brand-500" />
                管理入口
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {quickLinks.map((link, index) => (
                  <motion.button
                    key={link.to}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(link.to)}
                    className={`bg-gradient-to-br ${link.cls} rounded-surface p-4 text-white shadow-button hover:shadow-card-hover transition-shadow text-left`}
                  >
                    <div className="mb-2">{link.icon}</div>
                    <div className="font-bold">{link.label}</div>
                    <div className="text-caption text-white/80">{link.desc}</div>
                  </motion.button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
