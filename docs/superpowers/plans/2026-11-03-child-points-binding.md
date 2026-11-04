(some characters truncated)...

    p_points: points,
    p_reason: reason,
  });

export const deleteChildPointAdjustmentRpc = (adjustmentId: string) =>
  supabase.rpc('delete_child_point_adjustment', {
    p_adjustment_id: adjustmentId,
  });
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc -b`

Expected: 无新增错误（既有未提交改动如也有错误，先确认错误不在 `supabaseApi.ts`）。

- [ ] **Step 4: 提交**

```bash
git add src/services/supabaseApi.ts
git commit -m "feat(api): 家长孩子积分 RPC 封装"
```

---

## Task 4: 积分管理页数据源与操作改造

**Files:**
- Modify: `src/views/PointManagement.tsx`

- [ ] **Step 1: 替换导入与组件状态**

把文件开头（第 1 行到旧「计算统计数据」的 `totalDeducted` 定义结束）整体替换为下面的代码。
原有的 `totalAdded` / `totalDeducted` 统计块一并删除，由 Step 2 的 `displayAdjustments` 版本取代：

```tsx
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
```

- [ ] **Step 2: 加入孩子列表加载、数据加载与派生值**

紧接在 `isSubmitting` 的状态声明之后插入：

```tsx
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
```

- [ ] **Step 3: 替换三个操作函数**

把原 `handleSubmit`、`handleEdit`、`handleDelete` 三个函数（从 `const handleSubmit = async () => {` 到 `handleDelete` 结束的 `};`）整体替换为：

```tsx
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
```

- [ ] **Step 4: 头部总分改为所选孩子**

把 header 中的三行：

```tsx
          <p className="text-white/80 text-body mb-2">当前总积分</p>
          <div className="text-display font-bold flex items-center justify-center gap-3">
            <Coins className="w-10 h-10" />
            {state.totalPoints}
          </div>
```

替换为：

```tsx
          <p className="text-white/80 text-body mb-2">
            {isParent ? `${selectedChild?.username || '孩子'} 当前积分` : '当前总积分'}
          </p>
          <div className="text-display font-bold flex items-center justify-center gap-3">
            <Coins className="w-10 h-10" />
            {isParent && isChildDataLoading ? '加载中…' : displayTotal}
          </div>
