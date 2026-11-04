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
