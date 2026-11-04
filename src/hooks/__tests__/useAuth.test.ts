/**
 * useAuth loadRole 去重语义回归测试
 *
 * 回归背景（代码审查 finding-1）：去重标记原先在发起请求前写入，
 * profiles 角色查询连续失败两次后，同一 userId 在整个会话内被短路，
 * 角色永久落空（isParent/isChild 恒为 false）。修复后：仅在成功拿到
 * 角色时写入去重标记，失败不标记，下一个 auth 事件可重新查询自愈。
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  /** profiles.select().eq().single() 链式查询的最终一环 */
  single: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: mocks.signInWithPassword,
    },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          single: mocks.single,
        }),
      }),
    })),
  },
  isSupabaseConfigured: () => true,
}));

import { AuthProvider, useAuth } from '@/hooks/useAuth';

type AuthCtx = ReturnType<typeof useAuth>;

let ctx: AuthCtx | null = null;
let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

const Probe = () => {
  ctx = useAuth();
  return null;
};

const renderProvider = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(createElement(AuthProvider, null, createElement(Probe)));
  });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockLogin = (metadata: Record<string, unknown> = {}) => {
  mocks.signInWithPassword.mockResolvedValue({
    data: { user: { id: 'u1', user_metadata: metadata } },
    error: null,
  });
};

beforeEach(() => {
  ctx = null;
  mocks.single.mockReset();
  mocks.signInWithPassword.mockReset();
});

afterEach(async () => {
  // unmount 本身会触发一次 root 更新，需包裹在 act 内
  if (root) {
    await act(async () => {
      root!.unmount();
    });
  }
  container?.remove();
  root = null;
  container = null;
});

describe('useAuth loadRole 去重语义', () => {
  it('查询连续失败后不锁定标记：下一个触发可重试并自愈', async () => {
    await renderProvider();
    mockLogin();
    mocks.single
      .mockResolvedValueOnce({ data: null, error: { message: 'network down' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'network down' } });

    await act(async () => {
      await ctx!.signIn('e', 'p');
      await sleep(700); // 覆盖 loadRole 内 500ms 重试延迟
    });
    expect(mocks.single).toHaveBeenCalledTimes(2);
    expect(ctx!.role).toBeNull();

    // 网络恢复：同一用户再次触发必须重新查询（旧实现会因标记已写入而直接跳过）
    mocks.single.mockResolvedValue({ data: { role: 'parent' }, error: null });
    await act(async () => {
      await ctx!.signIn('e', 'p');
      await sleep(700);
    });
    expect(mocks.single).toHaveBeenCalledTimes(3);
    expect(ctx!.role).toBe('parent');
    expect(ctx!.isParent).toBe(true);
  });

  it('成功加载后同一用户不再重复查询', async () => {
    await renderProvider();
    mockLogin();
    mocks.single.mockResolvedValue({ data: { role: 'parent' }, error: null });

    await act(async () => {
      await ctx!.signIn('e', 'p');
      await sleep(700);
    });
    expect(ctx!.role).toBe('parent');

    await act(async () => {
      await ctx!.signIn('e', 'p');
      await sleep(100);
    });
    expect(mocks.single).toHaveBeenCalledTimes(1);
    expect(ctx!.role).toBe('parent');
  });

  it('失败时落到注册元数据兜底，且兜底可被后续成功查询覆盖', async () => {
    await renderProvider();
    mockLogin({ role: 'child' });
    mocks.single
      .mockResolvedValueOnce({ data: null, error: { message: 'x' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'x' } });

    await act(async () => {
      await ctx!.signIn('e', 'p');
      await sleep(700);
    });
    expect(ctx!.role).toBe('child');
    expect(ctx!.isChild).toBe(true);

    mocks.single.mockResolvedValue({ data: { role: 'parent' }, error: null });
    await act(async () => {
      await ctx!.signIn('e', 'p');
      await sleep(700);
    });
    expect(mocks.single).toHaveBeenCalledTimes(3);
    expect(ctx!.role).toBe('parent');
  });
});
