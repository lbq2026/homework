# 孩子数据继承（下发复制）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 家长可把自己账号的作业（三级分类）/奖品/自定义徽章「下发」复制给指定孩子（单事务 RPC，按名称幂等去重），并支持孩子端删作业/奖品、家长端替孩子删全部四类。

**Architecture:** 全走 SECURITY DEFINER RPC（方案 A，与 `sql/parent-controls.sql` 现有 5 个 RPC 同模式）：`dispatch_to_child` 沿三级分类父链补齐一二级分类并复制作业/奖品/徽章；`delete_child_template` 白名单表名 + 行属主校验后删除。前端新增两个家长弹窗组件，孩子端两个视图把删除按钮移出 `isParent` 条件。

**Tech Stack:** PostgreSQL/PLpgSQL（Supabase RPC）· React 18 + TypeScript + Vite · shadcn/ui + Tailwind · sonner toast · vitest

**规格文档:** `docs/superpowers/specs/2026-11-02-child-data-inheritance-design.md`（已批准，已按三级分类发现勘误）

---

## 环境注意（执行者必读）

- **Windows PowerShell 5**：不支持 `&&` 与 heredoc；多命令用 `;` 分隔；git 提交用简单 `-m "中文消息"`（不用 heredoc）。
- **沙箱内直调 node**（不用 npx）：cwd 一律 `f:\AI-Center\homework-main`：
  - 测试：`node node_modules/vitest/vitest.mjs run <文件>`
  - 类型：`node node_modules/typescript/bin/tsc -b`
  - 构建：`node node_modules/vite/bin/vite.js build`
- **每次 git 提交都会出现回收站事件警告**（`.git/index`、`refs/heads/main`、各 lock 文件）——已多次验证是 git 内部文件正常增删的误报，仓库无损，**忽略即可**，不要试图恢复。
- **SQL 迁移无法由执行者运行**：涉及步骤完成后提醒用户在 Supabase Dashboard → SQL Editor 手动执行（T1 与 T8 各提醒一次）。
- 项目无 @testing-library，仅写纯函数单测（现有 36 个，禁回归）。
- git 提交风格：`feat(parent): 中文描述`。

## 文件结构

| 文件 | 动作 | 职责 |
|---|---|---|
| `sql/parent-controls.sql` | 修改 | 追加 `dispatch_to_child`、`delete_child_template` 两个 RPC + GRANT + 验证注释 |
| `src/utils/dispatchDedupe.ts` | 新建 | 纯函数：trim 后名称判重 + 列表「已下发」标注 |
| `src/utils/__tests__/dispatchDedupe.test.ts` | 新建 | 上者的单测 |
| `src/types/database.ts` | 修改 | Functions 补两个 RPC 签名（type alias 文件，禁 interface） |
| `src/services/supabaseApi.ts` | 修改 | 三个封装：`dispatchToChildRpc` / `deleteChildTemplateRpc` / `fetchChildTemplateNames` |
| `src/components/parent/DispatchDialog.tsx` | 新建 | 家长下发对话框（三分区勾选 + 已下发禁勾） |
| `src/components/parent/ManageChildDataDialog.tsx` | 新建 | 家长管理孩子数据对话框（四分区 + 行删除） |
| `src/components/parent/ChildSection.tsx` | 修改 | ⋯菜单加两项入口并接线两个新弹窗 |
| `src/views/Tasks.tsx` | 修改 | 三级分类行「删除」按钮移出 `isParent` |
| `src/views/Rewards.tsx` | 修改 | 奖品行「删除」按钮移出 `isParent` |

---

### Task 1: SQL 迁移——两个 RPC 追加进 parent-controls.sql

**Files:**
- Modify: `sql/parent-controls.sql`（在 3.5 `approve_redemption` 函数之后、现有 GRANT 块之前插入两个函数；GRANT 块内追加 2 行；文件尾部验证段追加注释）

- [ ] **Step 1: 插入 3.6 `dispatch_to_child` 函数**

在 `sql/parent-controls.sql` 中定位 3.5 `approve_redemption` 函数的结尾 `$$;`（其后紧跟 `GRANT EXECUTE ON FUNCTION public.update_child_profile ...`），在其后插入：

