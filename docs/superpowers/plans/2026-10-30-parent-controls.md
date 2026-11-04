# 家长控制与孩子管理 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 家长登录直达家长中心，可查看孩子真实数据总览、审批兑换，并管理孩子档案（编辑资料/重置密码/解绑/绑定已有孩子）。

**Architecture:** 方案 C——读走 RLS（10 张业务表各加 1 条家长 SELECT 策略，前端 `fetchChildData` 零改动）；写走 5 个 SECURITY DEFINER RPC（内部 `is_parent_of` 校验）。前端新增共享 `ChildSection` 组件（家长中心与 Children 页共用），家长中心重构为总览聚合 + 待审核区 + 孩子区，登录按角色落地。

**Tech Stack:** React 19 + TypeScript strict + Vite 7 + Supabase（RLS/RPC/pgcrypto）+ vitest + Tailwind（shadcn/ui 组件）

**规格文档:** `docs/superpowers/specs/2026-10-30-parent-controls-design.md`

**环境注意（Windows/PowerShell）：**
- 命令不含 `&&`，多条用 `;` 分隔；提交信息用 PowerShell here-string `@' ... '@`
- 沙箱内 node 直调：vitest 用 `node node_modules/vitest/vitest.mjs run <file>`；tsc 用 `node node_modules/typescript/bin/tsc -b`；构建用 `node node_modules/vite/bin/vite.js build`
- 所有命令的 cwd 均为 `f:\AI-Center\homework-main`

**文件结构总览：**

| 文件 | 职责 | 操作 |
|---|---|---|
| `sql/parent-controls.sql` | 10 表家长读策略 + 5 个 RPC + 验证 SQL | 新建 |
| `src/constants/avatars.ts` | 头像 emoji 常量（Profile 与家长中心共用） | 新建 |
| `src/views/Profile.tsx` | 改为引用共享头像常量 | 修改 |
| `src/utils/childFormValidation.ts` | 弹窗表单校验纯函数 | 新建 |
| `src/utils/childOverview.ts` | 孩子数据聚合 + 待审核列表映射纯函数 | 新建 |
| `src/utils/__tests__/childFormValidation.test.ts` | 校验纯函数单测 | 新建 |
| `src/utils/__tests__/childOverview.test.ts` | 聚合纯函数单测 | 新建 |
| `src/services/supabaseApi.ts` | `fetchPendingRedemptions` + 5 个 RPC 封装 | 修改 |
| `src/components/parent/ChildDataPanel.tsx` | 孩子只读数据面板（自 Children.tsx 迁出） | 新建 |
| `src/components/parent/ChildManageDialogs.tsx` | 编辑/重置密码/解绑/绑定 4 个弹窗 | 新建 |
| `src/components/parent/ChildSection.tsx` | 孩子列表区（卡片+⋯菜单+弹窗接线） | 新建 |
| `src/views/Children.tsx` | 简化为薄壳（ChildSection + 新建账号弹窗） | 修改 |
| `src/views/ParentDashboard.tsx` | 重构：孩子数据聚合总览 + 待审核 RPC 审批 + 内嵌 ChildSection | 修改 |
| `src/hooks/useAuth.tsx` | 新增 `fetchUserRole()` | 修改 |
| `src/views/Auth.tsx` | 登录成功后查角色再回调 | 修改 |
| `src/App.tsx` | 按角色落地 `/parent` 或 `/` | 修改 |

---

### Task 1: SQL——家长读策略 + 5 个动作 RPC

**Files:**
- Create: `sql/parent-controls.sql`

- [ ] **Step 1: 创建 SQL 脚本**