```

- [ ] **Step 5: 加入孩子切换器**

在 `</header>` 之后、`<div className="p-4 pb-24 space-y-4">` 之后的第一项位置插入：

```tsx
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
```

- [ ] **Step 6: 快捷操作区改为所选孩子并支持禁用**

把快捷操作区的条件 `{isParent && (` 改为 `{isParent && childList.length > 0 && (`，
并给两个按钮加上 `disabled`：

```tsx
            <Button
              onClick={() => openAdjustDialog('add')}
              disabled={!selectedChildId || !childData || isChildDataLoading}
              className="h-16 bg-gradient-to-r from-accent-green-400 to-accent-green-600 hover:from-accent-green-600 hover:to-accent-green-600 text-white rounded-button shadow-button"
            >
```

```tsx
            <Button
              onClick={() => openAdjustDialog('deduct')}
              disabled={!selectedChildId || !childData || isChildDataLoading}
              className="h-16 bg-gradient-to-r from-semantic-danger to-accent-orange-400 hover:from-semantic-danger hover:to-accent-orange-600 text-white rounded-button shadow-button"
            >
```

- [ ] **Step 7: 调整记录改用展示数据**

把记录区三处 `state.pointAdjustments` 替换为 `displayAdjustments`：

```tsx
                adjustments={displayAdjustments}
```

```tsx
                adjustments={displayAdjustments.filter(a => a.points > 0)}
```

```tsx
                adjustments={displayAdjustments.filter(a => a.points < 0)}
```

- [ ] **Step 8: 新增/编辑弹窗显示孩子与孩子积分上限**

新增弹窗（`showAdjustDialog`）：

- 在 `<div className="space-y-4 py-2">` 后插入：

```tsx
            {selectedChild && (
              <p className="text-caption text-neutral-500">
                记入：{selectedChild.username || '小勇士'}
              </p>
            )}
```

- 输入框 `max` 改为：

```tsx
                max={adjustType === 'deduct' ? childTotal : undefined}
```

- 扣分提示改为：

```tsx
            {adjustType === 'deduct' && childTotal > 0 && (
              <p className="text-caption text-accent-yellow-600 bg-accent-yellow-300/30 p-2 rounded-card">
                ⚠️ 最多可扣除 {childTotal} 积分
              </p>
            )}
```

编辑弹窗（`showEditDialog`）：

- 同样在 `<div className="space-y-4 py-2">` 后插入：

```tsx
            {selectedChild && (
              <p className="text-caption text-neutral-500">
                记入：{selectedChild.username || '小勇士'}
              </p>
            )}
```

- 原因说明输入框之后插入：

```tsx
            {adjustType === 'deduct' && (
              <p className="text-caption text-accent-yellow-600 bg-accent-yellow-300/30 p-2 rounded-card">
                ⚠️ 本次最多可扣除 {getMaxEditableDeduction(childTotal, editingAdjustment?.points ?? 0)} 积分
              </p>
            )}
```

- [ ] **Step 9: 类型检查**

Run: `npx tsc -b`

Expected: 无新增错误；`PointManagement.tsx` 中不再出现 `state.totalPoints` 参与家长端计算。

- [ ] **Step 10: 提交**

```bash
git add src/views/PointManagement.tsx
git commit -m "feat(points): 积分类管理页按所选孩子读写"
```

---

## Task 5: 移除旧的家长自写积分方法

**Files:**
- Modify: `src/hooks/useSyncedAppState.ts`

- [ ] **Step 1: 删除未使用的 API 导入**

删除导入列表中的两行：

```ts
  updatePointAdjustment,
  deletePointAdjustment as deletePointAdjustmentApi,
```

保留 `insertPointAdjustment`（`buyMakeupCard` 仍在用）。

- [ ] **Step 2: 删除三个旧方法**

删除从 `  // ============================================` + `  // 积分调整` 注释开始，到 `deletePointAdjustment` 的 `}, [user, createBackup]);` 结束的整段（原第 1055-1180 行）：

```ts
  const adjustPoints = useCallback(...);
  const editPointAdjustment = useCallback(...);
  const deletePointAdjustment = useCallback(...);
```

（保留其后的「补签卡」注释与 `buyMakeupCard`。）

- [ ] **Step 3: 从返回对象中移除三个方法**

把返回对象中的：

```ts
    adjustPoints,
    editPointAdjustment,
    deletePointAdjustment,
```

删除。

- [ ] **Step 4: 全量检查**

Run: `npx tsc -b`

Expected: 无新增错误，尤其无 `Cannot find name 'adjustPoints'` 或未使用导入告警。

Run: `npx vitest run`

Expected: 现有测试 + 新增 `pointAdjustment.test.ts` 全部通过。

- [ ] **Step 5: 提交**

```bash
git add src/hooks/useSyncedAppState.ts
git commit -m "refactor(points): 移除写家长账号的旧积分方法"
```

---

## Task 6: 构建与手动验收

**Files:** 无代码改动

- [ ] **Step 1: 构建**

Run: `npx tsc -b`

Expected: 通过。

Run: `npx vite build`

Expected: 构建成功。

- [ ] **Step 2: 手动验收清单（家长账号）**

1. 0 个孩子：显示空态与「去绑定孩子」，快捷操作区隐藏。
2. 1 个孩子：自动选中并显示昵称/头像，可加分、扣分。
3. ≥2 个孩子：切换 chip 后，头部积分、累计加分/扣分、记录列表同步切换。
4. 加分后刷新页面：孩子账号积分增加，记录出现在孩子名下。
5. 超额扣分：实际扣减被截断到孩子当前积分；孩子积分为 0 时提示不可扣。
6. 编辑记录：改成超过可扣额度时提示「编辑后孩子积分不能为负」并阻止；正常编辑后总分按差值变化。
7. 删除记录：确认后记录消失，孩子积分回滚。
8. 孩子端在线时，家长操作后几分钟内孩子端积分/记录自动刷新（Realtime）。

- [ ] **Step 3: 手动验收（孩子账号）**

1. 进入 `/profile/points`：只显示自己的积分与记录，无切换器、无加减分按钮、无编辑/删除按钮。

- [ ] **Step 4: 安全验收**

在家长登录态下调用 RPC 并传入非自己孩子的 id（可用 SQL Editor 以 `auth.uid()` 上下文或前端临时调用），必须返回「无权操作该孩子」。

---

## Self-Review 结论

- 规格覆盖：页面结构（Task 4）、RPC 与一致性（Task 2）、前端数据流（Task 3/4）、旧方法清理（Task 5）、边界与验证（Task 4 错误态 + Task 6）。
- 无占位符：所有代码与命令均为可直接执行内容。
- 类型一致性：`clampDeduction` / `canApplyEdit` / `getMaxEditableDeduction` / `pickInitialChildId` 在 Task 1 定义，Task 4 按同名调用；RPC 参数名与 Task 2 SQL 一致。
