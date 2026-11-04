import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Link2, Star, MoreVertical, Eye, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth.tsx';
import { fetchChildData, type ProfileRow, type UserDataResult } from '@/services/supabaseApi';
import { ChildDataPanel } from './ChildDataPanel';
import { EditChildDialog, ResetPasswordDialog, UnbindChildDialog, BindChildDialog } from './ChildManageDialogs';
import { DispatchDialog } from './DispatchDialog';
import { ManageChildDataDialog } from './ManageChildDataDialog';
import { toast } from 'sonner';

interface ChildSectionProps {
  /** 家长名下的孩子列表（fetchChildren 结果） */
  childList: ProfileRow[];
  loading: boolean;
  /** 任一管理操作成功后由父级刷新孩子列表 */
  onChanged: () => void;
  /** 是否显示「添加孩子档案」新建入口（我的孩子页 true；家长中心 false） */
  showCreateAccount: boolean;
}

/** 孩子列表区：卡片 + ⋯管理菜单 + 数据面板 + 绑定/新建入口（两处家长界面共用） */
export const ChildSection = ({ childList, loading, onChanged, showCreateAccount }: ChildSectionProps) => {
  const { user, createChildAccount } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showBindDialog, setShowBindDialog] = useState(false);
  const [manageChild, setManageChild] = useState<ProfileRow | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showUnbind, setShowUnbind] = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [panelData, setPanelData] = useState<UserDataResult | null>(null);
  const [panelFailed, setPanelFailed] = useState(false);

  // 新建孩子账号（自 Children.tsx 迁入，RPC 不触发邮件速率限制）
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
    if (!user) {
      toast.error('未检测到家长账号，请重新登录');
      return;
    }
    setIsCreating(true);
    const { error, childEmail } = await createChildAccount(
      formData.username.trim(),
      formData.password,
      user.id,
    );
    setIsCreating(false);
    if (error) {
      toast.error('创建失败', { description: error.message });
      return;
    }
    if (childEmail) {
      toast.success('孩子档案已创建', { description: `登录邮箱：${childEmail}`, icon: '👧' });
    } else {
      toast.success('孩子档案已创建', { icon: '👧' });
    }
    setShowAddDialog(false);
    setFormData({ username: '', password: '' });
    onChanged();
  };

  // 数据面板加载/重试（按需加载，家长读走 RLS；失败显示空态 + 重试而非静默吞错）
  const loadPanelData = async (childId: string) => {
    setPanelData(null);
    setPanelFailed(false);
    const data = await fetchChildData(childId);
    if (data) {
      setPanelData(data);
    } else {
      setPanelFailed(true);
    }
  };

  // 展开/收起孩子数据面板
  const handleTogglePanel = (child: ProfileRow) => {
    if (expandedId === child.id) {
      setExpandedId(null);
      setPanelData(null);
      setPanelFailed(false);
      return;
    }
    setExpandedId(child.id);
    loadPanelData(child.id);
  };

  const openManage = (child: ProfileRow, dialog: 'edit' | 'reset' | 'unbind' | 'dispatch' | 'manage') => {
    setManageChild(child);
    if (dialog === 'edit') setShowEdit(true);
    else if (dialog === 'reset') setShowReset(true);
    else if (dialog === 'unbind') setShowUnbind(true);
    else if (dialog === 'dispatch') setShowDispatch(true);
    else setShowManage(true);
  };

  return (
    <>
      {showCreateAccount && (
        <Button
          onClick={() => setShowAddDialog(true)}
          className="w-full bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white rounded-button shadow-button py-6"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          添加孩子档案
        </Button>
      )}

      <Button
        variant="outline"
        onClick={() => setShowBindDialog(true)}
        className="w-full text-brand-500 border-brand-200 hover:bg-brand-50 rounded-button"
      >
        <Link2 className="w-5 h-5 mr-2" />
        绑定已有孩子
      </Button>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
        </div>
      ) : childList.length === 0 ? (
        <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
          <div className="text-6xl mb-4">👨‍👩‍👧</div>
          <h3 className="font-medium text-neutral-600 mb-2">还没有孩子档案</h3>
          <p className="text-caption text-neutral-400">
            {showCreateAccount
              ? '点击上方「添加孩子档案」创建，或「绑定已有孩子」关联'
              : '到「我的孩子」页创建孩子档案，或在上方绑定已有孩子'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {childList.map((child) => (
            <div key={child.id} className="space-y-3">
              <motion.div
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
                  onClick={() => handleTogglePanel(child)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  数据面板
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-neutral-400">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openManage(child, 'edit')}>编辑资料</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'reset')}>重置密码</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'dispatch')}>下发作业/奖品</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'manage')}>管理孩子数据</DropdownMenuItem>
                    <DropdownMenuItem className="text-semantic-danger" onClick={() => openManage(child, 'unbind')}>解绑</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
              {expandedId === child.id && (
                <ChildDataPanel
                  username={child.username || '小勇士'}
                  data={panelData}
                  error={panelFailed}
                  onRetry={() => loadPanelData(child.id)}
                  onClose={() => { setExpandedId(null); setPanelData(null); setPanelFailed(false); }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 新建孩子账号弹窗（仅我的孩子页启用） */}
      {showCreateAccount && (
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
      )}

      {/* 绑定已有孩子 */}
      <BindChildDialog open={showBindDialog} onOpenChange={setShowBindDialog} onDone={onChanged} />

      {/* ⋯菜单对应的五个弹窗 */}
      {manageChild && (
        <>
          <EditChildDialog child={manageChild} open={showEdit} onOpenChange={setShowEdit} onDone={onChanged} />
          <ResetPasswordDialog child={manageChild} open={showReset} onOpenChange={setShowReset} onDone={onChanged} />
          <UnbindChildDialog child={manageChild} open={showUnbind} onOpenChange={setShowUnbind} onDone={onChanged} />
          <DispatchDialog child={manageChild} open={showDispatch} onOpenChange={setShowDispatch} onDone={onChanged} />
          <ManageChildDataDialog child={manageChild} open={showManage} onOpenChange={setShowManage} onDone={onChanged} />
        </>
      )}
    </>
  );
};