```sql
-- ============================================================
-- 家长控制与孩子管理（2026-10-30 · 方案 C：读走 RLS、写走 RPC）
-- 规格见 docs/superpowers/specs/2026-10-30-parent-controls-design.md
-- 沿用 create-child-account.sql 的模式：pgcrypto + SECURITY DEFINER + 中文报错
-- ============================================================

-- 1. 启用 pgcrypto（reset_child_password 需要 crypt/gen_salt）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 2. 家长读策略：10 张业务表各加 1 条（与现有策略 OR 关系，不改旧策略）
--    profiles 已有家长 SELECT 策略（full-schema.sql），此处不涉及
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks', 'daily_records', 'rewards', 'redemptions', 'badges',
    'point_adjustments', 'custom_badges', 'primary_categories',
    'secondary_categories', 'tertiary_categories'
  ] LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "Parents can view children''s %s" ON public.%I FOR SELECT
         USING (auth.uid() = user_id OR public.is_parent_of(user_id))',
        t, t
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;  -- 幂等：重跑跳过
    END;
  END LOOP;
END $$;

-- ============================================================
-- 3. 动作型 RPC（5 个，全部 SECURITY DEFINER + is_parent_of 校验）
-- ============================================================

-- 3.1 编辑孩子资料（昵称 + 头像 emoji）
CREATE OR REPLACE FUNCTION public.update_child_profile(
  p_child_id uuid,
  p_username text,
  p_avatar text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_username IS NULL OR length(trim(p_username)) = 0 THEN
    RAISE EXCEPTION '昵称不能为空';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = trim(p_username) AND id <> p_child_id) THEN
    RAISE EXCEPTION '昵称 "%" 已被占用', trim(p_username);
  END IF;
  UPDATE public.profiles
    SET username = trim(p_username), avatar_url = p_avatar, updated_at = now()
    WHERE id = p_child_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.2 重置孩子密码（更新 auth.users + 清 session，孩子旧登录立即失效）
CREATE OR REPLACE FUNCTION public.reset_child_password(
  p_child_id uuid,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
  hashed_pw text;
  crypto_ns text;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
    RAISE EXCEPTION '密码至少 6 位';
  END IF;

  -- 动态定位 pgcrypto schema（与 create_child_account 相同，扩展装哪都能跑）
  SELECT n.nspname INTO crypto_ns
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'gen_salt'
  LIMIT 1;
  IF crypto_ns IS NULL THEN
    RAISE EXCEPTION 'pgcrypto 扩展未启用，请在 Supabase Dashboard → Database → Extensions 启用';
  END IF;
  EXECUTE format('SELECT %I.crypt($1, %I.gen_salt($2))', crypto_ns, crypto_ns)
    INTO hashed_pw
    USING p_new_password, 'bf';

  UPDATE auth.users SET encrypted_password = hashed_pw, updated_at = now() WHERE id = p_child_id;
  DELETE FROM auth.sessions WHERE user_id = p_child_id;
  DELETE FROM auth.refresh_tokens WHERE user_id = p_child_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.3 解绑孩子（parent_id 置空，账号与数据保留，可重新绑定）
CREATE OR REPLACE FUNCTION public.unbind_child(p_child_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = p_child_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权操作该孩子';
  END IF;
  UPDATE public.profiles SET parent_id = NULL, updated_at = now() WHERE id = p_child_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3.4 绑定已有孩子（按登录邮箱；仅孩子账号、未绑定的可绑）
CREATE OR REPLACE FUNCTION public.bind_existing_child(p_child_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_role text;
  v_parent_id uuid;
BEGIN
  IF p_child_email IS NULL OR length(trim(p_child_email)) = 0 THEN
    RAISE EXCEPTION '请输入孩子登录邮箱';
  END IF;
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_child_email)) LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '未找到该邮箱的账号';
  END IF;
  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION '不能绑定自己的账号';
  END IF;
  SELECT role, parent_id INTO v_role, v_parent_id FROM public.profiles WHERE id = v_user_id;
  IF v_role IS DISTINCT FROM 'child' THEN
    RAISE EXCEPTION '该账号不是孩子账号';
  END IF;
  IF v_parent_id IS NOT NULL THEN
    RAISE EXCEPTION '该孩子已被绑定';
  END IF;
  UPDATE public.profiles SET parent_id = auth.uid(), updated_at = now() WHERE id = v_user_id;
  RETURN jsonb_build_object('success', true, 'child_id', v_user_id);
END;
$$;

-- 3.5 兑换审批（通过→fulfilled 且扣积分；驳回→rejected 冻结退回）
CREATE OR REPLACE FUNCTION public.approve_redemption(
  p_redemption_id uuid,
  p_approve boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_status text;
  v_points integer;
BEGIN
  SELECT user_id, status, points INTO v_user_id, v_status, v_points
  FROM public.redemptions WHERE id = p_redemption_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '兑换记录不存在';
  END IF;
  SELECT parent_id INTO v_parent_id FROM public.profiles WHERE id = v_user_id;
  IF v_parent_id IS NULL OR v_parent_id <> auth.uid() THEN
    RAISE EXCEPTION '无权处理该兑换';
  END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION '该兑换已被处理';
  END IF;

  IF p_approve THEN
    UPDATE public.redemptions SET status = 'fulfilled' WHERE id = p_redemption_id;
    UPDATE public.profiles
      SET total_points = COALESCE(total_points, 0) - v_points, updated_at = now()
      WHERE id = v_user_id;
  ELSE
    UPDATE public.redemptions SET status = 'rejected' WHERE id = p_redemption_id;
  END IF;
  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_child_profile(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_child_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unbind_child(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bind_existing_child(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_redemption(uuid, boolean) TO authenticated;

-- ============================================================
-- 4. 验证（在 Supabase SQL Editor 逐条执行，家长登录态下验证前端同理）
-- ============================================================
-- SELECT public.is_parent_of('<孩子uuid>');                                  -- 家长登录应返回 true
-- SELECT public.update_child_profile('<孩子uuid>', '新昵称', '🐱');          -- 成功返回 {"success":true}
-- SELECT public.reset_child_password('<孩子uuid>', 'newpass123');            -- 成功后孩子旧 session 失效
-- SELECT public.unbind_child('<孩子uuid>');                                  -- profiles.parent_id 变 NULL
-- SELECT public.bind_existing_child('<孩子邮箱>');                           -- 成功重新关联
-- SELECT public.approve_redemption('<兑换uuid>', true);                      -- status=fulfilled 且 total_points 扣减
```

