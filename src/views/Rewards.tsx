import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Gift, Edit2, Trash2, Check, CheckCircle2, XCircle, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RewardCard } from '@/components/RewardCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import type { Reward, Redemption } from '@/types';
import { REWARD_ICONS } from '@/constants/icons';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/** 兑换状态徽标配置 */
const STATUS_META: Record<NonNullable<Redemption['status']>, { label: string; cls: string }> = {
  pending: { label: '待家长确认', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已确认', cls: 'bg-blue-100 text-blue-700' },
  fulfilled: { label: '已兑现', cls: 'bg-green-100 text-green-700' },
  rejected: { label: '已驳回', cls: 'bg-red-100 text-red-600' },
};

export const Rewards = () => {
  const navigate = useNavigate();
  const { isParent } = useAuth();
  const { state, availablePoints, addReward, editReward, deleteReward, redeemReward, approveRedemption, rejectRedemption, fulfillRedemption, deleteRedemption } = useAppState();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState<Reward | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Reward | null>(null);
  const [showDeleteRedemptionConfirm, setShowDeleteRedemptionConfirm] = useState<Redemption | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    points: 10,
    icon: '🎁',
    description: '',
    category: 'entertainment' as Reward['category'],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      points: 10,
      icon: '🎁',
      description: '',
      category: 'entertainment',
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    if (editingReward) {
      editReward(editingReward.id, formData);
      setEditingReward(null);
    } else {
      addReward(formData);
    }
    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      points: reward.points,
      icon: reward.icon,
      description: reward.description,
      category: reward.category,
    });
    setShowAddDialog(true);
  };

  const handleDeleteClick = (reward: Reward) => {
    setShowDeleteConfirm(reward);
  };

  const handleDeleteConfirm = () => {
    if (showDeleteConfirm) {
      deleteReward(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  };

  const handleDeleteRedemptionClick = (redemption: Redemption) => {
    setShowDeleteRedemptionConfirm(redemption);
  };

  const handleDeleteRedemptionConfirm = async () => {
    if (showDeleteRedemptionConfirm) {
      const success = await deleteRedemption(showDeleteRedemptionConfirm.id);
      if (success) {
        toast.success(`已撤销兑换`, {
          description: '积分已归还',
          icon: '✅',
        });
      }
      setShowDeleteRedemptionConfirm(null);
    }
  };

  const handleRedeem = async () => {
    if (showRedeemConfirm) {
      const result = await redeemReward(showRedeemConfirm);
      if (result.ok) {
        toast.success(`兑换申请已提交: ${showRedeemConfirm.name}`, {
          description: `待家长确认后扣减 ${showRedeemConfirm.points} 积分`,
          icon: '🎉',
        });
        setShowRedeemConfirm(null);
      } else if (result.reason === 'insufficient') {
        toast.error('积分不足，无法兑换这个奖品', { icon: '😢' });
      } else if (result.reason === 'no-user') {
        toast.error('请先登录后再兑换', { icon: '🔒' });
      } else {
        // cloud-error：保留弹窗，提示用户稍后重试（避免本地写入假数据，次日被云端覆盖丢失）
        const hint = /status/i.test(result.message || '')
          ? '数据库缺 status 列，请执行 sql/fix-redemption-status-only.sql（详见 console）'
          : '为确保记录不丢失，未成功同步到云端前不会本地确认';
        toast.error(`兑换保存失败，请稍后重试${result.message ? `：${result.message}` : ''}`, {
          description: hint,
          icon: '⚠️',
        });
      }
    }
  };

  // 计算每个奖品已兑换次数
  const getRedeemedCount = (rewardId: string) => {
    return state.redemptions.filter(r => r.rewardId === rewardId).length;
  };

  // 按积分排序奖品
  const sortedRewards = [...state.rewards].sort((a, b) => a.points - b.points);

  // 兑换记录按时间倒序（最新在最上面）——渲染层兜底排序，
  // 覆盖云端重载 / localStorage 恢复等一切数据来源
  const sortedRedemptions = [...state.redemptions].sort((a, b) => b.redeemedAt - a.redeemedAt);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-accent-yellow-400 to-accent-orange-400 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">奖品兑换</h1>
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-card p-4 text-center">
          <p className="text-white/80 text-body mb-1">我的可用积分</p>
          <PointsDisplay points={availablePoints} size="lg" />
          {availablePoints !== state.totalPoints && (
            <p className="text-caption text-white/70 mt-1">
              （冻结 {state.totalPoints - availablePoints} 分待确认）
            </p>
          )}
        </div>
      </header>

      {/* 内容区域 */}
      <div className="p-4 pb-24">
        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="rewards">奖品墙</TabsTrigger>
            <TabsTrigger value="history">
              兑换记录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="mt-0">
            {/* 添加奖品按钮（仅家长） */}
            {isParent && (
            <Button
              onClick={() => {
                setEditingReward(null);
                resetForm();
                setShowAddDialog(true);
              }}
              className="w-full mb-4 bg-gradient-to-r from-accent-yellow-400 to-accent-orange-400 hover:from-accent-yellow-600 hover:to-accent-orange-600 text-white rounded-button shadow-button py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              添加新奖品
            </Button>
            )}

            {sortedRewards.length === 0 ? (
              <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="font-medium text-neutral-600 mb-2">还没有设置奖品</h3>
                <p className="text-caption text-neutral-400 mb-4">添加奖品激励孩子完成作业</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
                <AnimatePresence>
                  {sortedRewards.map((reward) => (
                    <motion.div
                      key={reward.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative"
                    >
                      <RewardCard
                        reward={reward}
                        userPoints={availablePoints}
                        onRedeem={() => setShowRedeemConfirm(reward)}
                        redeemedCount={getRedeemedCount(reward.id)}
                      />
                      {/* 编辑/删除按钮 - 仅家长可见 */}
                      {isParent && (
                      <div className="absolute top-1 right-1 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reward)}
                          className="w-7 h-7 bg-white hover:bg-accent-yellow-300/30 shadow-card hover:shadow-card-hover rounded-full border border-neutral-200 hover:border-accent-yellow-300"
                        >
                          <Edit2 className="w-4 h-4 text-accent-yellow-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(reward)}
                          className="w-7 h-7 bg-white hover:bg-semantic-danger-soft shadow-card hover:shadow-card-hover rounded-full border border-neutral-200 hover:border-semantic-danger"
                        >
                          <Trash2 className="w-4 h-4 text-semantic-danger" />
                        </Button>
                      </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {sortedRedemptions.length === 0 ? (
              <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="font-medium text-neutral-600 mb-2">还没有兑换记录</h3>
                <p className="text-caption text-neutral-400">快去兑换心仪的奖品吧！</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {sortedRedemptions.map((redemption, index) => {
                    const status = redemption.status || 'approved';
                    const meta = STATUS_META[status];
                    return (
                    <motion.div
                      key={redemption.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-card p-4 shadow-card border border-neutral-100 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-accent-yellow-300/40 to-accent-orange-300/40 rounded-card flex items-center justify-center text-2xl">
                        {state.rewards.find(r => r.id === redemption.rewardId)?.icon || '🎁'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-800 truncate">{redemption.rewardName}</div>
                        <div className="text-body text-neutral-400">
                          {new Date(redemption.redeemedAt).toLocaleString('zh-CN')}
                        </div>
                        <span className={`inline-block mt-1 text-caption px-2 py-0.5 rounded-badge ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className={`font-bold flex items-center gap-1 mr-1 ${
                        status === 'rejected' ? 'text-accent-green-600' : 'text-accent-yellow-600'
                      }`}>
                        <span>{status === 'rejected' ? '+' : '-'}</span>
                        <span>{redemption.points}</span>
                        <span className="text-body">⭐</span>
                      </div>
                      {/* 家长审核操作 */}
                      {isParent && (
                        <div className="flex flex-col gap-1">
                          {status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 hover:bg-green-50"
                                title="通过兑换"
                                onClick={async () => {
                                  const ok = await approveRedemption(redemption.id);
                                  if (ok) toast.success('已通过兑换', { description: `扣减 ${redemption.points} 积分`, icon: '✅' });
                                }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 hover:bg-red-50"
                                title="驳回兑换"
                                onClick={async () => {
                                  const ok = await rejectRedemption(redemption.id);
                                  if (ok) toast.success('已驳回兑换', { description: '冻结积分已退还', icon: '↩️' });
                                }}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 hover:bg-brand-50"
                              title="标记已兑现"
                              onClick={async () => {
                                const ok = await fulfillRedemption(redemption.id);
                                if (ok) toast.success('已标记兑现', { icon: '🎁' });
                              }}
                            >
                              <PackageCheck className="w-4 h-4 text-brand-500" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 hover:bg-semantic-danger-soft"
                            title="撤销兑换"
                            onClick={() => handleDeleteRedemptionClick(redemption)}
                          >
                            <Trash2 className="w-4 h-4 text-semantic-danger" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 添加/编辑奖品对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReward ? '编辑奖品' : '添加新奖品'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>奖品名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：看动画片30分钟、去公园玩"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>所需积分</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, points: Math.max(1, formData.points - 5) })}
                >
                  -5
                </Button>
                <span className="text-xl font-bold w-16 text-center">{formData.points}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, points: formData.points + 5 })}
                >
                  +5
                </Button>
              </div>
            </div>
            
            <div>
              <Label>分类</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as Reward['category'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entertainment">🎮 娱乐</SelectItem>
                  <SelectItem value="physical">🧸 实物</SelectItem>
                  <SelectItem value="privilege">⭐ 特权</SelectItem>
                  <SelectItem value="other">📌 其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="奖品的详细说明..."
                className="mt-1"
                rows={2}
              />
            </div>
            
            <div>
              <Label>图标</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2 max-h-64 overflow-y-auto p-1">
                {Object.entries(REWARD_ICONS).map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl sm:text-3xl p-2 sm:p-3 rounded-lg transition-all flex items-center justify-center ${
                      formData.icon === icon 
                        ? 'bg-amber-100 ring-2 ring-amber-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowAddDialog(false);
                setEditingReward(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600"
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              {editingReward ? '保存' : '添加'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 兑换确认对话框 */}
      <Dialog open={!!showRedeemConfirm} onOpenChange={() => setShowRedeemConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">确认兑换?</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">{showRedeemConfirm?.icon}</div>
            <h3 className="font-bold text-subtitle text-neutral-800">{showRedeemConfirm?.name}</h3>
            <p className="text-neutral-400 mt-1">{showRedeemConfirm?.description}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-accent-yellow-600">
              <span>消耗</span>
              <span className="text-title font-bold">{showRedeemConfirm?.points}</span>
              <span>⭐</span>
            </div>
            <div className="mt-2 text-body text-neutral-400">
              兑换后可用: {availablePoints - (showRedeemConfirm?.points || 0)} ⭐
            </div>
            <div className="mt-2 text-caption text-accent-yellow-600 bg-accent-yellow-300/30 p-2 rounded-card">
              ⏳ 兑换申请提交后，需家长确认才会正式扣分，请耐心等待哦
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowRedeemConfirm(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-accent-yellow-400 to-accent-orange-400 hover:from-accent-yellow-600 hover:to-accent-orange-600 rounded-button"
              onClick={handleRedeem}
            >
              <Gift className="w-4 h-4 mr-2" />
              确认兑换
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">确认删除?</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">{showDeleteConfirm?.icon}</div>
            <h3 className="font-bold text-subtitle text-neutral-800">{showDeleteConfirm?.name}</h3>
            <p className="text-neutral-400 mt-2">删除后将无法恢复，确定要删除这个奖品吗？</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowDeleteConfirm(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-semantic-danger hover:bg-semantic-danger/80 text-white rounded-button"
              onClick={handleDeleteConfirm}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除兑换记录确认对话框 */}
      <Dialog open={!!showDeleteRedemptionConfirm} onOpenChange={() => setShowDeleteRedemptionConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">确认撤销兑换?</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">{state.rewards.find(r => r.id === showDeleteRedemptionConfirm?.rewardId)?.icon || '🎁'}</div>
            <h3 className="font-bold text-subtitle text-neutral-800">{showDeleteRedemptionConfirm?.rewardName}</h3>
            <p className="text-neutral-400 mt-2">撤销后将归还 {showDeleteRedemptionConfirm?.points} 积分，确定要撤销吗？</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-accent-green-600">
              <span>归还</span>
              <span className="text-title font-bold">+{showDeleteRedemptionConfirm?.points}</span>
              <span>⭐</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowDeleteRedemptionConfirm(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-accent-yellow-400 hover:bg-accent-yellow-600 text-white rounded-button"
              onClick={handleDeleteRedemptionConfirm}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              确认撤销
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
