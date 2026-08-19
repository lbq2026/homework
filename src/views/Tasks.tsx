import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Edit2, Trash2, X, Check, ChevronRight, ChevronDown, Layers, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

import { TASK_ICONS } from '@/constants/icons';
import { getTodayStr } from '@/utils/date';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/hooks/useAuth.tsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/** 编辑对话框中的分类表单项（兼容一/二/三级分类） */
interface EditFormItem {
  id: string;
  name: string;
  icon: string;
  key?: string;
  primaryCategoryId?: string;
  secondaryCategoryId?: string;
  defaultPoints?: number;
  repeat?: { type: 'none' | 'daily' | 'weekly'; weekdays?: number[] };
}

type DialogType = 
  | 'add-primary' 
  | 'edit-primary' 
  | 'add-secondary' 
  | 'edit-secondary' 
  | 'add-tertiary' 
  | 'edit-tertiary'
  | null;

/** 星期标签 */
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export const Tasks = () => {
  const navigate = useNavigate();
  const { isParent } = useAuth();
  const {
    state,
    toggleTaskCompletion,
    removeTaskFromToday,
    addPrimaryCategory,
    editPrimaryCategory,
    deletePrimaryCategory,
    addSecondaryCategory,
    editSecondaryCategory,
    deleteSecondaryCategory,
    addTertiaryCategory,
    editTertiaryCategory,
    deleteTertiaryCategory,
    addTertiaryCategoryToToday,
    addTemporaryTaskToToday,
    generateTodayTasks,
  } = useAppState();

  const [showTempDialog, setShowTempDialog] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempPoints, setTempPoints] = useState(5);

  const handleToggleTask = (dailyTaskId: string) => {
    toggleTaskCompletion(dailyTaskId);
    const todayRecord = state.dailyRecords.find(r => r.date === today);
    const task = todayRecord?.tasks.find(t => t.id === dailyTaskId);
    if (!task) return;

    const taskDef = state.tasks.find(t => t.id === task.taskId);
    const tertiaryCat = state.tertiaryCategories.find(c => c.id === task.taskId);

    if (!task.completed) {
      if (taskDef) {
        toast.success(`完成任务!`, {
          description: `${taskDef.name} +${taskDef.basePoints} 积分`,
          icon: '⭐',
        });
      } else if (tertiaryCat) {
        toast.success(`完成任务!`, {
          description: `${tertiaryCat.name} +${tertiaryCat.defaultPoints} 积分`,
          icon: '⭐',
        });
      }
    }
  };

  const [activeTab, setActiveTab] = useState<'today' | 'library'>('today');
  const [expandedPrimary, setExpandedPrimary] = useState<string | null>(null);
  const [expandedSecondary, setExpandedSecondary] = useState<string | null>(null);
  
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [editingItem, setEditingItem] = useState<EditFormItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '📚',
    key: 'category',
    primaryCategoryId: '',
    secondaryCategoryId: '',
    defaultPoints: 1,
    repeatType: 'none' as 'none' | 'daily' | 'weekly',
    repeatWeekdays: [] as number[],
  });

  const today = getTodayStr();
  const todayRecord = state.dailyRecords.find(r => r.date === today);
  const todayTasks = todayRecord?.tasks || [];

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '📚',
      key: 'category',
      primaryCategoryId: '',
      secondaryCategoryId: '',
      defaultPoints: 1,
      repeatType: 'none',
      repeatWeekdays: [],
    });
  };

  /** 根据表单的重复规则状态生成 RepeatRule */
  const buildRepeatRule = () => {
    if (formData.repeatType === 'none') return undefined;
    if (formData.repeatType === 'daily') return { type: 'daily' as const };
    return {
      type: 'weekly' as const,
      weekdays: formData.repeatWeekdays.length > 0 ? formData.repeatWeekdays : undefined,
    };
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    switch (dialogType) {
      case 'add-primary':
        addPrimaryCategory({
          name: formData.name,
          icon: formData.icon,
          key: formData.key,
        });
        break;
      case 'edit-primary':
        if (editingItem) {
          editPrimaryCategory(editingItem.id, {
            name: formData.name,
            icon: formData.icon,
            key: formData.key,
          });
        }
        break;
      case 'add-secondary':
        addSecondaryCategory({
          name: formData.name,
          icon: formData.icon,
          primaryCategoryId: formData.primaryCategoryId,
        });
        break;
      case 'edit-secondary':
        if (editingItem) {
          editSecondaryCategory(editingItem.id, {
            name: formData.name,
            icon: formData.icon,
            primaryCategoryId: formData.primaryCategoryId,
          });
        }
        break;
      case 'add-tertiary':
        addTertiaryCategory({
          name: formData.name,
          icon: formData.icon,
          defaultPoints: formData.defaultPoints,
          secondaryCategoryId: formData.secondaryCategoryId,
          repeat: buildRepeatRule(),
        });
        break;
      case 'edit-tertiary':
        if (editingItem) {
          editTertiaryCategory(editingItem.id, {
            name: formData.name,
            icon: formData.icon,
            defaultPoints: formData.defaultPoints,
            repeat: buildRepeatRule(),
          });
        }
        break;
    }

    setDialogType(null);
    setEditingItem(null);
    resetForm();
  };

  const openAddDialog = (type: DialogType, parentId?: string) => {
    resetForm();
    if (type === 'add-secondary' && parentId) {
      setFormData(prev => ({ ...prev, primaryCategoryId: parentId }));
    }
    if (type === 'add-tertiary' && parentId) {
      setFormData(prev => ({ ...prev, secondaryCategoryId: parentId }));
    }
    setDialogType(type);
  };

  const openEditDialog = (type: DialogType, item: EditFormItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      icon: item.icon || '📚',
      key: item.key || 'category',
      primaryCategoryId: item.primaryCategoryId || '',
      secondaryCategoryId: item.secondaryCategoryId || '',
      defaultPoints: item.defaultPoints || 1,
      repeatType: item.repeat?.type || 'none',
      repeatWeekdays: item.repeat?.weekdays || [],
    });
    setDialogType(type);
  };

  const togglePrimary = (id: string) => {
    setExpandedPrimary(expandedPrimary === id ? null : id);
    setExpandedSecondary(null);
  };

  const toggleSecondary = (id: string) => {
    setExpandedSecondary(expandedSecondary === id ? null : id);
  };

  const getTaskById = (taskId: string) => {
    return state.tasks.find(t => t.id === taskId);
  };

  const getTertiaryCategoryById = (id: string) => {
    return state.tertiaryCategories.find(c => c.id === id);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white p-4 shadow-card border-b border-neutral-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold text-neutral-800">作业管理</h1>
        </div>
      </header>

      <div className="flex p-4 gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-3 px-4 rounded-button font-bold transition-all ${
            activeTab === 'today'
              ? 'bg-brand-500 text-white shadow-button'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-100'
          }`}
        >
          今日清单 ({todayTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 px-4 rounded-button font-bold transition-all ${
            activeTab === 'library'
              ? 'bg-brand-500 text-white shadow-button'
              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-100'
          }`}
        >
          <Layers className="w-4 h-4 inline mr-1" />
          分类与作业库
        </button>
      </div>

      <div className="px-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'today' ? (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {todayTasks.length === 0 ? (
                <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="font-medium text-neutral-600 mb-2">今日还没有作业</h3>
                  <p className="text-caption text-neutral-400 mb-4">从作业库中添加任务到今日清单</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => setActiveTab('library')}
                      className="bg-brand-500 hover:bg-brand-400 text-white rounded-button shadow-button"
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      去分类与作业库
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-button"
                      onClick={() => {
                        setTempName('');
                        setTempPoints(5);
                        setShowTempDialog(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      添加临时任务
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {todayTasks.map((dailyTask) => {
                      const task = getTaskById(dailyTask.taskId);
                      if (!task) {
                        const tertiaryCat = getTertiaryCategoryById(dailyTask.taskId);
                        if (!tertiaryCat) return null;
                        return (
                          <motion.div
                            key={dailyTask.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                              dailyTask.completed 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-white border-gray-100 hover:border-blue-200'
                            }`}
                          >
                            <Checkbox
                              checked={dailyTask.completed}
                              onCheckedChange={() => handleToggleTask(dailyTask.id)}
                              className="w-6 h-6 border-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                            />
                            
                            <div className="text-2xl">{tertiaryCat.icon}</div>
                            
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium truncate ${dailyTask.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {tertiaryCat.name}
                              </div>
                              <div className="text-sm text-amber-600">+{tertiaryCat.defaultPoints} 积分</div>
                            </div>
                            
                            {dailyTask.completed && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-green-500"
                              >
                                <Check className="w-5 h-5" />
                              </motion.div>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTaskFromToday(dailyTask.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        );
                      }
                      return (
                        <motion.div
                          key={dailyTask.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                            dailyTask.completed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-white border-gray-100 hover:border-blue-200'
                          }`}
                        >
                          <Checkbox
                            checked={dailyTask.completed}
                            onCheckedChange={() => handleToggleTask(dailyTask.id)}
                            className="w-6 h-6 border-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                          
                          <div className="text-2xl">{task.icon}</div>
                          
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${dailyTask.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {task.name}
                            </div>
                            <div className="text-sm text-amber-600">+{task.basePoints} 积分</div>
                          </div>
                          
                          {dailyTask.completed && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-green-500"
                            >
                              <Check className="w-5 h-5" />
                            </motion.div>
                          )}
                          
                          {isParent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTaskFromToday(dailyTask.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* 一键生成今日清单（按重复规则自动填充） */}
                  <Button
                    variant="outline"
                    className="w-full rounded-button border-dashed border-role-child text-role-child hover:bg-role-child-soft"
                    onClick={async () => {
                      const added = await generateTodayTasks();
                      if (added > 0) {
                        toast.success(`已生成 ${added} 个今日任务`, { icon: '⚡' });
                      } else {
                        toast.info('今日任务已齐全，无需生成');
                      }
                    }}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    一键生成今日清单
                  </Button>

                  {/* 添加临时任务（孩子/家长均可用） */}
                  <Button
                    variant="outline"
                    className="w-full rounded-button border-dashed border-brand-300 text-brand-500 hover:bg-brand-50"
                    onClick={() => {
                      setTempName('');
                      setTempPoints(5);
                      setShowTempDialog(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    添加临时任务
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="library"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {isParent && (
              <Button
                onClick={() => openAddDialog('add-primary')}
                className="w-full mb-4 bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white rounded-button shadow-button py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                添加一级分类
              </Button>
              )}

              {state.primaryCategories.length === 0 ? (
                <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="font-medium text-neutral-600 mb-2">还没有分类</h3>
                  <p className="text-caption text-neutral-400">点击上方按钮添加一级分类</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.primaryCategories.map((primary) => (
                    <div key={primary.id} className="bg-white rounded-card shadow-card border border-neutral-100 overflow-hidden">
                      <div 
                        className="p-4 flex items-center gap-3 cursor-pointer"
                        onClick={() => togglePrimary(primary.id)}
                      >
                        <div className="text-3xl">{primary.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-neutral-800">{primary.name}</div>
                          <div className="text-caption text-neutral-400">
                            {state.secondaryCategories.filter(s => s.primaryCategoryId === primary.id).length} 个二级分类
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isParent && (
                            <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddDialog('add-secondary', primary.id);
                            }}
                            className="text-brand-500 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog('edit-primary', primary);
                            }}
                            className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePrimaryCategory(primary.id);
                            }}
                            className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                            </>
                          )}
                          {expandedPrimary === primary.id ? (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>

                      {expandedPrimary === primary.id && (
                        <div className="border-t border-neutral-100 p-4 bg-neutral-50">
                          {state.secondaryCategories
                            .filter(s => s.primaryCategoryId === primary.id)
                            .map((secondary) => (
                              <div key={secondary.id} className="mb-2 bg-white rounded-card overflow-hidden">
                                <div 
                                  className="p-3 flex items-center gap-2 cursor-pointer"
                                  onClick={() => toggleSecondary(secondary.id)}
                                >
                                  <div className="text-2xl">{secondary.icon}</div>
                                  <div className="flex-1">
                                    <div className="font-medium text-neutral-800 text-body">{secondary.name}</div>
                                    <div className="text-caption text-neutral-400">
                                      {state.tertiaryCategories.filter(t => t.secondaryCategoryId === secondary.id).length} 个三级分类
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {isParent && (
                                      <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAddDialog('add-tertiary', secondary.id);
                                      }}
                                      className="text-brand-500 hover:text-brand-600 hover:bg-brand-50"
                                    >
                                      <PlusCircle className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog('edit-secondary', secondary);
                                      }}
                                      className="text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSecondaryCategory(secondary.id);
                                      }}
                                      className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                      </>
                                    )}
                                    {expandedSecondary === secondary.id ? (
                                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                                    )}
                                  </div>
                                </div>

                                {expandedSecondary === secondary.id && (
                                  <div className="border-t border-neutral-100 p-3 bg-neutral-50">

                                    {state.tertiaryCategories
                                      .filter(t => t.secondaryCategoryId === secondary.id)
                                      .map((tertiary) => (
                                        <div key={tertiary.id} className="mb-2 bg-white rounded-card p-2 flex items-center gap-2">
                                          <div className="text-xl">{tertiary.icon}</div>
                                          <div className="flex-1">
                                            <div className="font-medium text-neutral-800 text-body flex items-center gap-1.5">
                                              {tertiary.name}
                                              {tertiary.repeat?.type === 'daily' && (
                                                <span className="text-caption bg-brand-50 text-brand-500 px-1.5 py-0.5 rounded-badge">每天</span>
                                              )}
                                              {tertiary.repeat?.type === 'weekly' && (
                                                <span className="text-caption bg-role-child-soft text-role-child px-1.5 py-0.5 rounded-badge">
                                                  每周{tertiary.repeat.weekdays?.map(d => `周${WEEKDAY_LABELS[d]}`).join('·')}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-caption text-accent-yellow-600 font-bold">+{tertiary.defaultPoints} 积分</div>
                                          </div>
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
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={dialogType !== null} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'add-primary' && '添加一级分类'}
              {dialogType === 'edit-primary' && '编辑一级分类'}
              {dialogType === 'add-secondary' && '添加二级分类'}
              {dialogType === 'edit-secondary' && '编辑二级分类'}
              {dialogType === 'add-tertiary' && '添加三级分类'}
              {dialogType === 'edit-tertiary' && '编辑三级分类'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入名称"
                className="mt-1"
              />
            </div>

            {(dialogType === 'add-tertiary' || dialogType === 'edit-tertiary') && (
              <div>
                <Label>默认积分</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, defaultPoints: Math.max(1, formData.defaultPoints - 1) })}
                  >
                    -
                  </Button>
                  <span className="text-xl font-bold w-12 text-center">{formData.defaultPoints}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, defaultPoints: formData.defaultPoints + 1 })}
                  >
                    +
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>图标</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {Object.entries(TASK_ICONS).map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl p-2 rounded-lg transition-all flex items-center justify-center min-h-[50px] ${
                      formData.icon === icon 
                        ? 'bg-blue-100 ring-2 ring-blue-500' 
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* 重复规则（仅三级分类） */}
            {(dialogType === 'add-tertiary' || dialogType === 'edit-tertiary') && (
              <div>
                <Label>重复规则</Label>
                <div className="flex gap-2 mt-1">
                  {([
                    { v: 'none', label: '不重复' },
                    { v: 'daily', label: '每天' },
                    { v: 'weekly', label: '每周固定日' },
                  ] as const).map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, repeatType: opt.v }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        formData.repeatType === opt.v
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {formData.repeatType === 'weekly' && (
                  <div className="flex gap-1.5 mt-2">
                    {WEEKDAY_LABELS.map((label, idx) => {
                      const active = formData.repeatWeekdays.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            repeatWeekdays: active
                              ? prev.repeatWeekdays.filter(w => w !== idx)
                              : [...prev.repeatWeekdays, idx],
                          }))}
                          className={`w-9 h-9 rounded-full text-body font-bold transition-all ${
                            active
                              ? 'bg-brand-500 text-white'
                              : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-caption text-neutral-400 mt-2">
                  设置后点击「一键生成今日清单」可自动添加到每日任务
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => {
                setDialogType(null);
                setEditingItem(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-brand-500 hover:bg-brand-400 rounded-button"
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 添加临时任务对话框 */}
      <Dialog open={showTempDialog} onOpenChange={setShowTempDialog}>
        <DialogContent className="sm:max-w-sm rounded-surface">
          <DialogHeader>
            <DialogTitle className="text-center">添加临时任务</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>任务名称</Label>
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="例如：帮妈妈洗碗、整理书桌"
                className="mt-1 rounded-input"
                autoFocus
              />
            </div>
            <div>
              <Label>奖励积分</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTempPoints(Math.max(1, tempPoints - 1))}
                >
                  -
                </Button>
                <span className="text-title font-bold w-12 text-center">{tempPoints}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTempPoints(tempPoints + 1)}
                >
                  +
                </Button>
              </div>
              <p className="text-caption text-neutral-400 mt-2">临时任务只出现在今日清单，不会加入作业库</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-button"
              onClick={() => setShowTempDialog(false)}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-accent-green-400 hover:bg-accent-green-600 rounded-button"
              onClick={() => {
                if (!tempName.trim()) return;
                addTemporaryTaskToToday(tempName.trim(), tempPoints);
                setShowTempDialog(false);
                toast.success('已添加临时任务', { icon: '📝' });
              }}
              disabled={!tempName.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
