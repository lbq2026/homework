/** 积分调整相关的纯计算规则（供积分管理页复用，便于单测） */

/** 扣分：返回实际写入的负数积分；不超过孩子当前积分，非法输入返回 0 */
export const clampDeduction = (input: number, childTotal: number): number => {
  if (!Number.isFinite(input) || input <= 0) return 0;
  const cap = Math.max(0, childTotal);
  if (cap === 0) return 0;
  return -Math.min(input, cap);
};

/** 编辑记录：替换原记录后孩子积分不能为负 */
export const canApplyEdit = (childTotal: number, oldPoints: number, newPoints: number): boolean =>
  childTotal - oldPoints + newPoints >= 0;

/** 编辑后最多还能扣多少分（提示文案用） */
export const getMaxEditableDeduction = (childTotal: number, oldPoints: number): number =>
  Math.max(0, childTotal + oldPoints);

/** 默认选中第一个孩子；零孩子返回 null */
export const pickInitialChildId = (children: ReadonlyArray<{ id: string }>): string | null =>
  (children.length > 0 ? children[0].id : null);
