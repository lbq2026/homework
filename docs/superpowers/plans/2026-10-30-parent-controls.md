(some characters truncated)...
nt ? (
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
```

- [ ] **Step 2: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 3: 提交**

```powershell
git add src/views/Children.tsx
git commit -m "refactor(parent): 我的孩子页薄壳化，复用 ChildSection"
```

### Task 10: ParentDashboard 重构——真实数据总览 + RPC 审批 + 孩子区

**Files:**
- Modify: `src/views/ParentDashboard.tsx`（整文件替换）

- [ ] **Step 1: 整文件替换**

要点：①四卡片改为聚合所有孩子的真实数据（`fetchChildData` 并行 + `aggregateChildOverview`，替换原来读家长本人 `useAppState` 的口径）；②待审核区改用 `fetchPendingRedemptions` + `toPendingRedemptionItems`（显示孩子名）；③审批改走 `approveRedemptionRpc`（库内扣分/退冻结，移除 `useAppState` 依赖）；④新增孩子区（`ChildSection`，不显示新建入口）；⑤管理入口保留原 6 项。

```tsx
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
```

注意：移除了 `useAppState` 导入与 `getWeeklyReport` 导入（不再读家长本人数据）。孩子端完成作业/兑换后，家长中心重进或下次 loadAll 即见新数据（孩子端 Realtime 同步孩子自己界面，家长端以拉取为准）。

- [ ] **Step 2: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 3: 提交**

```powershell
git add src/views/ParentDashboard.tsx
git commit -m "feat(parent): 控制台聚合孩子真实数据并接入 RPC 审批"
```

### Task 11: 登录后按角色落地（家长登录直达 /parent）

**Files:**
- Modify: `src/hooks/useAuth.tsx`（AuthContextType 接口 ：21 附近、createChildAccount 实现 ：143-157 之后、value 对象 ：233 附近）
- Modify: `src/views/Auth.tsx`（:10-12 接口与 import、:15 解构、:71 handleLogin、:129 本地模式按钮）
- Modify: `src/App.tsx`（:114 未登录分支）

- [ ] **Step 1: useAuth.tsx 新增 fetchUserRole**

(a) 在 `AuthContextType` 接口中 `createChildAccount` 声明（:21）之后插入一行。定位上下文：

```tsx
  /** 家长通过 RPC 直接创建子账号（不触发 signUp 邮件速率限制） */
  createChildAccount: (username: string, password: string, parentId: string) => Promise<{ error: Error | null; childEmail?: string }>;
```

改为：

```tsx
  /** 家长通过 RPC 直接创建子账号（不触发 signUp 邮件速率限制） */
  createChildAccount: (username: string, password: string, parentId: string) => Promise<{ error: Error | null; childEmail?: string }>;
  /** 查询当前登录用户在 profiles.role 的角色；未登录或查询失败返回 null（登录落地用） */
  fetchUserRole: () => Promise<UserRole | null>;
```

(b) 在 `createChildAccount` 的 `useCallback` 实现（结束于 `}, []);`）与 `signUp` 之间插入实现：

```tsx
  // 查询当前登录用户角色（用于登录成功后按角色落地）
  const fetchUserRole = useCallback(async (): Promise<UserRole | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!error && data) return data.role as UserRole;
    } catch {
      // 查询失败按无角色处理
    }
    return null;
  }, []);
```

(c) 在 `value` 对象中 `createChildAccount,`（:233）之后加一行：

```tsx
    createChildAccount,
    fetchUserRole,
```

- [ ] **Step 2: Auth.tsx 登录成功时回传角色**

(a) :12 的 import 改为合并类型导入：

```tsx
import { useAuth, type UserRole } from '@/hooks/useAuth.tsx';
```

(b) :10-12 的 props 接口改为：

```tsx
interface AuthProps {
  onLoginSuccess: (role?: UserRole | null) => void;
}
```

(c) :15 的 hook 解构加入 `fetchUserRole`：

```tsx
  const { signIn, signInWithUsername, signUp, resetPassword, isConfigured, fetchUserRole } = useAuth();
```

(d) `handleLogin` 中成功分支（原 ：71 附近）改为先查角色再回调：

```tsx
    if (error) {
      setError(error.message);
    } else {
      const role = await fetchUserRole();
      onLoginSuccess(role);
    }
