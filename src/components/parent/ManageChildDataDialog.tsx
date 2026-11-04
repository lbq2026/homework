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
        label: `${t.icon} ${t.name}（${(t.secondary_category_id && secondaryNameById.get(t.secondary_category_id)) || '未归类的二级'}下）`,
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
