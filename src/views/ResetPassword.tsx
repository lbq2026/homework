import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * 密码重置页：邮箱重置链接 → /reset-password?code=xxx
 * supabase-js 的 PKCE recovery 流程会自动处理 URL 中的 code 并建立会话，
 * 这里只需让用户输入新密码后调用 updateUser({ password })。
 */
export const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'done' | 'invalid'>('checking');

  // 检查是否处于可重置的恢复会话中
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setStatus('ready');
      } else {
        // 无会话：检查 URL 是否有 recovery code（部分场景下未自动建立会话）
        const params = new URLSearchParams(window.location.search);
        const type = params.get('type');
        if (type === 'recovery' || params.get('code')) {
          setStatus('ready');
        } else {
          setStatus('invalid');
        }
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('密码至少需要 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (error) {
      toast.error('重置失败', { description: error.message });
      return;
    }

    setStatus('done');
    toast.success('密码已重置，请重新登录');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* 头部装饰 */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
          <KeyRound className="w-12 h-12 text-white" />
        </div>

        <div className="p-6">
          {status === 'checking' && (
            <div className="text-center py-8 flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              正在检查重置状态...
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-800 mb-2">链接无效或已过期</h2>
              <p className="text-sm text-gray-500 mb-6">
                请重新发起密码重置请求，通过邮件中的最新链接操作。
              </p>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回登录
              </Button>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-gray-800 mb-2">密码重置成功</h2>
              <p className="text-sm text-gray-500 mb-6">请使用新密码重新登录</p>
              <Button
                className="w-full bg-blue-500 hover:bg-blue-600"
                onClick={() => navigate('/', { replace: true })}
              >
                去登录
              </Button>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold text-gray-800 text-center mb-1">设置新密码</h2>
              <p className="text-sm text-gray-500 text-center mb-6">请输入你的新登录密码</p>

              <div className="space-y-4">
                <div>
                  <Label>新密码</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>确认新密码</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    className="mt-1"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-6 bg-blue-500 hover:bg-blue-600"
                disabled={isSubmitting || !newPassword || !confirmPassword}
              >
                {isSubmitting ? '提交中...' : '确认重置'}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
