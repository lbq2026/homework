import { describe, expect, it } from 'vitest';
import {
  canApplyEdit,
  clampDeduction,
  getMaxEditableDeduction,
  pickInitialChildId,
} from '../pointAdjustment';

describe('clampDeduction', () => {
  it('正常扣分返回负值', () => {
    expect(clampDeduction(5, 100)).toBe(-5);
  });

  it('超过孩子积分时截断到孩子积分', () => {
    expect(clampDeduction(50, 10)).toBe(-10);
  });

  it('孩子积分为 0 时不可扣', () => {
    expect(clampDeduction(5, 0)).toBe(0);
  });

  it('非法输入返回 0', () => {
    expect(clampDeduction(-3, 10)).toBe(0);
    expect(clampDeduction(Number.NaN, 10)).toBe(0);
  });
});

describe('canApplyEdit', () => {
  it('编辑后仍为非负允许', () => {
    expect(canApplyEdit(10, -5, -5)).toBe(true);
  });

  it('编辑后为负拒绝', () => {
    expect(canApplyEdit(10, -5, -20)).toBe(false);
  });

  it('改为加分永远允许', () => {
    expect(canApplyEdit(0, -5, 3)).toBe(true);
  });
});

describe('getMaxEditableDeduction', () => {
  it('当前 10 分、原记录 -5，最多可改成扣 5 分', () => {
    expect(getMaxEditableDeduction(10, -5)).toBe(5);
  });

  it('原记录为加分时，上限为当前积分加原加分', () => {
    expect(getMaxEditableDeduction(10, 5)).toBe(15);
  });

  it('不会返回负数', () => {
    expect(getMaxEditableDeduction(0, -10)).toBe(0);
  });
});

describe('pickInitialChildId', () => {
  it('无孩子返回 null', () => {
    expect(pickInitialChildId([])).toBeNull();
  });

  it('单孩子返回其 id', () => {
    expect(pickInitialChildId([{ id: 'a' }])).toBe('a');
  });

  it('多孩子默认第一个', () => {
    expect(pickInitialChildId([{ id: 'a' }, { id: 'b' }])).toBe('a');
  });
});
