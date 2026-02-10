import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Plus, Minus, Coins, History, TrendingUp, TrendingDown,
  Calendar, Award, Pencil, Trash2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AppState, PointAdjustment } from '@/types';

interface PointManagementProps {
  state: AppState;
  onBack: () => void;
  onAdjustPoints: (points: number, reason: string) => Promise<boolean>;
  onEditPointAdjustment?: (id: string, points: number, reason: string) => Promise<boolean>;
  onDeletePointAdjustment?: (id: string) => Promise<boolean>;
}

export const PointManagement = ({ 
  state, 
  onBack, 
  onAdjustPoints,
  onEditPointAdjustment,
  onDeletePointAdjustment
}: PointManagementProps) => {
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [editingAdjustment, setEditingAdjustment] = useState<PointAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<PointAdjustment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 计算统计数据
  const totalAdded = state.pointAdjustments
    .filter(a => a.points > 0)
    .reduce((sum, a) => sum + a.points, 0);
  const totalDeducted = state.pointAdjustments
    .filter(a => a.points < 0)
    .reduce((sum, a) => sum + Math.abs(a.points), 0);

  const handleSubmit = async () => {
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points <= 0) return;
    if (!adjustReason.trim()) return;

    setIsSubmitting(true);
    const actualPoints = adjustType === 'add' ? points : -Math.min(points, state.totalPoints);
    const success = await onAdjustPoints(actualPoints, adjustReason.trim());
    setIsSubmitting(false);
    
    if (success) {
      setShowAdjustDialog(false);
      setAdjustPoints('');
      setAdjustReason('');
    }
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
    if (!editingAdjustment || !onEditPointAdjustment) return;
    
    const points = parseInt(adjustPoints);
    if (isNaN(points) || points <= 0) return;
    if (!adjustReason.trim()) return;

    setIsSubmitting(true);
    const actualPoints = adjustType === 'add' ? points : -points;
    const success = await onEditPointAdjustment(editingAdjustment.id, actualPoints, adjustReason.trim());
    setIsSubmitting(false);
    
    if (success) {
      setShowEditDialog(false);
      setEditingAdjustment(null);
      setAdjustPoints('');
      setAdjustReason('');
    }
  };

  const handleDelete = async () => {
    if (!deletingAdjustment || !onDeletePointAdjustment) return;
    
    setIsSubmitting(true);
    const success = await onDeletePointAdjustment(deletingAdjustment.id);
    setIsSubmitting(false);
    
    if (success) {
      setShowDeleteDialog(false);
      setDeletingAdjustment(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">积分管理</h1>
          <div className="w-10" />
        </div>
        
        {/* 总积分显示 */}
        <div className="text-center py-4">
          <p className="text-white/80 text-sm mb-2">当前总积分</p>
          <div className="text-5xl font-bold flex items-center justify-center gap-3">
            <Coins className="w-10 h-10" />
            {state.totalPoints}
          </div>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-gray-600 text-sm">累计加分</span>
            </div>
            <div className="text-2xl font-bold text-green-600">+{totalAdded}</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border border-red-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-gray-600 text-sm">累计扣分</span>
            </div>
            <div className="text-2xl font-bold text-red-600">-{totalDeducted}</div>
          </motion.div>
        </div>

        {/* 快捷操作 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 shadow-md"
        >
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            积分调整
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => openAdjustDialog('add')}
              className="h-16 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl"
            >
              <div className="flex flex-col items-center">
                <Plus className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">手动加分</span>
              </div>
            </Button>
            
            <Button
              onClick={() => openAdjustDialog('deduct')}
              className="h-16 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl"
            >
              <div className="flex flex-col items-center">
                <Minus className="w-6 h-6 mb-1" />
                <span className="text-sm font-medium">手动扣分</span>
              </div>
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3 text-center">
            点击按钮手动调整积分，需要填写调整原因
          </p>
        </motion.div>

        {/* 调整记录 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-md"
        >
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                调整记录
              </h3>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-3">全部</TabsTrigger>
                <TabsTrigger value="add" className="text-xs px-3">加分</TabsTrigger>
                <TabsTrigger value="deduct" className="text-xs px-3">扣分</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              <AdjustmentList 
                adjustments={state.pointAdjustments} 
                onEdit={onEditPointAdjustment ? openEditDialog : undefined}
                onDelete={onDeletePointAdjustment ? openDeleteDialog : undefined}
              />
            </TabsContent>
            
            <TabsContent value="add" className="mt-0">
              <AdjustmentList 
                adjustments={state.pointAdjustments.filter(a => a.points > 0)}
                onEdit={onEditPointAdjustment ? openEditDialog : undefined}
                onDelete={onDeletePointAdjustment ? openDeleteDialog : undefined}
              />
            </TabsContent>
            
            <TabsContent value="deduct" className="mt-0">
              <AdjustmentList 
                adjustments={state.pointAdjustments.filter(a => a.points < 0)}
                onEdit={onEditPointAdjustment ? openEditDialog : undefined}
                onDelete={onDeletePointAdjustment ? openDeleteDialog : undefined}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* 新增积分调整对话框 */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              {adjustType === 'add' ? (
                <>
                  <Plus className="w-6 h-6 text-green-500" />
                  手动加分
                </>
              ) : (
                <>
                  <Minus className="w-6 h-6 text-red-500" />
                  手动扣分
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-gray-600">积分数量</Label>
              <Input
                type="number"
                min={1}
                max={adjustType === 'deduct' ? state.totalPoints : undefined}
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="请输入积分数量"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">原因说明</Label>
              <Input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder={adjustType === 'add' ? '例如：额外奖励、帮助家长等' : '例如：违反约定、作业质量不佳等'}
                className="mt-1"
              />
            </div>
            {adjustType === 'deduct' && state.totalPoints > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ 最多可扣除 {state.totalPoints} 积分
              </p>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAdjustDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              variant={adjustType === 'add' ? 'default' : 'destructive'}
              className={adjustType === 'add' ? 'flex-1 bg-green-500 hover:bg-green-600' : 'flex-1'}
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <Pencil className="w-6 h-6 text-blue-500" />
              编辑调整记录
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-gray-600">调整类型</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  type="button"
                  variant={adjustType === 'add' ? 'default' : 'outline'}
                  className={adjustType === 'add' ? 'flex-1 bg-green-500 hover:bg-green-600' : 'flex-1'}
                  onClick={() => setAdjustType('add')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  加分
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'deduct' ? 'default' : 'outline'}
                  className={adjustType === 'deduct' ? 'flex-1 bg-red-500 hover:bg-red-600' : 'flex-1'}
                  onClick={() => setAdjustType('deduct')}
                >
                  <Minus className="w-4 h-4 mr-1" />
                  扣分
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-600">积分数量</Label>
              <Input
                type="number"
                min={1}
                value={adjustPoints}
                onChange={(e) => setAdjustPoints(e.target.value)}
                placeholder="请输入积分数量"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600">原因说明</Label>
              <Input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="请输入原因说明"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowEditDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
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
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              确认删除
            </DialogTitle>
            <DialogDescription className="text-center">
              确定要删除这条积分调整记录吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          {deletingAdjustment && (
            <div className="bg-gray-50 rounded-lg p-3 my-4">
              <div className="flex items-center gap-2 mb-1">
                {deletingAdjustment.points > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`font-bold ${deletingAdjustment.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {deletingAdjustment.points > 0 ? '+' : ''}{deletingAdjustment.points}
                </span>
              </div>
              <p className="text-sm text-gray-600">{deletingAdjustment.reason}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
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
      <div className="text-center py-12 text-gray-400">
        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">暂无调整记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {adjustments.map((adj, index) => (
        <motion.div
          key={adj.id || adj.createdAt}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`p-3 rounded-xl border ${
            adj.points > 0
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {adj.points > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span
                  className={`font-bold ${
                    adj.points > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {adj.points > 0 ? '+' : ''}{adj.points}
                </span>
              </div>
              <p className="text-sm text-gray-700 truncate">{adj.reason}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                <Calendar className="w-3 h-3" />
                {new Date(adj.createdAt).toLocaleDateString('zh-CN', {
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
                      className="h-7 w-7 text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                      onClick={() => onEdit(adj)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
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
