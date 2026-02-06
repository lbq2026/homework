import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Gift, Edit2, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RewardCard } from '@/components/RewardCard';
import { PointsDisplay } from '@/components/PointsDisplay';
import type { AppState, Reward } from '@/types';
import { REWARD_ICONS } from '@/types';

interface RewardsProps {
  state: AppState;
  onBack: () => void;
  onAddReward: (reward: Omit<Reward, 'id' | 'createdAt'>) => void;
  onEditReward: (rewardId: string, updates: Partial<Reward>) => void;
  onDeleteReward: (rewardId: string) => void;
  onRedeem: (reward: Reward) => boolean;
}

export const Rewards = ({
  state,
  onBack,
  onAddReward,
  onEditReward,
  onDeleteReward,
  onRedeem,
}: RewardsProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState<Reward | null>(null);

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
      onEditReward(editingReward.id, formData);
      setEditingReward(null);
    } else {
      onAddReward(formData);
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

  const handleRedeem = () => {
    if (showRedeemConfirm) {
      const success = onRedeem(showRedeemConfirm);
      if (success) {
        setShowRedeemConfirm(null);
      }
    }
  };

  // 计算每个奖品已兑换次数
  const getRedeemedCount = (rewardId: string) => {
    return state.redemptions.filter(r => r.rewardId === rewardId).length;
  };

  // 按积分排序奖品
  const sortedRewards = [...state.rewards].sort((a, b) => a.points - b.points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-pink-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">奖品兑换</h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-white/80 text-sm mb-1">我的积分</p>
          <PointsDisplay points={state.totalPoints} size="lg" />
        </div>
      </header>

      {/* 内容区域 */}
      <div className="p-4 pb-24">
        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="rewards">奖品墙</TabsTrigger>
            <TabsTrigger value="history">
              兑换记录
              {state.redemptions.length > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {state.redemptions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="mt-0">
            {/* 添加奖品按钮 */}
            <Button
              onClick={() => {
                setEditingReward(null);
                resetForm();
                setShowAddDialog(true);
              }}
              className="w-full mb-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-xl py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              添加新奖品
            </Button>

            {sortedRewards.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                <div className="text-6xl mb-4">🎁</div>
                <h3 className="font-medium text-gray-600 mb-2">还没有设置奖品</h3>
                <p className="text-sm text-gray-400 mb-4">添加奖品激励孩子完成作业</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AnimatePresence>
                  {sortedRewards.map((reward) => (
                    <motion.div
                      key={reward.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative group"
                    >
                      <RewardCard
                        reward={reward}
                        userPoints={state.totalPoints}
                        onRedeem={() => setShowRedeemConfirm(reward)}
                        redeemedCount={getRedeemedCount(reward.id)}
                      />
                      {/* 编辑按钮 */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reward)}
                          className="w-8 h-8 bg-white/90 hover:bg-white shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteReward(reward.id)}
                          className="w-8 h-8 bg-white/90 hover:bg-white shadow-sm text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            {state.redemptions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="font-medium text-gray-600 mb-2">还没有兑换记录</h3>
                <p className="text-sm text-gray-400">快去兑换心仪的奖品吧！</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {state.redemptions.map((redemption, index) => (
                    <motion.div
                      key={redemption.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center text-2xl">
                        {state.rewards.find(r => r.id === redemption.rewardId)?.icon || '🎁'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{redemption.rewardName}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(redemption.redeemedAt).toLocaleString('zh-CN')}
                        </div>
                      </div>
                      <div className="text-amber-600 font-bold flex items-center gap-1">
                        <span>-</span>
                        <span>{redemption.points}</span>
                        <span className="text-sm">⭐</span>
                      </div>
                    </motion.div>
                  ))}
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
              <div className="grid grid-cols-6 gap-2 mt-2">
                {Object.entries(REWARD_ICONS).map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl p-2 rounded-lg transition-all ${
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">确认兑换?</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="text-6xl mb-4">{showRedeemConfirm?.icon}</div>
            <h3 className="font-bold text-lg text-gray-800">{showRedeemConfirm?.name}</h3>
            <p className="text-gray-500 mt-1">{showRedeemConfirm?.description}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-amber-600">
              <span>消耗</span>
              <span className="text-2xl font-bold">{showRedeemConfirm?.points}</span>
              <span>⭐</span>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              兑换后剩余: {state.totalPoints - (showRedeemConfirm?.points || 0)} ⭐
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRedeemConfirm(null)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600"
              onClick={handleRedeem}
            >
              <Gift className="w-4 h-4 mr-2" />
              确认兑换
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