- [ ] **Step 2: 提交**

```powershell
git add sql/parent-controls.sql
git commit -m @'
feat(parent): 家长读策略与孩子管理动作 RPC

10 张业务表新增家长 SELECT 策略（读走 RLS）；新增编辑资料/
重置密码（踢旧会话）/解绑/绑定/兑换审批 5 个 SECURITY DEFINER RPC。
'@
```

### Task 2: 提取共享头像常量

**Files:**
- Create: `src/constants/avatars.ts`
- Modify: `src/views/Profile.tsx:14-34`

- [ ] **Step 1: 新建 `src/constants/avatars.ts`**

```ts
/** 头像 emoji 备选（个人页 Profile 与家长中心「编辑孩子资料」弹窗共用） */
export interface AvatarOption {
  emoji: string;
  label: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { emoji: '😊', label: '微笑' },
  { emoji: '😎', label: '酷' },
  { emoji: '🤩', label: '兴奋' },
  { emoji: '🌟', label: '星星' },
  { emoji: '🚀', label: '火箭' },
  { emoji: '👑', label: '皇冠' },
  { emoji: '💎', label: '钻石' },
  { emoji: '✨', label: '闪光' },
  { emoji: '🎨', label: '艺术' },
  { emoji: '🎵', label: '音乐' },
  { emoji: '🎮', label: '游戏' },
  { emoji: '📚', label: '阅读' },
  { emoji: '🏆', label: '奖杯' },
  { emoji: '🥇', label: '金牌' },
  { emoji: '🦄', label: '独角兽' },
  { emoji: '🐱', label: '猫咪' },
  { emoji: '🐶', label: '狗狗' },
  { emoji: '🦋', label: '蝴蝶' },
  { emoji: '🌈', label: '彩虹' },
];
```

- [ ] **Step 2: Profile.tsx 改用共享常量**

删除 `src/views/Profile.tsx` 第 14-34 行的本地 `const AVATAR_OPTIONS = [...]` 定义，文件头部（`import { toast } from 'sonner';` 之后）加：

```ts
import { AVATAR_OPTIONS } from '@/constants/avatars';
```

文件内其余使用 `AVATAR_OPTIONS` 的代码不变。

- [ ] **Step 3: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 4: 提交**

```powershell
git add src/constants/avatars.ts src/views/Profile.tsx
git commit -m "refactor: 头像 emoji 常量抽为共享模块"
```

---

### Task 3: 弹窗表单校验纯函数（TDD）

