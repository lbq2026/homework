import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth.tsx';
import { fetchChildren, type ProfileRow } from '@/services/supabaseApi';
import { ChildSection } from '@/components/parent/ChildSection';
import { useNavigate } from 'react-router-dom';

/** 我的孩子页：薄壳（页头 + 权限守卫 + ChildSection，新建账号入口在此页启用） */
export const Children = () => {
  const navigate = useNavigate();
  const { isParent, user } = useAuth();
  const [children, setChildren] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const list = await fetchChildren(user.id);
    setChildren(list);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-gradient-to-r from-brand-400 to-brand-500 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">我的孩子</h1>
          <div className="w-10" />
        </div>
        <p className="text-brand-100 text-body">统一管理家庭中每个小勇士的成长</p>
      </header>

      <div className="p-4 pb-24 space-y-4">
        {!isParent ? (
          <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
            <div className="text-6xl mb-4">🔒</div>
            <h3 className="font-medium text-neutral-600 mb-2">仅家长可用</h3>
            <p className="text-caption text-neutral-400">请使用家长账号登录后管理孩子档案</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
          </div>
        ) : (
          <ChildSection childList={children} loading={false} onChanged={loadChildren} showCreateAccount />
        )}
      </div>
    </div>
  );
};
