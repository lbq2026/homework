import { useEffect, useState } from 'react';
import { Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AVATAR_OPTIONS } from '@/constants/avatars';
import {
  updateChildProfileRpc,
  resetChildPasswordRpc,
  unbindChildRpc,
  bindExistingChildRpc,
  type ProfileRow,
} from '@/services/supabaseApi';
import {
  validateChildProfileForm,
  validateResetPasswordForm,
  validateBindEmailForm,
} from '@/utils/childFormValidation';
import { toast } from 'sonner';

interface ChildDialogProps {
  child: ProfileRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 操作成功后由父级刷新孩子列表 */
  onDone: () => void;
}

/** 编辑孩子资料：昵称 + 头像 */
export const EditChildDialog = ({ child, open, onOpenChange, onDone }: ChildDialogProps) => {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('😊');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUsername(child.username || '');
      setAvatar(child.avatar_url || '😊');
    }
  }, [open, child]);

  const handleSave = async () => {
    const invalid = validateChildProfileForm(username);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(true);
    const { error } = await updateChildProfileRpc(child.id, username.trim(), avatar);
    setSaving(false);
    if (error) {
      toast.error('保存失败', { description: error.message });
      return;
    }
    toast.success('孩子资料已更新');
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-surface">
        <DialogHeader>
          <DialogTitle className="text-center">编辑孩子资料</DialogTitle>
          <DialogDescription className="text-center text-caption">
            修改 {child.username || '小勇士'} 的昵称与头像
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>昵称</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="孩子昵称"
              className="mt-1 rounded-input"
            />
          </div>
          <div>
            <Label>头像</Label>
            <div className="mt-1 grid grid-cols-6 gap-2">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  key={opt.emoji}
                  type="button"
                  onClick={() => setAvatar(opt.emoji)}
                  title={opt.label}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors ${
                    avatar === opt.emoji
                      ? 'bg-brand-100 ring-2 ring-brand-400'
                      : 'bg-neutral-100 hover:bg-neutral-200'
                  }`}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-400 rounded-button shadow-button"
          >
            {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />保存中...</>) : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** 重置孩子密码：新密码 + 确认（RPC 内踢掉孩子旧会话） */
export const ResetPasswordDialog = ({ child, open, onOpenChange, onDone }: ChildDialogProps) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirm('');
    }
  }, [open]);

  const handleSave = async () => {
    const invalid = validateResetPasswordForm(password, confirm);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(true);
    const { error } = await resetChildPasswordRpc(child.id, password);
    setSaving(false);
    if (error) {
      toast.error('重置失败', { description: error.message });
      return;
    }
    toast.success('密码已重置', { description: '孩子当前登录已失效，需用新密码重新登录' });
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-surface">
        <DialogHeader>
          <DialogTitle className="text-center">重置登录密码</DialogTitle>
          <DialogDescription className="text-center text-caption">
            为 {child.username || '小勇士'} 设置新密码，重置后其当前登录立即失效
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>新密码</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                className="pl-9 rounded-input"
              />
            </div>
          </div>
          <div>
            <Label>确认新密码</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入新密码"
                className="pl-9 rounded-input"
              />
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-400 rounded-button shadow-button"
          >
            {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />重置中...</>) : '重置密码'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** 解绑孩子：parent_id 置空，账号与数据保留 */
export const UnbindChildDialog = ({ child, open, onOpenChange, onDone }: ChildDialogProps) => {
  const [saving, setSaving] = useState(false);

  const handleUnbind = async () => {
    setSaving(true);
    const { error } = await unbindChildRpc(child.id);
    setSaving(false);
    if (error) {
      toast.error('解绑失败', { description: error.message });
      return;
    }
    toast.success('已解绑', { description: '孩子账号与数据保留，之后可重新绑定' });
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-surface">
        <DialogHeader>
          <DialogTitle className="text-center">解除绑定</DialogTitle>
          <DialogDescription className="text-center text-caption">
            确定解绑「{child.username || '小勇士'}」？解绑后你将无法查看其数据，孩子的账号与所有数据会保留，可随时重新绑定。
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 py-2">
          <Button
            variant="outline"
            className="flex-1 rounded-button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-button"
            onClick={handleUnbind}
            disabled={saving}
          >
            {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />解绑中...</>) : '确认解绑'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface BindDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** 绑定已有孩子账号：输入孩子登录邮箱（RPC 内校验角色/归属/不能绑自己） */
export const BindChildDialog = ({ open, onOpenChange, onDone }: BindDialogProps) => {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setEmail('');
  }, [open]);

  const handleBind = async () => {
    const invalid = validateBindEmailForm(email);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(true);
    const { error } = await bindExistingChildRpc(email.trim());
    setSaving(false);
    if (error) {
      toast.error('绑定失败', { description: error.message });
      return;
    }
    toast.success('绑定成功', { description: '孩子已出现在你的孩子列表中' });
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-surface">
        <DialogHeader>
          <DialogTitle className="text-center">绑定已有孩子</DialogTitle>
          <DialogDescription className="text-center text-caption">
            输入孩子的登录邮箱即可绑定（仅限未绑定过其他家长的孩子账号）
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>孩子登录邮箱</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kid@example.com"
                className="pl-9 rounded-input"
              />
            </div>
          </div>
          <Button
            onClick={handleBind}
            disabled={saving}
            className="w-full bg-brand-500 hover:bg-brand-400 rounded-button shadow-button"
          >
            {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />绑定中...</>) : '绑定'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