```sql
-- 3.6 下发复制：作业(三级分类)/奖品/徽章 → 指定孩子
--     p_task_ids 实为家长端 tertiary_categories.id（作业=三级分类），沿父链补齐一二级
--     单事务 + 按名称幂等去重，返回 {"tasks","rewards","badges","categories"} 实际新增数
CREATE OR REPLACE FUNCTION public.dispatch_to_child(
  p_child_id uuid,
  p_task_ids uuid[],
  p_reward_ids uuid[],
  p_badge_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
  v_tid uuid;
  v_rid uuid;
  v_bid uuid;
  v_pri record;
  v_sec record;
  v_ter record;
  v_rw record;
  v_bd record;
  v_child_pid uuid;
  v_child_sid uuid;
  v_child_tid uuid;
  v_task_count integer := 0;
  v_reward_count integer := 0;
  v_badge_count integer := 0;
  v_cat_count integer := 0;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权下发给孩子';
  END IF;

  -- 作业复制：家长三级分类 → 孩子端，一二级沿父链补齐
  IF p_task_ids IS NOT NULL THEN
    FOREACH v_tid IN ARRAY p_task_ids LOOP
      SELECT * INTO v_ter FROM public.tertiary_categories
        WHERE id = v_tid AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      SELECT * INTO v_sec FROM public.secondary_categories
        WHERE id = v_ter.secondary_category_id AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      SELECT * INTO v_pri FROM public.primary_categories
        WHERE id = v_sec.primary_category_id AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;

      -- 一级：按 key 判重（UNIQUE(user_id,key)），ON CONFLICT 兜底并发
      v_child_pid := NULL;
      SELECT id INTO v_child_pid FROM public.primary_categories
        WHERE user_id = p_child_id AND key = v_pri.key;
      IF v_child_pid IS NULL THEN
        INSERT INTO public.primary_categories (user_id, name, icon, key)
          VALUES (p_child_id, v_pri.name, v_pri.icon, v_pri.key)
          ON CONFLICT (user_id, key) DO NOTHING
          RETURNING id INTO v_child_pid;
        IF v_child_pid IS NOT NULL THEN
          v_cat_count := v_cat_count + 1;
        END IF;
      END IF;
      CONTINUE WHEN v_child_pid IS NULL;

      -- 二级：映射后父 id + trim 同名判重
      v_child_sid := NULL;
      SELECT id INTO v_child_sid FROM public.secondary_categories
        WHERE user_id = p_child_id
          AND primary_category_id = v_child_pid
          AND btrim(name) = btrim(v_sec.name);
      IF v_child_sid IS NULL THEN
        INSERT INTO public.secondary_categories (user_id, primary_category_id, name, icon)
          VALUES (p_child_id, v_child_pid, v_sec.name, v_sec.icon)
          RETURNING id INTO v_child_sid;
        v_cat_count := v_cat_count + 1;
      END IF;

      -- 三级：同规则判重，插入成功计入 tasks（repeat_rule jsonb 原样复制）
      v_child_tid := NULL;
      SELECT id INTO v_child_tid FROM public.tertiary_categories
        WHERE user_id = p_child_id
          AND secondary_category_id = v_child_sid
          AND btrim(name) = btrim(v_ter.name);
      IF v_child_tid IS NULL THEN
        INSERT INTO public.tertiary_categories
          (user_id, secondary_category_id, name, icon, default_points, repeat_rule)
          VALUES
          (p_child_id, v_child_sid, v_ter.name, v_ter.icon, v_ter.default_points, v_ter.repeat_rule);
        v_task_count := v_task_count + 1;
      END IF;
    END LOOP;
  END IF;

  -- 奖品复制（按名称去重）
  IF p_reward_ids IS NOT NULL THEN
    FOREACH v_rid IN ARRAY p_reward_ids LOOP
      SELECT * INTO v_rw FROM public.rewards WHERE id = v_rid AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.rewards
        WHERE user_id = p_child_id AND btrim(name) = btrim(v_rw.name)
      );
      INSERT INTO public.rewards (user_id, name, points, icon, description, category)
        VALUES (p_child_id, v_rw.name, v_rw.points, v_rw.icon, v_rw.description, v_rw.category);
      v_reward_count := v_reward_count + 1;
    END LOOP;
  END IF;

  -- 徽章复制（custom_badges.user_id 引用 auth.users(id)，与 profiles.id 同值）
  IF p_badge_ids IS NOT NULL THEN
    FOREACH v_bid IN ARRAY p_badge_ids LOOP
      SELECT * INTO v_bd FROM public.custom_badges WHERE id = v_bid AND user_id = auth.uid();
      CONTINUE WHEN NOT FOUND;
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.custom_badges
        WHERE user_id = p_child_id AND btrim(name) = btrim(v_bd.name)
      );
      INSERT INTO public.custom_badges (user_id, name, icon, description, condition_type, condition_value)
        VALUES (p_child_id, v_bd.name, v_bd.icon, v_bd.description, v_bd.condition_type, v_bd.condition_value);
      v_badge_count := v_badge_count + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'tasks', v_task_count,
    'rewards', v_reward_count,
    'badges', v_badge_count,
    'categories', v_cat_count
  );
END;
$$;
```

- [ ] **Step 2: 插入 3.7 `delete_child_template` 函数**

紧接 3.6 函数之后插入：

```sql
-- 3.7 家长替孩子删模板：白名单表 + 行必须属于该孩子（防跨账号误删）
CREATE OR REPLACE FUNCTION public.delete_child_template(
  p_child_id uuid,
  p_table text,
  p_item_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_allowed text[] := ARRAY[
    'tasks', 'rewards', 'custom_badges',
    'primary_categories', 'secondary_categories', 'tertiary_categories'
  ];
  v_deleted bigint;
BEGIN
  IF NOT public.is_parent_of(p_child_id) THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_table IS NULL OR NOT (p_table = ANY(v_allowed)) THEN
    RAISE EXCEPTION '不支持的数据类型';
  END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id = $1 AND user_id = $2', p_table)
    USING p_item_id, p_child_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION '条目不存在';
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;
```

- [ ] **Step 3: GRANT 块追加 2 行**

在现有 5 行 `GRANT EXECUTE ...` 之后（`approve_redemption` 那行后）追加：

