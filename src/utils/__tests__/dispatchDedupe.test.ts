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
