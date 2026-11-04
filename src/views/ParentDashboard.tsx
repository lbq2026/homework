import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, Gift, Coins, Users, Medal, ShieldCheck, CheckCircle2, XCircle, LayoutDashboard, BellRing, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth.tsx';
import {
  fetchChildren,
  fetchChildData,
  fetchPendingRedemptions,
  approveRedemptionRpc,
  type ProfileRow,
} from '@/services/supabaseApi';
import {
  aggregateChildOverview,
  toPendingRedemptionItems,
  type PendingRedemptionItem,
} from '@/utils/childOverview';
import { getTodayStr } from '@/utils/date';
import { ChildSection } from '@/components/parent/ChildSection';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * 家长控制台：孩子数据聚合总览 + 兑换审批（RPC）+ 孩子区 + 管理快捷入口
 */
export const ParentDashboard = () => {
  const navigate = useNavigate();
  const { isParent, user } = useAuth();
  const [childList, setChildList] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ todayDone: 0, todayTotal: 0, weekPoints: 0, pendingCount: 0 });
  const [pendingItems, setPendingItems] = useState<PendingRedemptionItem[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // 加载孩子列表 → 并行拉取每个孩子完整数据（读走 RLS）+ 跨孩子待审核兑换
  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const list = await fetchChildren(user.id);
    setChildList(list);
    if (list.length === 0) {
      setOverview({ todayDone: 0, todayTotal: 0, weekPoints: 0, pendingCount: 0 });
      setPendingItems([]);
      setLoading(false);
      return;
    }
    const [dataResults, pendingRows] = await Promise.all([
      Promise.all(list.map(c => fetchChildData(c.id))),
      fetchPendingRedemptions(list.map(c => c.id)),
    ]);
    const fragments = dataResults
      .map(data => data ? { dailyRecords: data.dailyRecords, redemptions: data.redemptions } : null)
      .filter((f): f is NonNullable<typeof f> => f !== null);
    setOverview(aggregateChildOverview(fragments, getTodayStr()));
    setPendingItems(toPendingRedemptionItems(
      pendingRows,
      list.map(c => ({ id: c.id, username: c.username })),
    ));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // 审批走 RPC（fulfilled 扣积分 / rejected 冻结退回），成功后重拉总览
  const handleApprove = async (item: PendingRedemptionItem, approve: boolean) => {
    setApprovingId(item.id);
    const { error } = await approveRedemptionRpc(item.id, approve);
    setApprovingId(null);
    if (error) {
      toast.error(approve ? '审批失败' : '驳回失败', { description: error.message });
      // 竞态兜底：兑换可能已被处理或已删除，刷新待审核列表与总览
      await loadAll();
      return;
    }
    toast.success(approve ? '兑换已通过' : '已驳回兑换', { icon: approve ? '✅' : '↩️' });
    await loadAll();
  };

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
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          </div>
        ) : (
          <>
            {/* 数据总览（聚合所有孩子） */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> 孩子档案
                </div>
                <div className="text-title font-bold text-brand-500">{childList.length}</div>
              </div>
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5" /> 今日进度
                </div>
                <div className="text-title font-bold text-accent-green-600">
                  {overview.todayDone}<span className="text-body text-neutral-400">/{overview.todayTotal}</span>
                </div>
              </div>
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> 本周积分
                </div>
                <div className="text-title font-bold text-accent-yellow-600">{overview.weekPoints}</div>
              </div>
              <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <div className="text-caption text-neutral-400 mb-1 flex items-center gap-1">
                  <BellRing className="w-3.5 h-3.5" /> 待审核兑换
                </div>
                <div className={`text-title font-bold ${pendingItems.length > 0 ? 'text-accent-orange-600' : 'text-neutral-400'}`}>
                  {pendingItems.length}
                </div>
              </div>
            </div>

            {/* 待审核兑换（含孩子名，审批走 RPC） */}
            {pendingItems.length > 0 && (
              <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
                <h3 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-accent-orange-600" />
                  待审核兑换（{pendingItems.length}）
                </h3>
                <div className="space-y-2">
                  {pendingItems.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-accent-yellow-300/20 rounded-card">
                      <div className="text-2xl">🎁</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-800 text-body truncate">{item.rewardName}</div>
                        <div className="text-caption text-accent-yellow-600 font-bold">
                          {item.points} ⭐ · {item.childName}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-accent-green-300/30"
                        title="通过"
                        disabled={approvingId === item.id}
                        onClick={() => handleApprove(item, true)}
                      >
                        {approvingId === item.id
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <CheckCircle2 className="w-5 h-5 text-accent-green-600" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-semantic-danger-soft"
                        title="驳回"
                        disabled={approvingId === item.id}
                        onClick={() => handleApprove(item, false)}
                      >
                        <XCircle className="w-5 h-5 text-semantic-danger" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 孩子区（卡片 + ⋯管理菜单 + 数据面板 + 绑定入口） */}
            <ChildSection childList={childList} loading={false} onChanged={loadAll} showCreateAccount={false} />

            {/* 管理快捷入口（保留原 6 项） */}
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