```sql
GRANT EXECUTE ON FUNCTION public.dispatch_to_child(uuid, uuid[], uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_child_template(uuid, text, uuid) TO authenticated;
```

- [ ] **Step 4: 文件尾部验证段追加注释**

在文件末尾现有验证注释段（`-- SELECT public.approve_redemption ...` 之后）追加：

```sql
-- SELECT public.dispatch_to_child('<孩子uuid>', ARRAY[(SELECT id FROM public.tertiary_categories WHERE user_id='<家长uuid>' LIMIT 1)], ARRAY[]::uuid[], ARRAY[]::uuid[]);
--   -- 重复执行第二次，返回 {"tasks":0,...} 验证幂等去重；tasks/rewards/badges/categories 为实际新增数
-- SELECT public.delete_child_template('<孩子uuid>', 'tertiary_categories', '<孩子端三级分类uuid>');  -- 成功返回 {"success":true}
-- SELECT public.delete_child_template('<孩子uuid>', 'daily_records', '<随便什么uuid>');             -- 应报「不支持的数据类型」
-- SELECT public.delete_child_template('<孩子uuid>', 'rewards', '<不存在的uuid>');                  -- 应报「条目不存在」
```

- [ ] **Step 5: 提交**

```powershell
git add sql/parent-controls.sql
git commit -m "feat(parent): 下发复制与孩子模板删除两个 RPC"
```

- [ ] **Step 6: 提醒用户执行迁移**

向用户输出提醒：请在 Supabase Dashboard → SQL Editor 全量复制执行更新后的 `sql/parent-controls.sql`（新函数为 CREATE OR REPLACE，重跑幂等）。执行成功前，后续前端任务的 RPC 调用会报函数不存在——属预期，不阻塞写代码。

### Task 2: 去重纯函数 dispatchDedupe.ts（TDD）

**Files:**
- Create: `src/utils/dispatchDedupe.ts`
- Test: `src/utils/__tests__/dispatchDedupe.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `src/utils/__tests__/dispatchDedupe.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { isDispatched, annotateDispatchItems } from '../dispatchDedupe';

describe('isDispatched', () => {
  it('trim 后同名视为已下发', () => {
    expect(isDispatched('刷牙 ', ['  刷牙'])).toBe(true);
  });
  it('不同名视为未下发', () => {
    expect(isDispatched('跳绳', ['刷牙'])).toBe(false);
  });
  it('空集合未下发', () => {
    expect(isDispatched('跳绳', [])).toBe(false);
  });
});