**Files:**
- Create: `src/utils/childFormValidation.ts`
- Test: `src/utils/__tests__/childFormValidation.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import {
  validateChildProfileForm,
  validateResetPasswordForm,
  validateBindEmailForm,
} from '../childFormValidation';

describe('validateChildProfileForm', () => {
  it('空昵称返回错误', () => {
    expect(validateChildProfileForm('   ')).toBe('昵称不能为空');
  });
  it('合法昵称返回 null', () => {
    expect(validateChildProfileForm('小宝')).toBeNull();
  });
});

describe('validateResetPasswordForm', () => {
  it('密码少于 6 位返回错误', () => {
    expect(validateResetPasswordForm('abc12', 'abc12')).toBe('密码至少需要 6 位');
  });
  it('两次输入不一致返回错误', () => {
    expect(validateResetPasswordForm('abcdef', 'abcdeg')).toBe('两次输入的密码不一致');
  });
  it('合法密码返回 null', () => {
    expect(validateResetPasswordForm('abcdef', 'abcdef')).toBeNull();
  });
});

describe('validateBindEmailForm', () => {
  it('空邮箱返回错误', () => {
    expect(validateBindEmailForm('  ')).toBe('请输入孩子登录邮箱');
  });
  it('不含 @ 返回错误', () => {
    expect(validateBindEmailForm('not-an-email')).toBe('邮箱格式不正确');
  });
  it('合法邮箱返回 null', () => {
    expect(validateBindEmailForm('kid@example.com')).toBeNull();
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node node_modules/vitest/vitest.mjs run src/utils/__tests__/childFormValidation.test.ts`
Expected: FAIL（找不到模块 `../childFormValidation`）

- [ ] **Step 3: 实现**

```ts
/** 家长中心孩子管理弹窗的表单校验（纯函数，返回 null 表示通过） */

export function validateChildProfileForm(username: string): string | null {
  if (!username.trim()) return '昵称不能为空';
  return null;
}

export function validateResetPasswordForm(password: string, confirmPassword: string): string | null {
  if (password.length < 6) return '密码至少需要 6 位';
  if (password !== confirmPassword) return '两次输入的密码不一致';
  return null;
}

export function validateBindEmailForm(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return '请输入孩子登录邮箱';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '邮箱格式不正确';
  return null;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `node node_modules/vitest/vitest.mjs run src/utils/__tests__/childFormValidation.test.ts`
Expected: PASS（8 个用例全绿）

- [ ] **Step 5: 提交**

```powershell
git add src/utils/childFormValidation.ts src/utils/__tests__/childFormValidation.test.ts
git commit -m "feat(parent): 孩子管理弹窗表单校验纯函数"
```

---

### Task 4: 孩子数据聚合纯函数（TDD）

**Files:**
- Create: `src/utils/childOverview.ts`
- Test: `src/utils/__tests__/childOverview.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateChildOverview, toPendingRedemptionItems } from '../childOverview';

const child = (records: Array<{ date: string; totalPoints: number; done: number; total: number }>, redemptions: Array<{ points: number; status: string }>) => ({
  dailyRecords: records.map(r => ({
    date: r.date,
    total_points: r.totalPoints,
    tasks: Array.from({ length: r.total }, (_, i) => ({ completed: i < r.done })),
  })),
  redemptions,
});

describe('aggregateChildOverview', () => {
  const today = '2026-10-30'; // 周五

  it('空孩子列表返回全 0', () => {
    const r = aggregateChildOverview([], today);
    expect(r).toEqual({ todayDone: 0, todayTotal: 0, weekPoints: 0, pendingCount: 0 });
  });

  it('单孩子：今日进度取当日记录', () => {
    const r = aggregateChildOverview([child(
      [{ date: today, totalPoints: 10, done: 3, total: 5 }],
      [],
    )], today);
    expect(r.todayDone).toBe(3);
    expect(r.todayTotal).toBe(5);
  });

  it('多孩子：今日进度与待审核为求和', () => {
    const r = aggregateChildOverview([
      child([{ date: today, totalPoints: 10, done: 2, total: 4 }], [{ points: 5, status: 'pending' }]),
      child([{ date: today, totalPoints: 8, done: 1, total: 3 }], [{ points: 3, status: 'pending' }, { points: 2, status: 'fulfilled' }]),
    ], today);
    expect(r.todayDone).toBe(3);
    expect(r.todayTotal).toBe(7);
    expect(r.pendingCount).toBe(2);
  });

  it('本周积分只累计本周一至当日的记录', () => {
    const r = aggregateChildOverview([child(
      [
        { date: '2026-10-26', totalPoints: 4, done: 1, total: 1 }, // 周一（本周）
        { date: today, totalPoints: 6, done: 1, total: 1 },        // 周五（本周）
        { date: '2026-10-25', totalPoints: 100, done: 1, total: 1 }, // 周日（上周，不计）
      ],
      [],
    )], today);
    expect(r.weekPoints).toBe(10);
  });

  it('今日无记录时 todayDone/todayTotal 为 0', () => {
    const r = aggregateChildOverview([child(
      [{ date: '2026-10-25', totalPoints: 10, done: 2, total: 4 }],
      [],
    )], today);
    expect(r.todayDone).toBe(0);
    expect(r.todayTotal).toBe(0);
  });
});