```

(e) :129 附近「先使用本地模式」按钮（Supabase 未配置分支）改为显式传 null：

```tsx
          <Button 
            onClick={() => onLoginSuccess(null)}
            className="mt-6 w-full bg-neutral-600 hover:bg-neutral-800 rounded-button"
          >
            先使用本地模式
          </Button>
```

- [ ] **Step 3: App.tsx 按角色落地**

:114 的未登录分支改为（形参名用 `loginRole`，避免遮蔽外层 `role`）：

```tsx
  if (!user && isConfigured && !isResetPage) {
    return <Auth onLoginSuccess={(loginRole) => window.location.replace(loginRole === 'parent' ? '/parent' : '/')} />;
  }
```

说明：`window.location.replace` 整页刷新以重置所有 Provider 状态；孩子角色（含 null）落地 `/`。

- [ ] **Step 4: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 5: 提交**

```powershell
git add src/hooks/useAuth.tsx src/views/Auth.tsx src/App.tsx
git commit -m "feat(parent): 登录成功后按角色落地家长中心"
```

### Task 12: 终验与手动验收

**Files:** 无新改动，只验证与提交计划文档

- [ ] **Step 1: 全量单测通过**

Run: `node node_modules/vitest/vitest.mjs run`
Expected: 全部测试 PASS（Task 2-4 新增的纯函数测试全绿，既有测试无回归）

- [ ] **Step 2: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 3: 生产构建通过**

Run: `node node_modules/vite/bin/vite.js build`
Expected: `✓ built in ...`，无类型/打包错误

- [ ] **Step 4: 执行数据库迁移 SQL**

在 Supabase Dashboard → SQL Editor 执行 `sql/parent-controls.sql` 全文（幂等，可重复执行）。
Expected: 无 ERROR；再执行文件尾部「验证」段的 SELECT，Expected：
- `is_parent_of` 函数存在（SECURITY DEFINER、STABLE）；
- 10 张业务表各返回 1 条面向家长的 SELECT 策略；
- `update_child_profile` / `reset_child_password` / `unbind_child` / `bind_existing_child` / `approve_redemption` 5 个 RPC 函数存在。

- [ ] **Step 5: 手动验收清单**

逐项勾选，全部通过才算完成：

- [ ] 家长账号登录后整页跳转落地 `/parent`（家长控制台）
- [ ] 孩子账号登录后落地 `/`（孩子首页，底部导航正常）
- [ ] 孩子端个人页「家长中心」入口（锁图标）仍可用，点击进入 `/parent` 显示权限守卫（共用设备动线保留）
- [ ] 家长控制台四张卡片（孩子档案/今日进度/本周积分/待审核兑换）数字与孩子账号真实数据一致
- [ ] 孩子端完成一项作业后，家长端退出重进 `/parent` 数据即更新（孩子端界面本身由 Realtime 即时同步）
- [ ] 兑换审批：通过后孩子 `total_points` 扣减对应分值、记录变 `fulfilled`；驳回后冻结分退回、记录变 `rejected`
- [ ] 家长中心「⋯」编辑资料（昵称/头像）保存后孩子端个人页即时显示新昵称头像
- [ ] 重置密码：孩子旧设备会话被踢出（回到登录页），用新密码可登录成功
- [ ] 解绑：解绑后孩子数据完整保留，家长控制台不再显示该孩子；重新绑定后数据恢复显示
- [ ] 绑定校验三类报错：邮箱不存在/角色不是孩子/已被其他家长绑定，均有中文错误提示
- [ ] `/profile/children` 页孩子管理入口正常（新建账号、数据面板、⋯菜单均可用）
- [ ] 未绑定家长的孩子账号直接访问 `/parent` 显示权限守卫提示，不显示控制台
- [ ] 家长控制台「管理入口」仍为 6 项快捷链接（与已批准 mockup 脚注⑤一致）

- [ ] **Step 6: 提交计划文档**

```powershell
git add docs/superpowers/plans/2026-10-30-parent-controls.md
git commit -m "docs(plan): 家长控制与孩子管理优化实施计划"
```

