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