describe('toPendingRedemptionItems', () => {
  const rows = [
    { id: 'r1', user_id: 'c1', reward_name: '看动画片 30 分钟', points: 20, created_at: '2026-10-30T10:00:00Z' },
    { id: 'r2', user_id: 'unknown', reward_name: '冰淇淋', points: 10, created_at: '2026-10-30T09:00:00Z' },
  ];
  const children = [{ id: 'c1', username: '小宝' }];

  it('映射孩子名并按时间倒序排列', () => {
    const items = toPendingRedemptionItems(rows, children);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ id: 'r1', rewardName: '看动画片 30 分钟', points: 20, childName: '小宝', redeemedAt: Date.parse('2026-10-30T10:00:00Z') });
    expect(items[1].childName).toBe('未知孩子');
  });

  it('空输入返回空数组', () => {
    expect(toPendingRedemptionItems([], [])).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `node node_modules/vitest/vitest.mjs run src/utils/__tests__/childOverview.test.ts`
Expected: FAIL（找不到模块）

- [ ] **Step 3: 实现**

```ts
/**
 * 家长中心孩子数据聚合（纯函数）
 * 输入为数据库原始行（fetchChildData 的 dailyRecords/redemptions 字段），
 * 聚合口径：今日进度=当日已完成/当日总数；本周积分=本周一至当日 total_points 之和；
 * 待审核数=status==='pending' 的兑换数。
 */

export interface ChildDailyRecordRow {
  date: string;
  total_points?: number | null;
  tasks?: Array<{ completed?: boolean } | null> | null;
}

export interface ChildRedemptionRow {
  id: string;
  user_id?: string | null;
  reward_name?: string | null;
  points?: number | null;
  status?: string | null;
  created_at?: string | null;
}

export interface ChildDataFragment {
  dailyRecords: ChildDailyRecordRow[];
  redemptions: ChildRedemptionRow[];
}

export interface ChildOverviewTotals {
  todayDone: number;
  todayTotal: number;
  weekPoints: number;
  pendingCount: number;
}

export interface PendingRedemptionItem {
  id: string;
  rewardName: string;
  points: number;
  childName: string;
  redeemedAt: number;
}

/** 本周一的 ISO 日期（周一为一周起点，与 utils/storage.getWeeklyReport 口径一致） */
export const getMondayOf = (today: string): string => {
  const d = new Date(`${today}T00:00:00`);
  const day = d.getDay(); // 0=周日
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
};

export const aggregateChildOverview = (
  childrenData: ChildDataFragment[],
  today: string,
): ChildOverviewTotals => {
  const weekStart = getMondayOf(today);
  let todayDone = 0;
  let todayTotal = 0;
  let weekPoints = 0;
  let pendingCount = 0;

  for (const child of childrenData) {
    for (const rec of child.dailyRecords) {
      const tasks = rec.tasks ?? [];
      const done = tasks.filter(t => t?.completed).length;
      if (rec.date === today) {
        todayDone += done;
        todayTotal += tasks.length;
      }
      if (rec.date >= weekStart && rec.date <= today) {
        weekPoints += rec.total_points || 0;
      }
    }
    pendingCount += child.redemptions.filter(r => r.status === 'pending').length;
  }

  return { todayDone, todayTotal, weekPoints, pendingCount };
};

export const toPendingRedemptionItems = (
  rows: ChildRedemptionRow[],
  children: Array<{ id: string; username: string | null }>,
): PendingRedemptionItem[] =>
  rows
    .map(r => ({
      id: r.id,
      rewardName: r.reward_name || '未知奖品',
      points: r.points || 0,
      childName: children.find(c => c.id === r.user_id)?.username || '未知孩子',
      redeemedAt: Date.parse(r.created_at || '') || 0,
    }))
    .sort((a, b) => b.redeemedAt - a.redeemedAt);
```

- [ ] **Step 4: 运行确认通过**

Run: `node node_modules/vitest/vitest.mjs run src/utils/__tests__/childOverview.test.ts`
Expected: PASS（7 个用例全绿）

- [ ] **Step 5: 提交**

```powershell
git add src/utils/childOverview.ts src/utils/__tests__/childOverview.test.ts
git commit -m "feat(parent): 孩子数据聚合与待审核列表映射纯函数"
```

### Task 5: supabaseApi——跨孩子查询 + 5 个 RPC 封装

**Files:**
- Modify: `src/services/supabaseApi.ts:39`（导出 ProfileRow）
- Modify: `src/services/supabaseApi.ts:25`（新增 type import）
- Modify: `src/services/supabaseApi.ts`（文件末尾追加 API 封装）

- [ ] **Step 1: 导出 ProfileRow 并新增 type import**

第 39 行 `type ProfileRow = ...` 前加 `export`（孩子区组件需要该类型）：

```ts
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
```

第 25 行 `import { loadState } from '@/utils/storage';` 之后加（type-only import，无运行时循环依赖）：

```ts
import type { ChildRedemptionRow } from '@/utils/childOverview';
```

- [ ] **Step 2: 文件末尾追加 API 封装**

```ts
// ============================================
// 家长控制（方案 C）：跨孩子读 + 管理动作 RPC
// ============================================

/** 家长批量读取名下孩子的待审核兑换（读走 RLS） */
export const fetchPendingRedemptions = async (
  childIds: string[],
): Promise<ChildRedemptionRow[]> => {
  if (childIds.length === 0) return [];
  const { data, error } = await supabase
    .from('redemptions')
    .select('id, user_id, reward_name, points, status, created_at')
    .in('user_id', childIds)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchPendingRedemptions error:', error);
    return [];
  }
  return data ?? [];
};

/** 编辑孩子资料（昵称 + 头像 emoji），RPC 内校验亲子关系与昵称占用 */
export const updateChildProfileRpc = (
  childId: string,
  username: string,
  avatar: string | null,
) =>
  supabase.rpc('update_child_profile', {
    p_child_id: childId,
    p_username: username,
    p_avatar: avatar,
  });

/** 重置孩子登录密码（RPC 内同时清除孩子会话，旧登录立即失效） */
export const resetChildPasswordRpc = (childId: string, newPassword: string) =>
  supabase.rpc('reset_child_password', {
    p_child_id: childId,
    p_new_password: newPassword,
  });

/** 解绑孩子（parent_id 置空，账号与数据保留） */
export const unbindChildRpc = (childId: string) =>
  supabase.rpc('unbind_child', { p_child_id: childId });

/** 绑定已有孩子账号（按登录邮箱，RPC 内校验角色/归属/不能绑自己） */
export const bindExistingChildRpc = (childEmail: string) =>
  supabase.rpc('bind_existing_child', { p_child_email: childEmail });

/** 兑换审批：true→fulfilled 且扣积分；false→rejected 冻结退回 */
export const approveRedemptionRpc = (redemptionId: string, approve: boolean) =>
  supabase.rpc('approve_redemption', {
    p_redemption_id: redemptionId,
    p_approve: approve,
  });
```

注意：RPC 的参数名（`p_avatar` 而非 `p_avatar_url`）必须与 Task 1 SQL 一致；调用方解构 `{ error }`，失败时 `error.message` 即 SQL 里的中文 RAISE 信息。

- [ ] **Step 3: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 4: 提交**

```powershell
git add src/services/supabaseApi.ts
git commit -m "feat(parent): 跨孩子查询与管理动作 RPC 封装"
```

### Task 6: ChildDataPanel 孩子只读数据面板组件

**Files:**
- Create: `src/components/parent/ChildDataPanel.tsx`
- 迁出源（只读参考，不改）: `src/views/Children.tsx:92-165`

- [ ] **Step 1: 新建组件**

逻辑与 JSX 自 Children.tsx `renderChildPanel` 原样迁出，仅三处泛化：①用户名改由 props 传入；②「关闭」按钮改为可选回调；③新增加载失败空态 + 重试按钮（规格 §5：读取失败不静默吞错）。

```tsx
import { Star, Award, Flame, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserDataResult } from '@/services/supabaseApi';
import { calculateStreak, getWeeklyReport, getAvailablePoints } from '@/utils/storage';

interface ChildDataPanelProps {
  /** 孩子昵称（来自孩子列表，无需等待数据加载） */
  username: string;
  /** fetchChildData 的结果；null 表示仍在加载或已失败 */
  data: UserDataResult | null;
  /** 加载失败标记（true 且 data 为 null 时显示失败空态 + 重试按钮，而非转圈） */
  error?: boolean;
  /** 重试回调（与 error 配套传入） */
  onRetry?: () => void;
  /** 关闭回调；家长中心内嵌时不传则不渲染关闭按钮 */
  onClose?: () => void;
}

/** 孩子只读数据面板（自 Children.tsx 迁出，家长中心与「我的孩子」页共用） */
export const ChildDataPanel = ({ username, data, error, onRetry, onClose }: ChildDataPanelProps) => {
  if (!data) {
    if (error) {
      return (
        <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
          <div className="text-5xl mb-3">🌩️</div>
          <p className="text-neutral-500 text-sm mb-4">孩子数据加载失败，请检查网络后重试</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="rounded-button">重试</Button>
          )}
        </div>
      );
    }
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
        <p className="text-neutral-500 text-sm">正在加载孩子数据...</p>
      </div>
    );
  }

  // 构建该孩子的 state 以复用统计函数（与 Children.tsx 原逻辑一致）
  const childState = {
    primaryCategories: data.primaryCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📚', key: c.key || 'category', createdAt: 0 })),
    secondaryCategories: data.secondaryCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📖', primaryCategoryId: c.primary_category_id || '', createdAt: 0 })),
    tertiaryCategories: data.tertiaryCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📝', defaultPoints: c.default_points || 1, secondaryCategoryId: c.secondary_category_id || '', createdAt: 0 })),
    tasks: data.tasks.map(t => ({ id: t.id, name: t.name, basePoints: t.base_points || 1, icon: t.icon || '📚', isTemporary: t.is_temporary || false, createdAt: 0 })),
    dailyRecords: data.dailyRecords.map(r => ({ date: r.date, tasks: r.tasks || [], totalPoints: r.total_points || 0 })),
    rewards: data.rewards.map(r => ({ id: r.id, name: r.name, points: r.points, icon: r.icon || '🎁', description: r.description || '', category: (r.category || 'other') as 'entertainment' | 'physical' | 'privilege' | 'other', createdAt: 0 })),
    redemptions: data.redemptions.map(r => ({ id: r.id, rewardId: r.reward_id, rewardName: r.reward_name, points: r.points, redeemedAt: 0, status: r.status || 'approved' })),
    badges: data.badges.map(b => ({ id: b.badge_type as never, name: b.badge_type, description: '', icon: '🏅', unlockedAt: new Date(b.unlocked_at).getTime() })),
    pointAdjustments: data.pointAdjustments.map(a => ({ id: a.id, points: a.points, reason: a.reason, adjustedAt: 0, createdAt: 0 })),
    totalPoints: data.profile?.total_points || 0,
    settings: { soundEnabled: true, lastVisitDate: '', streakThreshold: 0.8, makeupCards: 0, usedMakeupDates: [] },
  } as never;

  const streak = calculateStreak(childState as never);
  const weekly = getWeeklyReport(childState as never);
  const unlockedCount = data.badges.length;
  const available = getAvailablePoints(childState as never);

  return (
    <div className="bg-white rounded-card p-5 shadow-card border border-neutral-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-brand-300 to-brand-500 rounded-full flex items-center justify-center text-3xl ring-2 ring-white">
          {data.profile?.avatar_url || '👧'}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-neutral-800 text-subtitle">{username}</h3>
          <span className="text-caption bg-role-child-soft text-role-child px-2 py-0.5 rounded-badge">孩子档案</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-accent-yellow-300/30 rounded-card p-3 text-center">
          <Star className="w-5 h-5 text-accent-yellow-600 mx-auto mb-1" />
          <div className="text-title font-bold text-accent-yellow-600">{available}</div>
          <div className="text-caption text-neutral-600">可用积分</div>
        </div>
        <div className="bg-role-child-soft rounded-card p-3 text-center">
          <Award className="w-5 h-5 text-role-child mx-auto mb-1" />
          <div className="text-title font-bold text-role-child">{unlockedCount}</div>
          <div className="text-caption text-neutral-600">已获徽章</div>
        </div>
        <div className="bg-accent-orange-300/30 rounded-card p-3 text-center">
          <Flame className="w-5 h-5 text-accent-orange-600 mx-auto mb-1" />
          <div className="text-title font-bold text-accent-orange-600">{streak}</div>
          <div className="text-caption text-neutral-600">连续天数</div>
        </div>
        <div className="bg-accent-green-300/30 rounded-card p-3 text-center">
          <Star className="w-5 h-5 text-accent-green-600 mx-auto mb-1" />
          <div className="text-title font-bold text-accent-green-600">{weekly.thisWeek.completed}</div>
          <div className="text-caption text-neutral-600">本周完成</div>
        </div>
      </div>

      <p className="text-caption text-neutral-400 text-center">
        当前为家长只读视图，孩子使用自己的账号登录操作
      </p>
    </div>
  );
};
```

- [ ] **Step 2: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 3: 提交**

```powershell
git add src/components/parent/ChildDataPanel.tsx
git commit -m "refactor(parent): 孩子数据面板抽为共享组件"
```

### Task 7: ChildManageDialogs 四个管理弹窗

**Files:**
- Create: `src/components/parent/ChildManageDialogs.tsx`

- [ ] **Step 1: 新建弹窗组件文件**

4 个受控弹窗（`open`/`onOpenChange`），全部接 Task 5 的 RPC + Task 3 的校验 + sonner toast；失败提示直接展示 RPC 返回的中文 `error.message`。

```tsx
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
```

- [ ] **Step 2: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 3: 提交**

```powershell
git add src/components/parent/ChildManageDialogs.tsx
git commit -m "feat(parent): 编辑/重置密码/解绑/绑定四个管理弹窗"
```

### Task 8: ChildSection 孩子列表区组件

**Files:**
- Create: `src/components/parent/ChildSection.tsx`

- [ ] **Step 1: 新建组件**

卡片 + ⋯菜单（编辑/重置密码/解绑）+ 数据面板展开 + 绑定入口 + 可选的新建账号弹窗，家长中心与「我的孩子」页共用。新建账号逻辑自 Children.tsx `handleCreateChild`（:36-78）与添加弹窗（:250-292）原样迁入。

```tsx
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

  const openManage = (child: ProfileRow, dialog: 'edit' | 'reset' | 'unbind') => {
    setManageChild(child);
    if (dialog === 'edit') setShowEdit(true);
    else if (dialog === 'reset') setShowReset(true);
    else setShowUnbind(true);
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

      {/* ⋯菜单对应的三个弹窗 */}
      {manageChild && (
        <>
          <EditChildDialog child={manageChild} open={showEdit} onOpenChange={setShowEdit} onDone={onChanged} />
          <ResetPasswordDialog child={manageChild} open={showReset} onOpenChange={setShowReset} onDone={onChanged} />
          <UnbindChildDialog child={manageChild} open={showUnbind} onOpenChange={setShowUnbind} onDone={onChanged} />
        </>
      )}
    </>
  );
};
```

- [ ] **Step 2: 类型检查通过**

Run: `node node_modules/typescript/bin/tsc -b`
Expected: 无输出（0 错误）

- [ ] **Step 3: 提交**

```powershell
git add src/components/parent/ChildSection.tsx
git commit -m "feat(parent): 共享孩子列表区组件（卡片/菜单/面板/绑定）"
```

### Task 9: Children.tsx 薄壳化

**Files:**
- Modify: `src/views/Children.tsx`（整文件替换）

- [ ] **Step 1: 整文件替换为薄壳**

页头与权限守卫保留原样；列表/面板/弹窗全部由 Task 8 的 `ChildSection` 承担（新建账号入口在此页启用）。

```tsx
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

