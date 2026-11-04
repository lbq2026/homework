import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, Minus, Coins, History, TrendingUp, TrendingDown,
  Calendar, Award, Pencil, Trash2, AlertTriangle, Loader2, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PointAdjustment } from '@/types';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  fetchChildrenResult,
  fetchChildData,
  buildStateFromDb,
  toPointAdjustment,
  adjustChildPointsRpc,
  updateChildPointAdjustmentRpc,
  deleteChildPointAdjustmentRpc,
  type ProfileRow,
  type UserDataResult,
} from '@/services/supabaseApi';
import { calculateTotalPoints } from '@/utils/storage';
import {
  clampDeduction,
  canApplyEdit,
  getMaxEditableDeduction,
  pickInitialChildId,
} from '@/utils/pointAdjustment';

export const PointManagement = () => {
  const navigate = useNavigate();
  const { isParent, user } = useAuth();
  const { state } = useAppState();

  // 家长端：孩子列表 / 当前选中孩子 / 该孩子数据
  const [childList, setChildList] = useState<ProfileRow[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [childData, setChildData] = useState<UserDataResult | null>(null);
  const [isChildListLoading, setIsChildListLoading] = useState(false);
  const [isChildDataLoading, setIsChildDataLoading] = useState(false);
  const [childListError, setChildListError] = useState<string | null>(null);
  const [childDataError, setChildDataError] = useState<string | null>(null);
  const selectedChildRef = useRef<string | null>(null);

  // 对话框状态
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [editingAdjustment, setEditingAdjustment] = useState<PointAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<PointAdjustment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!isParent || !user) return;
    setIsChildListLoading(true);
    setChildListError(null);
    const { data, error } = await fetchChildrenResult(user.id);
    setIsChildListLoading(false);
    if (error) {
      setChildListError(error.message);
      return;
    }
    setChildList(data);
    setSelectedChildId(prev =>
      prev && data.some(c => c.id === prev) ? prev : pickInitialChildId(data),
    );
  }, [isParent, user]);

  const loadChildData = useCallback(async (childId: string) => {
    setIsChildDataLoading(true);
    setChildDataError(null);
    const data = await fetchChildData(childId);
    // 竞态兜底：切换孩子后丢弃过期响应
    if (selectedChildRef.current !== childId) return;
    setIsChildDataLoading(false);
    if (!data || !data.profile) {
      setChildData(null);
      setChildDataError('孩子数据加载失败，请检查网络后重试');
      return;
    }
    setChildData(data);
  }, []);

  useEffect(() => {
    selectedChildRef.current = selectedChildId;
  }, [selectedChildId]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (!selectedChildId) {
      setChildData(null);
      setIsChildDataLoading(false);
      return;
    }
    loadChildData(selectedChildId);
  }, [selectedChildId, loadChildData]);

  const selectedChild = childList.find(c => c.id === selectedChildId) || null;
  const childAdjustments: PointAdjustment[] = childData
    ? childData.pointAdjustments.map(toPointAdjustment)
    : [];
  const childTotal = childData ? calculateTotalPoints(buildStateFromDb(childData)) : 0;

  // 家长端看所选孩子；孩子端看自己的全局状态
  const displayAdjustments: PointAdjustment[] = isParent ? childAdjustments : state.pointAdjustments;
  const displayTotal = isParent ? childTotal : state.totalPoints;

  const totalAdded = displayAdjustments
    .filter(a => a.points > 0)
    .reduce((sum, a) => sum + a.points, 0);
  const totalDeducted = displayAdjustments
    .filter(a => a.points < 0)
    .reduce((sum, a) => sum + Math.abs(a.points), 0);

  const handleSubmit = async () => {
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points <= 0) return;
    if (!adjustReason.trim()) return;
    if (!selectedChildId || !childData) {
      toast.error('请先选择要调整积分的孩子');
      return;
    }

    setIsSubmitting(true);
    const actualPoints = adjustType === 'add' ? points : clampDeduction(points, childTotal);
    if (actualPoints === 0) {
      setIsSubmitting(false);
      toast.error('孩子当前积分为 0，无法扣分');
      return;
    }

    const { error } = await adjustChildPointsRpc(
      selectedChildId,
      actualPoints,
      adjustReason.trim(),
    );
    setIsSubmitting(false);

    if (error) {
      toast.error('调整积分失败', { description: error.message });
      return;
    }

    await loadChildData(selectedChildId);
    setShowAdjustDialog(false);
    setAdjustPoints('');
    setAdjustReason('');
  };

  const openAdjustDialog = (type: 'add' | 'deduct') => {
    setAdjustType(type);
    setAdjustPoints('');
    setAdjustReason('');
    setShowAdjustDialog(true);
  };

  const openEditDialog = (adjustment: PointAdjustment) => {
    setEditingAdjustment(adjustment);
    setAdjustPoints(Math.abs(adjustment.points).toString());
    setAdjustReason(adjustment.reason);
    setAdjustType(adjustment.points > 0 ? 'add' : 'deduct');
    setShowEditDialog(true);
  };

  const openDeleteDialog = (adjustment: PointAdjustment) => {
    setDeletingAdjustment(adjustment);
    setShowDeleteDialog(true);
  };

  const handleEdit = async () => {
    if (!editingAdjustment || !selectedChildId) return;
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points <= 0) return;
    if (!adjustReason.trim()) return;

    const newPoints = adjustType === 'add' ? points : -points;
    if (!canApplyEdit(childTotal, editingAdjustment.points, newPoints)) {
      toast.error('编辑后孩子积分不能为负', {
        description: `最多可扣 ${getMaxEditableDeduction(childTotal, editingAdjustment.points)} 分`,
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await updateChildPointAdjustmentRpc(
      editingAdjustment.id,
      newPoints,
      adjustReason.trim(),
    );
    setIsSubmitting(false);

    if (error) {
      toast.error('保存修改失败', { description: error.message });
      return;
    }

    await loadChildData(selectedChildId);
    setShowEditDialog(false);
    setEditingAdjustment(null);
    setAdjustPoints('');
    setAdjustReason('');
  };

  const handleDelete = async () => {
    if (!deletingAdjustment || !selectedChildId) return;

    setIsSubmitting(true);
    const { error } = await deleteChildPointAdjustmentRpc(deletingAdjustment.id);
    setIsSubmitting(false);

    if (error) {
      toast.error('删除失败', { description: error.message });
      return;
    }

    await loadChildData(selectedChildId);
    setShowDeleteDialog(false);
    setDeletingAdjustment(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-accent-yellow-400 to-accent-orange-400 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">积分管理</h1>
          <div className="w-10" />
        </div>
        
        {/* 总积分显示 */}
        <div className="text-center py-4">
          <p className="text-white/80 text-body mb-2">
            {isParent ? `${selectedChild?.username || '孩子'} 当前积分` : '当前总积分'}
          </p>
          <div className="text-display font-bold flex items-center justify-center gap-3">
            <Coins className="w-10 h-10" />
            {isParent && isChildDataLoading ? '加载中…' : displayTotal}
          </div>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 孩子切换器（仅家长） */}
        {isParent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-card p-4 shadow-card border border-neutral-100"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-500" />
                调整对象
              </h3>
              {isChildDataLoading && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
            </div>

            {isChildListLoading ? (
              <p className="text-caption text-neutral-400 py-2">正在加载孩子列表…</p>
            ) : childListError ? (
              <div className="text-center py-3">
                <p className="text-caption text-neutral-500 mb-2">孩子列表加载失败：{childListError}</p>
                <Button variant="outline" size="sm" className="rounded-button" onClick={loadChildren}>
                  重试
                </Button>
              </div>
            ) : childList.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-caption text-neutral-500 mb-2">尚未绑定孩子，请先到孩子管理中绑定</p>
                <Button
                  size="sm"
                  className="rounded-button bg-brand-500 hover:bg-brand-400"
                  onClick={() => navigate('/profile/children')}
                >
                  去绑定孩子
                </Button>
              </div>
            ) : childList.length === 1 ? (
              <div className="flex items-center gap-2 text-body text-neutral-700">
                <span className="text-2xl">{childList[0].avatar_url || '👧'}</span>
                <span className="font-bold">{childList[0].username || '小勇士'}</span>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {childList.map(child => {
                  const active = child.id === selectedChildId;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedChildId(child.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-badge whitespace-nowrap border transition-colors ${
                        active
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      <span className="text-lg">{child.avatar_url || '👧'}</span>
                      <span className="text-caption font-bold">{child.username || '小勇士'}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {childDataError && !isChildDataLoading && (
              <div className="text-center mt-2">
                <p className="text-caption text-neutral-500 mb-1">{childDataError}</p>
                {selectedChildId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-button"
                    onClick={() => loadChildData(selectedChildId)}
                  >
                    重试
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent-green-300/20 rounded-card p-4 border border-accent-green-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-accent-green-600" />
              <span className="text-neutral-600 text-body">累计加分</span>
            </div>
            <div className="text-title font-bold text-accent-green-600">+{totalAdded}</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-semantic-danger-soft rounded-card p-4 border border-semantic-danger/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-semantic-danger" />
              <span className="text-neutral-600 text-body">累计扣分</span>
            </div>
            <div className="text-title font-bold text-semantic-danger">-{totalDeducted}</div>
          </motion.div>
        </div>

        {/* 快捷操作（仅家长可手动调整积分） */}
        {isParent && childList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-card p-4 shadow-card border border-neutral-100"
        >
          <h3 className="font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-accent-yellow-600" />
            积分调整
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => openAdjustDialog('add')}
              disabled={!selectedChildId || !childData || isChildDataLoading}
              className="h-16 bg-gradient-to-r from-accent-green-400 to-accent-green-600 hover:from-accent-green-600 hover:to-accent-green-600 text-white rounded-button shadow-button"
            >
              <div className="flex flex-col items-center">
                <Plus className="w-6 h-6 mb-1" />
                <span className="text-body font-bold">手动加分</span>
              </div>
            </Button>
            
            <Button
              onClick={() => openAdjustDialog('deduct')}
              disabled={!selectedChildId || !childData || isChildDataLoading}
              className="h-16 bg-gradient-to-r from-semantic-danger to-accent-orange-400 hover:from-semantic-danger hover:to-accent-orange-600 text-white rounded-button shadow-button"
            >
              <div className="flex flex-col items-center">
                <Minus className="w-6 h-6 mb-1" />
                <span className="text-body font-bold">手动扣分</span>
              </div>
            </Button>
          </div>
          
          <p className="text-caption text-neutral-400 mt-3 text-center">
            点击按钮手动调整积分，需要填写调整原因
          </p>
        </motion.div>
        )}

        {/* 调整记录 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-card p-4 shadow-card border border-neutral-100"
        >
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-neutral-800 flex items-center gap-2">
                <History className="w-5 h-5 text-brand-500" />
                调整记录
              </h3>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-caption px-3">全部</TabsTrigger>
                <TabsTrigger value="add" className="text-caption px-3">加分</TabsTrigger>
                <TabsTrigger value="deduct" className="text-caption px-3">扣分</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              <AdjustmentList 
                adjustments={displayAdjustments}
                onEdit={isParent ? openEditDialog : undefined}
                onDelete={isParent ? openDeleteDialog : undefined}
              />
            </TabsContent>
            
            <TabsContent value="add" className="mt-0">
              <AdjustmentList 
                adjustments={displayAdjustments.filter(a => a.points > 0)}
                onEdit={isParent ? openEditDialog : undefined}
                onDelete={isParent ? openDeleteDialog : undefined}
              />
            </TabsContent>
            
            <TabsContent value="deduct" className="mt-0">
              <AdjustmentList 
                adjustments={displayAdjustments.filter(a => a.points < 0)}
                onEdit={isParent ? openEditDialog : undefined}
                onDelete={isParent ? openDeleteDialog : undefined}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* 新增积分调整对话框 */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              {adjustType === 'add' ? (
                <>
                  <Plus className="w-6 h-6 text-accent-green-600" />
                  手动加分
                </>
              ) : (
                <>
                  <Minus className="w-6 h-6 text-semantic-danger" />
                  手动扣分
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedChild && (
              <p className="text-caption text-neutral-500">
                记入：{selectedChild.username || '小勇士'}
              </p>
            )}
            <div>
              <Label className="text-body text-neutral-600">积分数量</Label>
              <Input
                type="number"
                min={1}
                max={adjustType === 'deduct' ? childTotal : undefined}
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="请输入积分数量"
                className="mt-1 rounded-input"
              />
            </div>
            <div>
              <Label className="text-body text-neutral-600">原因说明</Label>
              <Input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder={adjustType === 'add' ? '例如：额外奖励、帮助家长等' : '例如：违反约定、作业质量不佳等'}
                className="mt-1 rounded-input"
              />
            </div>
            {adjustType === 'deduct' && childTotal > 0 && (
              <p className="text-caption text-accent-yellow-600 bg-accent-yellow-300/30 p-2 rounded-card">
                ⚠️ 最多可扣除 {childTotal} 积分
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowAdjustDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              variant={adjustType === 'add' ? 'default' : 'destructive'}
              className={adjustType === 'add' ? 'flex-1 bg-accent-green-400 hover:bg-accent-green-600 rounded-button' : 'flex-1 rounded-button'}
              onClick={handleSubmit}
              disabled={!adjustPoints || parseInt(adjustPoints) <= 0 || !adjustReason.trim() || isSubmitting}
            >
              {isSubmitting ? '处理中...' : `确认${adjustType === 'add' ? '加分' : '扣分'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑积分调整对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <Pencil className="w-6 h-6 text-brand-500" />
              编辑调整记录
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedChild && (
              <p className="text-caption text-neutral-500">
                记入：{selectedChild.username || '小勇士'}
              </p>
            )}
            <div>
              <Label className="text-body text-neutral-600">调整类型</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={adjustType === 'add' ? 'default' : 'outline'}
                  className={adjustType === 'add' ? 'flex-1 bg-accent-green-400 hover:bg-accent-green-600 rounded-button' : 'flex-1 rounded-button'}
                  onClick={() => setAdjustType('add')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  加分
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'deduct' ? 'default' : 'outline'}
                  className={adjustType === 'deduct' ? 'flex-1 bg-semantic-danger hover:bg-semantic-danger/80 rounded-button' : 'flex-1 rounded-button'}
                  onClick={() => setAdjustType('deduct')}
                >
                  <Minus className="w-4 h-4 mr-1" />
                  扣分
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-body text-neutral-600">积分数量</Label>
              <Input
                type="number"
                min={1}
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="请输入积分数量"
                className="mt-1 rounded-input"
              />
            </div>
            <div>
              <Label className="text-body text-neutral-600">原因说明</Label>
              <Input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="请输入原因说明"
                className="mt-1 rounded-input"
              />
            </div>
            {adjustType === 'deduct' && (
              <p className="text-caption text-accent-yellow-600 bg-accent-yellow-300/30 p-2 rounded-card">
                ⚠️ 本次最多可扣除 {getMaxEditableDeduction(childTotal, editingAdjustment?.points ?? 0)} 积分
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowEditDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-brand-500 hover:bg-brand-400 rounded-button"
              onClick={handleEdit}
              disabled={!adjustPoints || parseInt(adjustPoints) <= 0 || !adjustReason.trim() || isSubmitting}
            >
              {isSubmitting ? '保存中...' : '保存修改'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 text-semantic-danger">
              <AlertTriangle className="w-6 h-6" />
              确认删除
            </DialogTitle>
            <DialogDescription className="text-center">
              确定要删除这条积分调整记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          {deletingAdjustment && (
            <div className="bg-neutral-50 rounded-card p-3 my-4">
              <div className="flex items-center gap-2 mb-1">
                {deletingAdjustment.points > 0 ? (
                  <TrendingUp className="w-4 h-4 text-accent-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-semantic-danger" />
                )}
                <span className={`font-bold ${deletingAdjustment.points > 0 ? 'text-accent-green-600' : 'text-semantic-danger'}`}>
                  {deletingAdjustment.points > 0 ? '+' : ''}{deletingAdjustment.points}
                </span>
              </div>
              <p className="text-body text-neutral-600">{deletingAdjustment.reason}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-button"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 调整记录列表组件
interface AdjustmentListProps {
  adjustments: PointAdjustment[];
  onEdit?: (adjustment: PointAdjustment) => void;
  onDelete?: (adjustment: PointAdjustment) => void;
}

const AdjustmentList = ({ adjustments, onEdit, onDelete }: AdjustmentListProps) => {
  if (adjustments.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-400">
        <History className="w-12 h-12 mx-auto mb-3 text-neutral-200" />
        <p className="text-body">暂无调整记录</p>
      </div>
    );
  }

  const sortedAdjustments = [...adjustments].sort((a, b) => {
    const timeA = a.adjustedAt || a.createdAt || Date.now();
    const timeB = b.adjustedAt || b.createdAt || Date.now();
    return timeB - timeA;
  });

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {sortedAdjustments.map((adj, index) => (
        <motion.div
          key={adj.id || adj.adjustedAt || adj.createdAt}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`p-3 rounded-card border ${
            adj.points > 0
              ? 'bg-accent-green-300/20 border-accent-green-300'
              : 'bg-semantic-danger-soft border-semantic-danger/30'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {adj.points > 0 ? (
                  <TrendingUp className="w-4 h-4 text-accent-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-semantic-danger" />
                )}
                <span
                  className={`font-bold ${
                    adj.points > 0 ? 'text-accent-green-600' : 'text-semantic-danger'
                  }`}
                >
                  {adj.points > 0 ? '+' : ''}{adj.points}
                </span>
              </div>
              <p className="text-body text-neutral-700 truncate">{adj.reason}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1 text-caption text-neutral-400 whitespace-nowrap">
                <Calendar className="w-3 h-3" />
                {new Date(adj.adjustedAt || adj.createdAt || Date.now()).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {(onEdit || onDelete) && (
                <div className="flex items-center gap-1 ml-1">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-400 hover:text-brand-500 hover:bg-brand-50"
                      onClick={() => onEdit(adj)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-400 hover:text-semantic-danger hover:bg-semantic-danger-soft"
                      onClick={() => onDelete(adj)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PointManagement;
