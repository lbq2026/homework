import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Edit2, Trash2, Check, Lock, Unlock, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/** 可选徽章图标 */
const BADGE_ICONS = ['🏅', '⭐', '🌟', '🔥', '💎', '👑', '🚀', '🌈', '🎯', '🧸', '🍀', '🌙', '⚡', '🎨'];

/** 条件类型配置 */
const CONDITION_OPTIONS = [
  { v: 'tasks', label: '完成任务', unit: '个任务' },
  { v: 'points', label: '累计积分', unit: '积分' },
  { v: 'streak', label: '连续天数', unit: '天' },
] as const;

export const Badges = () => {
  const navigate = useNavigate();
  const { isParent } = useAuth();
  const { state, addCustomBadge, editCustomBadge, deleteCustomBadge } = useAppState();

  const [showDialog, setShowDialog] = useState(false);
  const [editingBadge, setEditingBadge] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    icon: '🏅',
    description: '',
    conditionType: 'tasks' as 'tasks' | 'points' | 'streak',
    conditionValue: 10,
  });

  const resetForm = () => {
    setForm({ name: '', icon: '🏅', description: '', conditionType: 'tasks', conditionValue: 10 });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (form.conditionValue <= 0) return;

    if (editingBadge) {
      await editCustomBadge(editingBadge, {
        name: form.name.trim(),
        icon: form.icon,
        description: form.description.trim(),
        conditionType: form.conditionType,
        conditionValue: form.conditionValue,
      });
      toast.success('徽章已更新', { icon: '🏅' });
    } else {
      await addCustomBadge({
        name: form.name.trim(),
        icon: form.icon,
        description: form.description.trim(),
        conditionType: form.conditionType,
        conditionValue: form.conditionValue,
      });
      toast.success('徽章已创建', { icon: '🏅' });
    }
    setShowDialog(false);
    setEditingBadge(null);
    resetForm();
  };

  const openEdit = (badgeId: string) => {
    const badge = state.customBadges.find(b => b.id === badgeId);
    if (!badge) return;
    setEditingBadge(badgeId);
    setForm({
      name: badge.name,
      icon: badge.icon,
      description: badge.description,
      conditionType: badge.conditionType,
      conditionValue: badge.conditionValue,
    });
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    await deleteCustomBadge(showDeleteConfirm);
    toast.success('徽章已删除', { icon: '🗑️' });
    setShowDeleteConfirm(null);
  };

  const conditionText = (badge: { conditionType: string; conditionValue: number }) => {
    const opt = CONDITION_OPTIONS.find(o => o.v === badge.conditionType);
    return `${opt?.label || ''} ${badge.conditionValue} ${opt?.unit || ''}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-role-child to-accent-purple-400 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">徽章管理</h1>
          <div className="w-10" />
        </div>
        <p className="text-pink-100 text-body">为小勇士自定义专属成就徽章</p>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {!isParent ? (
          <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="font-medium text-neutral-600 mb-2">仅家长可用</h3>
            <p className="text-caption text-neutral-400">请使用家长账号登录后管理徽章</p>
          </div>
        ) : (
          <>
            <Button
              onClick={() => { setEditingBadge(null); resetForm(); setShowDialog(true); }}
              className="w-full bg-gradient-to-r from-role-child to-accent-purple-400 hover:from-role-child hover:to-accent-purple-600 text-white rounded-button shadow-button py-6"
            >
              <Plus className="w-5 h-5 mr-2" />
              创建自定义徽章
            </Button>

            <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
              <h3 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
                <Medal className="w-5 h-5 text-role-child" />
                我的自定义徽章（{state.customBadges.length}）
              </h3>

              {state.customBadges.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-body">
                  还没有自定义徽章，创建一个激励孩子吧
                </div>
              ) : (
                <div className="space-y-2">
                  {state.customBadges.map(badge => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-3 p-3 rounded-card border ${
                        badge.unlockedAt ? 'bg-accent-yellow-300/20 border-accent-yellow-300' : 'bg-neutral-50 border-neutral-100'
                      }`}
                    >
                      <div className="text-3xl">{badge.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-800 text-body">{badge.name}</div>
                        <div className="text-caption text-neutral-400">{conditionText(badge)}</div>
                      </div>
                      <span className={`text-caption px-2 py-0.5 rounded-badge flex items-center gap-1 ${
                        badge.unlockedAt ? 'bg-accent-yellow-300/40 text-accent-yellow-600' : 'bg-neutral-200 text-neutral-400'
                      }`}>
                        {badge.unlockedAt ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {badge.unlockedAt ? '已解锁' : '未解锁'}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(badge.id)}>
                          <Edit2 className="w-4 h-4 text-neutral-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setShowDeleteConfirm(badge.id)}>
                          <Trash2 className="w-4 h-4 text-semantic-danger" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 创建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">{editingBadge ? '编辑徽章' : '创建徽章'}</DialogTitle>
            <DialogDescription className="text-center text-caption">
              孩子达成条件后自动解锁
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>徽章名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：阅读小达人"
                className="mt-1 rounded-input"
              />
            </div>
            <div>
              <Label>图标</Label>
              <div className="grid grid-cols-7 gap-2 mt-1">
                {BADGE_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={`text-2xl p-1.5 rounded-input transition-all ${
                      form.icon === icon ? 'bg-role-child-soft ring-2 ring-role-child' : 'hover:bg-neutral-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>解锁条件</Label>
              <div className="flex gap-2 mt-1">
                {CONDITION_OPTIONS.map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setForm({ ...form, conditionType: opt.v })}
                    className={`flex-1 py-2 rounded-input text-caption font-bold border-2 transition-all ${
                      form.conditionType === opt.v
                        ? 'bg-role-child-soft border-role-child text-role-child'
                        : 'bg-white border-neutral-200 text-neutral-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, conditionValue: Math.max(1, form.conditionValue - 5) })}>-5</Button>
                <span className="text-title font-bold flex-1 text-center">{form.conditionValue}</span>
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, conditionValue: form.conditionValue + 5 })}>+5</Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 rounded-button" onClick={() => { setShowDialog(false); setEditingBadge(null); }}>
              取消
            </Button>
            <Button
              className="flex-1 bg-role-child hover:bg-accent-purple-400 rounded-button"
              onClick={handleSubmit}
              disabled={!form.name.trim() || form.conditionValue <= 0}
            >
              <Check className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">确认删除徽章?</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-center">
            删除后孩子已获得的该徽章也会移除，且不可恢复。
          </DialogDescription>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1 rounded-button" onClick={() => setShowDeleteConfirm(null)}>取消</Button>
            <Button variant="destructive" className="flex-1 rounded-button" onClick={handleDelete}>确认删除</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