describe('annotateDispatchItems', () => {
  it('按孩子端名称集合标注已下发', () => {
    const items = [
      { id: '1', name: '刷牙' },
      { id: '2', name: '跳绳' },
    ];
    expect(annotateDispatchItems(items, ['刷牙'])).toEqual([
      { item: { id: '1', name: '刷牙' }, dispatched: true },
      { item: { id: '2', name: '跳绳' }, dispatched: false },
    ]);
  });
  it('空孩子端全部未下发', () => {
    const items = [{ id: '1', name: '刷牙' }];
    expect(annotateDispatchItems(items, [])).toEqual([
      { item: { id: '1', name: '刷牙' }, dispatched: false },
    ]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node node_modules/vitest/vitest.mjs run src/utils/__tests__/dispatchDedupe.test.ts`
Expected: FAIL（`Cannot find module '../dispatchDedupe'`）

- [ ] **Step 3: 写最小实现**

创建 `src/utils/dispatchDedupe.ts`：

```typescript
/** trim 后名称比对是否已存在于集合（与 RPC 端 btrim 判重规则一致） */
export const isDispatched = (name: string, existingNames: string[]): boolean => {
  const trimmed = name.trim();
  return existingNames.some((n) => n.trim() === trimmed);
};

export interface DispatchEntry<T> {
  item: T;
  /** 孩子端已有同名项 → 下发对话框中禁勾 */
  dispatched: boolean;
}

/** 给列表项标注「已下发」（孩子端同名即视为已下发） */
export const annotateDispatchItems = <T extends { name: string }>(
  items: T[],
  existingNames: string[],
): DispatchEntry<T>[] =>
  items.map((item) => ({ item, dispatched: isDispatched(item.name, existingNames) }));
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node node_modules/vitest/vitest.mjs run src/utils/__tests__/dispatchDedupe.test.ts`
Expected: PASS（5 个用例全绿）

- [ ] **Step 5: 提交**

```powershell
git add src/utils/dispatchDedupe.ts src/utils/__tests__/dispatchDedupe.test.ts
git commit -m "feat(parent): 下发去重纯函数 dispatchDedupe"
```

---

### Task 3: RPC 类型签名 + supabaseApi 三个封装

**Files:**
- Modify: `src/types/database.ts:404-433`（`Functions` 对象内追加两个签名）
- Modify: `src/services/supabaseApi.ts:759-763`（`approveRedemptionRpc` 之后追加三个封装）

- [ ] **Step 1: database.ts Functions 追加签名**

在 `approve_redemption` 签名之后（`Functions` 对象闭合 `};` 之前）追加（注意该文件是 Database 类型定义文件，只用 type/对象字面量，与现有风格一致）：

```typescript
      dispatch_to_child: {
        Args: {
          p_child_id: string;
          p_task_ids: string[] | null;
          p_reward_ids: string[] | null;
          p_badge_ids: string[] | null;
        };
        Returns: Record<string, unknown>;
      };
      delete_child_template: {
        Args: { p_child_id: string; p_table: string; p_item_id: string };
        Returns: Record<string, unknown>;
      };
```

- [ ] **Step 2: supabaseApi.ts 追加三个封装**

在文件末尾 `approveRedemptionRpc` 之后追加（沿用现有 `xxxRpc` 命名、snake_case `p_*` 参数、不 await 直接返回调用结果的风格）：

```typescript
/** 下发复制：作业(三级分类)/奖品/徽章 → 指定孩子，分类沿父链自动补齐；返回各类实际新增数 */
export const dispatchToChildRpc = (
  childId: string,
  taskIds: string[],
  rewardIds: string[],
  badgeIds: string[],
) =>
  supabase.rpc('dispatch_to_child', {
    p_child_id: childId,
    p_task_ids: taskIds.length > 0 ? taskIds : null,
    p_reward_ids: rewardIds.length > 0 ? rewardIds : null,
    p_badge_ids: badgeIds.length > 0 ? badgeIds : null,
  });

/** 家长替孩子删模板：p_table ∈ tasks|rewards|custom_badges|primary/secondary/tertiary_categories */
export const deleteChildTemplateRpc = (childId: string, table: string, itemId: string) =>
  supabase.rpc('delete_child_template', {
    p_child_id: childId,
    p_table: table,
    p_item_id: itemId,
  });

/** 拉孩子端作业/奖品/徽章名称集合，用于下发对话框「已下发」禁勾标记 */
export const fetchChildTemplateNames = async (childId: string) => {
  const [{ data: taskRows }, { data: rewardRows }, { data: badgeRows }] = await Promise.all([
    supabase.from('tertiary_categories').select('name').eq('user_id', childId),
    supabase.from('rewards').select('name').eq('user_id', childId),
    supabase.from('custom_badges').select('name').eq('user_id', childId),
  ]);
  return {
    taskNames: (taskRows ?? []).map((r) => r.name),
    rewardNames: (rewardRows ?? []).map((r) => r.name),
    badgeNames: (badgeRows ?? []).map((r) => r.name),
  };
};
```

- [ ] **Step 3: 类型检查**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无错误退出（exit 0）

- [ ] **Step 4: 提交**

```powershell
git add src/types/database.ts src/services/supabaseApi.ts
git commit -m "feat(parent): 下发/删模板 RPC 类型与 API 封装"
```

### Task 4: 下发对话框 DispatchDialog.tsx

**Files:**
- Create: `src/components/parent/DispatchDialog.tsx`

前置事实：家长自己账号的数据已由 `useAppState()`（`src/contexts/AppStateContext.tsx`）加载到 `state.tertiaryCategories` / `state.rewards` / `state.customBadges`，组件内直接取用，不做额外请求。`Checkbox` 组件存在于 `src/components/ui/checkbox.tsx`（Radix 封装，`onCheckedChange` 回调）。

- [ ] **Step 1: 创建组件**

创建 `src/components/parent/DispatchDialog.tsx`：

```tsx
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAppState } from '@/contexts/AppStateContext';
import { dispatchToChildRpc, fetchChildTemplateNames, type ProfileRow } from '@/services/supabaseApi';
import { annotateDispatchItems, type DispatchEntry } from '@/utils/dispatchDedupe';
import { toast } from 'sonner';

interface DispatchDialogProps {
  child: ProfileRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 下发成功后由父级刷新孩子列表 */
  onDone: () => void;
}

/** 下发对话框：勾选家长自己的作业/奖品/徽章复制给指定孩子，分类沿父链自动补齐 */
export const DispatchDialog = ({ child, open, onOpenChange, onDone }: DispatchDialogProps) => {
  const { state } = useAppState();
  const [existing, setExisting] = useState({ taskNames: [] as string[], rewardNames: [] as string[], badgeNames: [] as string[] });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedTasks([]);
      setSelectedRewards([]);
      setSelectedBadges([]);
      fetchChildTemplateNames(child.id).then(setExisting);
    }
  }, [open, child.id]);

  const toggleId = (list: string[], id: string) =>
    (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const taskEntries = annotateDispatchItems(state.tertiaryCategories, existing.taskNames);
  const rewardEntries = annotateDispatchItems(state.rewards, existing.rewardNames);
  const badgeEntries = annotateDispatchItems(state.customBadges, existing.badgeNames);
  const hasSelection = selectedTasks.length + selectedRewards.length + selectedBadges.length > 0;

  const handleDispatch = async () => {
    setSaving(true);
    const { data, error } = await dispatchToChildRpc(child.id, selectedTasks, selectedRewards, selectedBadges);
    setSaving(false);
    if (error) {
      toast.error('下发失败', { description: error.message });
      return;
    }
    const r = (data ?? {}) as Record<string, number>;
    toast.success(
      `已下发 任务 ${r.tasks ?? 0} · 奖品 ${r.rewards ?? 0} · 徽章 ${r.badges ?? 0}（分类自动补齐 ${r.categories ?? 0} 个）`,
      { icon: '📦' },
    );
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-surface max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">下发作业 / 奖品</DialogTitle>
          <DialogDescription className="text-center text-caption">
            勾选内容将复制到「{child.username || '小勇士'}」的账号（副本独立），分类自动补齐；孩子已有的同名项不可再发
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <DispatchSection
            title="作业"
            entries={taskEntries}
            selectedIds={selectedTasks}
            onToggle={(id) => setSelectedTasks((list) => toggleId(list, id))}
            onSelectAll={(ids) => setSelectedTasks(ids)}
            emptyHint="先在任务中心创建作业"
          />
          <DispatchSection
            title="奖品"
            entries={rewardEntries}
            selectedIds={selectedRewards}
            onToggle={(id) => setSelectedRewards((list) => toggleId(list, id))}
            onSelectAll={(ids) => setSelectedRewards(ids)}
            emptyHint="先在奖品中心创建奖品"
          />
          <DispatchSection
            title="自定义徽章"
            entries={badgeEntries}
            selectedIds={selectedBadges}
            onToggle={(id) => setSelectedBadges((list) => toggleId(list, id))}
            onSelectAll={(ids) => setSelectedBadges(ids)}
            emptyHint="先在徽章管理创建自定义徽章"
          />
          <Button
            onClick={handleDispatch}
            disabled={!hasSelection || saving}
            className="w-full bg-brand-500 hover:bg-brand-400 rounded-button shadow-button"
          >
            {saving ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />下发中...</>) : '确认下发'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface DispatchSectionProps<T extends { id: string; name: string }> {
  title: string;
  entries: DispatchEntry<T>[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  emptyHint: string;
}

/** 单分区：全选/清空 + 复选列表；「已下发」项禁勾并标注 */
function DispatchSection<T extends { id: string; name: string }>({
  title, entries, selectedIds, onToggle, onSelectAll, emptyHint,
}: DispatchSectionProps<T>) {
  if (entries.length === 0) {
    return (
      <div className="rounded-card border border-neutral-100 p-3">
        <div className="text-body font-medium text-neutral-700 mb-1">{title}</div>
        <div className="text-caption text-neutral-400">{emptyHint}</div>
      </div>
    );
  }
  const selectableIds = entries.filter((e) => !e.dispatched).map((e) => e.item.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));
  return (
    <div className="rounded-card border border-neutral-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-body font-medium text-neutral-700">{title}</div>
        <button
          type="button"
          className="text-caption text-brand-500 hover:text-brand-600"
          onClick={() =>
            onSelectAll(
              allSelected
                ? selectedIds.filter((id) => !selectableIds.includes(id))
                : [...new Set([...selectedIds, ...selectableIds])],
            )
          }
        >
          {allSelected ? '清空' : '全选'}
        </button>
      </div>
      <div className="space-y-1 max-h-44 overflow-y-auto">
        {entries.map(({ item, dispatched }) => (
          <label
            key={item.id}
            className={`flex items-center gap-2 rounded-input px-2 py-1.5 ${dispatched ? 'opacity-50' : 'hover:bg-neutral-50'}`}
          >
            <Checkbox
              checked={selectedIds.includes(item.id)}
              disabled={dispatched}
              onCheckedChange={() => onToggle(item.id)}
              className="w-4 h-4"
            />
            <span className="text-body text-neutral-700 truncate">{item.name}</span>
            {dispatched && <span className="text-caption text-neutral-400 ml-auto shrink-0">已下发</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: exit 0（此刻组件尚未被引用，仅校验自身类型）

- [ ] **Step 3: 提交**

```powershell
git add src/components/parent/DispatchDialog.tsx
git commit -m "feat(parent): 下发对话框（三分区勾选+已下发禁勾）"
```

---

### Task 5: 管理孩子数据对话框 ManageChildDataDialog.tsx

**Files:**
- Create: `src/components/parent/ManageChildDataDialog.tsx`

前置事实：`fetchChildData(childId)`（supabaseApi.ts:224）返回 `UserDataResult`，其中 `tertiaryCategories`/`secondaryCategories`/`primaryCategories`/`rewards`/`customBadges` 是**数据库原始行**（snake_case 字段：三级行的父引用是 `secondary_category_id`，不是驼峰）。规格明确用分区按钮组切换，不用 shadcn Tabs。

- [ ] **Step 1: 创建组件**

创建 `src/components/parent/ManageChildDataDialog.tsx`：

```tsx
import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  deleteChildTemplateRpc,
  fetchChildData,
  type ProfileRow,
  type UserDataResult,
} from '@/services/supabaseApi';
import { toast } from 'sonner';

interface ManageChildDataDialogProps {
  child: ProfileRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 删除成功后由父级刷新孩子列表 */
  onDone: () => void;
}

type SectionKey = 'tasks' | 'rewards' | 'badges' | 'categories';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'tasks', label: '作业' },
  { key: 'rewards', label: '奖品' },
  { key: 'badges', label: '徽章' },
  { key: 'categories', label: '分类' },
];

interface ManagedRow {
  /** RPC 白名单表名 */
  table: string;
  id: string;
  label: string;
  confirmText: string;
}

/** 管理孩子数据：家长替孩子删减作业/奖品/徽章/分类（走 delete_child_template RPC） */
export const ManageChildDataDialog = ({ child, open, onOpenChange, onDone }: ManageChildDataDialogProps) => {
  const [section, setSection] = useState<SectionKey>('tasks');
  const [data, setData] = useState<UserDataResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmRow, setConfirmRow] = useState<ManagedRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setData(await fetchChildData(child.id));
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setSection('tasks');
      setConfirmRow(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, child.id]);

  // 当前分区待删行（fetchChildData 返回数据库原始行，字段 snake_case）
  const rows: ManagedRow[] = (() => {
    if (!data) return [];
    if (section === 'tasks') {
      return data.tertiaryCategories.map((t) => ({
        table: 'tertiary_categories',
        id: t.id,
        label: `${t.icon} ${t.name}`,
        confirmText: `删除作业「${t.name}」？孩子已产生的打卡记录与积分不受影响。`,
      }));
    }
    if (section === 'rewards') {
      return data.rewards.map((r) => ({
        table: 'rewards',
        id: r.id,
        label: `${r.icon} ${r.name}（${r.points} 积分）`,
        confirmText: `删除奖品「${r.name}」？孩子的历史兑换记录不受影响。`,
      }));
    }
    if (section === 'badges') {
      return data.customBadges.map((b) => ({
        table: 'custom_badges',
        id: b.id,
        label: `${b.icon} ${b.name}`,
        confirmText: `删除徽章「${b.name}」？已解锁记录不受影响。`,
      }));
    }
    const secondaryNameById = new Map(data.secondaryCategories.map((s) => [s.id, s.name]));
    return [
      ...data.primaryCategories.map((p) => ({
        table: 'primary_categories',
        id: p.id,
        label: `${p.icon} ${p.name}（一级）`,
        confirmText: `删除一级分类「${p.name}」？其下二级分类与作业分类将一并删除。`,
      })),
      ...data.secondaryCategories.map((s) => ({
        table: 'secondary_categories',
        id: s.id,
        label: `${s.icon} ${s.name}（二级）`,
        confirmText: `删除二级分类「${s.name}」？其下作业分类将一并删除。`,
      })),
      ...data.tertiaryCategories.map((t) => ({
        table: 'tertiary_categories',
        id: t.id,
        label: `${t.icon} ${t.name}（${secondaryNameById.get(t.secondary_category_id) || '未归类的二级'}下）`,
        confirmText: `删除分类「${t.name}」？删除后该分类下的作业将变为未分类。`,
      })),
    ];
  })();

  const handleConfirmDelete = async () => {
    if (!confirmRow) return;
    setDeleting(true);
    const { error } = await deleteChildTemplateRpc(child.id, confirmRow.table, confirmRow.id);
    setDeleting(false);
    if (error) {
      toast.error('删除失败', { description: error.message });
      return;
    }
    toast.success('已删除');
    setConfirmRow(null);
    await load();
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-surface max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">管理孩子数据</DialogTitle>
          <DialogDescription className="text-center text-caption">
            查看「{child.username || '小勇士'}」的作业/奖品/徽章/分类并按需删减（历史记录不受影响）
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <div className="grid grid-cols-4 gap-2 mb-3">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={`rounded-button py-1.5 text-body transition-colors ${
                  section === s.key
                    ? 'bg-brand-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-caption text-neutral-400">该分区暂无数据</div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {rows.map((row) => (
                <div key={`${row.table}-${row.id}`} className="flex items-center gap-2 rounded-input bg-neutral-50 px-2.5 py-1.5">
                  <span className="text-body text-neutral-700 truncate flex-1">{row.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRow(row)}
                    className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 删除确认弹窗 */}
        <Dialog open={confirmRow !== null} onOpenChange={(o) => !o && setConfirmRow(null)}>
          <DialogContent className="sm:max-w-xs rounded-surface">
            <DialogHeader>
              <DialogTitle className="text-center">确认删除</DialogTitle>
              <DialogDescription className="text-center text-caption">{confirmRow?.confirmText}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 py-2">
              <Button variant="outline" className="flex-1 rounded-button" onClick={() => setConfirmRow(null)} disabled={deleting}>
                取消
              </Button>
              <Button variant="destructive" className="flex-1 rounded-button" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? (<><Loader2 className="w-4 h-4 mr-1 animate-spin" />删除中...</>) : '确认删除'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: 类型检查**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: exit 0。若报 `UserDataResult` 行上不存在 `secondary_category_id`，先 Read `src/services/supabaseApi.ts` 中 `UserDataResult` 与对应 Row 类型定义核实字段名再修正（预期该字段存在——`TertiaryCategoryRow` 为数据库原始行）。

- [ ] **Step 3: 提交**

```powershell
git add src/components/parent/ManageChildDataDialog.tsx
git commit -m "feat(parent): 管理孩子数据对话框（四分区+行删除）"
```

### Task 6: ChildSection 菜单入口接线

**Files:**
- Modify: `src/components/parent/ChildSection.tsx`（import 区 :12 后、state 区 :35 后、`openManage` :100-105、⋯菜单 :176-180、弹窗渲染 :247-254）

- [ ] **Step 1: 追加 import**

在 `import { EditChildDialog, ResetPasswordDialog, UnbindChildDialog, BindChildDialog } from './ChildManageDialogs';` 之后追加：

```tsx
import { DispatchDialog } from './DispatchDialog';
import { ManageChildDataDialog } from './ManageChildDataDialog';
```

- [ ] **Step 2: 追加两个 state**

在 `const [showUnbind, setShowUnbind] = useState(false);`（:35）之后追加：

```tsx
  const [showDispatch, setShowDispatch] = useState(false);
  const [showManage, setShowManage] = useState(false);
```

- [ ] **Step 3: 扩展 openManage 类型**

把现有（:100-105）：

```tsx
  const openManage = (child: ProfileRow, dialog: 'edit' | 'reset' | 'unbind') => {
    setManageChild(child);
    if (dialog === 'edit') setShowEdit(true);
    else if (dialog === 'reset') setShowReset(true);
    else setShowUnbind(true);
  };
```

替换为：

```tsx
  const openManage = (child: ProfileRow, dialog: 'edit' | 'reset' | 'unbind' | 'dispatch' | 'manage') => {
    setManageChild(child);
    if (dialog === 'edit') setShowEdit(true);
    else if (dialog === 'reset') setShowReset(true);
    else if (dialog === 'unbind') setShowUnbind(true);
    else if (dialog === 'dispatch') setShowDispatch(true);
    else setShowManage(true);
  };
```

- [ ] **Step 4: ⋯菜单加两项**

把现有菜单内容（:176-180）：

```tsx
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openManage(child, 'edit')}>编辑资料</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'reset')}>重置密码</DropdownMenuItem>
                    <DropdownMenuItem className="text-semantic-danger" onClick={() => openManage(child, 'unbind')}>解绑</DropdownMenuItem>
                  </DropdownMenuContent>
```

替换为：

```tsx
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openManage(child, 'edit')}>编辑资料</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'reset')}>重置密码</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'dispatch')}>下发作业/奖品</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openManage(child, 'manage')}>管理孩子数据</DropdownMenuItem>
                    <DropdownMenuItem className="text-semantic-danger" onClick={() => openManage(child, 'unbind')}>解绑</DropdownMenuItem>
                  </DropdownMenuContent>
```

- [ ] **Step 5: 渲染两个新弹窗**

把现有弹窗渲染块（:247-254）：

```tsx
      {/* ⋯菜单对应的三个弹窗 */}
      {manageChild && (
        <>
          <EditChildDialog child={manageChild} open={showEdit} onOpenChange={setShowEdit} onDone={onChanged} />
          <ResetPasswordDialog child={manageChild} open={showReset} onOpenChange={setShowReset} onDone={onChanged} />
          <UnbindChildDialog child={manageChild} open={showUnbind} onOpenChange={setShowUnbind} onDone={onChanged} />
        </>
      )}
```

替换为：

```tsx
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
```

- [ ] **Step 6: 类型检查并提交**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: exit 0

```powershell
git add src/components/parent/ChildSection.tsx
git commit -m "feat(parent): 孩子菜单接入下发与管理数据入口"
```

---

### Task 7: 孩子端删减入口（Tasks.tsx / Rewards.tsx）

**Files:**
- Modify: `src/views/Tasks.tsx:623-652`（三级分类行按钮组）
- Modify: `src/views/Rewards.tsx:219-239`（奖品行悬浮按钮组）

前置事实：两处现有「删除」均已包在 `{isParent && (…)}` 内；`deleteTertiaryCategory`（supabaseApi.ts:395）与 `deleteReward`（:426）均为直接的 `.delete()`，无角色参数，RLS 放行孩子删自己的行（full-schema.sql DELETE 策略 `auth.uid() = user_id`）；Rewards 删除已有确认弹窗（`showDeleteConfirm`，:490-518），Tasks 三级删除与家长端一致为直删无弹窗——保持现状一致，不额外加弹窗（YAGNI）。任务开始前先 Read `src/hooks/useSyncedAppState.ts` 核验这两个删除方法透传时未做 `isParent` 拦截，若有拦截需一并放开（预期没有）。

- [ ] **Step 1: Tasks.tsx 把「删除」移出 isParent**

把现有（:623-652，三级分类行按钮组）：

```tsx
                                          <div className="flex items-center gap-1">
                                            {isParent && (
                                              <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => addTertiaryCategoryToToday(tertiary.id)}
                                              className="text-accent-green-600 hover:text-accent-green-600 hover:bg-accent-green-300/20"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditDialog('edit-tertiary', tertiary)}
                                              className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => deleteTertiaryCategory(tertiary.id)}
                                              className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                              </>
                                            )}
                                          </div>
```

替换为（「加今日」「编辑」仍仅家长；「删除」孩子也可用——删自己的作业模板）：

```tsx
                                          <div className="flex items-center gap-1">
                                            {isParent && (
                                              <>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => addTertiaryCategoryToToday(tertiary.id)}
                                              className="text-accent-green-600 hover:text-accent-green-600 hover:bg-accent-green-300/20"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditDialog('edit-tertiary', tertiary)}
                                              className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                              </>
                                            )}
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => deleteTertiaryCategory(tertiary.id)}
                                              className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
                                          </div>
```

- [ ] **Step 2: Rewards.tsx 把「删除」移出 isParent**

把现有（:219-239）：

```tsx
                      {/* 编辑/删除按钮 - 仅家长可见 */}
                      {isParent && (
                      <div className="absolute top-1 right-1 flex gap-1 z-20">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reward)}
                          className="w-7 h-7 bg-white hover:bg-accent-yellow-300/30 shadow-card hover:shadow-card-hover rounded-full border border-neutral-200 hover:border-accent-yellow-300"
                        >
                          <Edit2 className="w-4 h-4 text-accent-yellow-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(reward)}
                          className="w-7 h-7 bg-white hover:bg-semantic-danger-soft shadow-card hover:shadow-card-hover rounded-full border border-neutral-200 hover:border-semantic-danger"
                        >
                          <Trash2 className="w-4 h-4 text-semantic-danger" />
                        </Button>
                      </div>
                      )}
```

替换为：

```tsx
                      {/* 编辑仅家长；删除孩子也可用（删自己的奖品，走既有确认弹窗） */}
                      <div className="absolute top-1 right-1 flex gap-1 z-20">
                        {isParent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reward)}
                          className="w-7 h-7 bg-white hover:bg-accent-yellow-300/30 shadow-card hover:shadow-card-hover rounded-full border border-neutral-200 hover:border-accent-yellow-300"
                        >
                          <Edit2 className="w-4 h-4 text-accent-yellow-600" />
                        </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(reward)}
                          className="w-7 h-7 bg-white hover:bg-semantic-danger-soft shadow-card hover:shadow-card-hover rounded-full border border-neutral-200 hover:border-semantic-danger"
                        >
                          <Trash2 className="w-4 h-4 text-semantic-danger" />
                        </Button>
                      </div>
```

- [ ] **Step 3: 类型检查、全量测试并提交**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: exit 0

Run: `node node_modules/vitest/vitest.mjs run`
Expected: 41 个用例全绿（36 旧 + 5 新）

```powershell
git add src/views/Tasks.tsx src/views/Rewards.tsx
git commit -m "feat(child): 孩子端开放作业与奖品删除入口"
```

---

### Task 8: 终验与验收

**Files:** 无新增（只跑验证 + 提醒）

- [ ] **Step 1: 全量验证三连**

Run: `node node_modules/vitest/vitest.mjs run`
Expected: 全绿

Run: `node node_modules/typescript/bin/tsc -b`
Expected: exit 0

Run: `node node_modules/vite/bin/vite.js build`
Expected: 构建成功

- [ ] **Step 2: 提醒用户执行 SQL 迁移（若 T1 后尚未执行）**

提醒用户在 Supabase Dashboard → SQL Editor 全量执行 `sql/parent-controls.sql`，并按文件尾部验证段在家长登录态验证：下发 → 重复下发（第二次 tasks=0）→ `delete_child_template` 逐表删 → 非法表名报「不支持的数据类型」。

- [ ] **Step 3: 手动验收清单（输出给用户，配合 localhost:5173）**

1. 家长「⋯ → 下发作业/奖品」勾选若干作业/奖品/徽章下发 → toast 数字正确 → 孩子端登录后任务中心/奖品中心立即可见，分类自动补齐
2. 再次下发同批内容 → 全部显示「已下发」且禁勾；若家长改了孩子端同名项名称再发，按名称判重不重复
3. 孩子端任务中心三级分类行可删除自己的作业；奖品行可删除自己的奖品（有确认弹窗）；删除后历史打卡与积分不变
4. 家长「⋯ → 管理孩子数据」四分区删减：删分类走确认（三级的文案为「删除后该分类下的作业将变为未分类」）→ 孩子对应作业变「未分类」
5. 解绑孩子后再下发/删减 → toast 显示「无权下发给孩子」/「无权操作该孩子」中文错误
6. 现有功能回归：家长自己增删作业/奖品、兑换审批不受影响

- [ ] **Step 4: 确认工作区干净**

Run: `git status`
Expected: working tree clean（本计划所有改动均已按任务提交）

---

## 自审记录

- **规格覆盖**：§4.1→T1、§4.2→T1、§4.3→T1、§5.1→T3、§5.2→T4、§5.3→T5、§5.4→T7、入口接线→T6、§7 单测→T2/T8、验收→T8。无缺口。
- **占位符**：无 TBD/TODO/「类似 Task N」；所有代码步骤均含完整代码。
- **类型一致性**：`dispatchToChildRpc`/`deleteChildTemplateRpc`/`fetchChildTemplateNames`（T3 定义，T4/T5/T6 引用）命名一致；`DispatchEntry`（T2 定义，T4 引用）；`ChildDialogProps` 形状 `{child, open, onOpenChange, onDone}` 与现有 ChildManageDialogs 一致；RPC 返回键 `tasks/rewards/badges/categories` 与 SQL `jsonb_build_object` 键一致。
- **已知风险**：Task 5 依赖 `TertiaryCategoryRow.secondary_category_id` 字段名，若与实际类型不符按 Step 2 的核验指引修正（其余行字段 `id/name/icon/points` 已核实在 Row 类型中存在）。

