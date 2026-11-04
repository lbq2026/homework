(some characters truncated)...
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

