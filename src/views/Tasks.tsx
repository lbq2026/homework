import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Edit2, Trash2, X, Check, ChevronRight, ChevronDown, Layers, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import type { AppState, Task, PrimaryCategory, SecondaryCategory, TertiaryCategory } from '@/types';
import { TASK_ICONS } from '@/types';

interface TasksProps {
  state: AppState;
  onBack: () => void;
  onAddTask?: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onEditTask?: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddToToday?: (taskId: string) => void;
  onRemoveFromToday: (dailyTaskId: string) => void;
  onAddPrimaryCategory?: (category: Omit<PrimaryCategory, 'id' | 'createdAt'>) => void;
  onEditPrimaryCategory?: (categoryId: string, updates: Partial<PrimaryCategory>) => void;
  onDeletePrimaryCategory?: (categoryId: string) => void;
  onAddSecondaryCategory?: (category: Omit<SecondaryCategory, 'id' | 'createdAt'>) => void;
  onEditSecondaryCategory?: (categoryId: string, updates: Partial<SecondaryCategory>) => void;
  onDeleteSecondaryCategory?: (categoryId: string) => void;
  onAddTertiaryCategory?: (category: Omit<TertiaryCategory, 'id' | 'createdAt'>) => void;
  onEditTertiaryCategory?: (categoryId: string, updates: Partial<TertiaryCategory>) => void;
  onDeleteTertiaryCategory?: (categoryId: string) => void;
  onAddTertiaryCategoryToToday?: (tertiaryCategoryId: string) => void;
}

type DialogType = 
  | 'add-primary' 
  | 'edit-primary' 
  | 'add-secondary' 
  | 'edit-secondary' 
  | 'add-tertiary' 
  | 'edit-tertiary'
  | null;

export const Tasks = ({
  state,
  onBack,
  // @ts-ignore: unused
  onAddTask,
  // @ts-ignore: unused
  onEditTask,
  // @ts-ignore: unused
  onDeleteTask,
  // @ts-ignore: unused
  onAddToToday,
  onRemoveFromToday,
  onAddPrimaryCategory,
  onEditPrimaryCategory,
  onDeletePrimaryCategory,
  onAddSecondaryCategory,
  onEditSecondaryCategory,
  onDeleteSecondaryCategory,
  onAddTertiaryCategory,
  onEditTertiaryCategory,
  onDeleteTertiaryCategory,
  onAddTertiaryCategoryToToday,
}: TasksProps) => {
  const [activeTab, setActiveTab] = useState<'today' | 'library'>('today');
  const [expandedPrimary, setExpandedPrimary] = useState<string | null>(null);
  const [expandedSecondary, setExpandedSecondary] = useState<string | null>(null);
  
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    icon: '📚',
    key: 'category',
    primaryCategoryId: '',
    secondaryCategoryId: '',
    defaultPoints: 1,
  });

  const today = new Date().toISOString().split('T')[0];
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
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    switch (dialogType) {
      case 'add-primary':
        onAddPrimaryCategory?.({
          name: formData.name,
          icon: formData.icon,
          key: formData.key,
        });
        break;
      case 'edit-primary':
        if (editingItem) {
          onEditPrimaryCategory?.(editingItem.id, {
            name: formData.name,
            icon: formData.icon,
            key: formData.key,
          });
        }
        break;
      case 'add-secondary':
        onAddSecondaryCategory?.({
          name: formData.name,
          icon: formData.icon,
          primaryCategoryId: formData.primaryCategoryId,
        });
        break;
      case 'edit-secondary':
        if (editingItem) {
          onEditSecondaryCategory?.(editingItem.id, {
            name: formData.name,
            icon: formData.icon,
            primaryCategoryId: formData.primaryCategoryId,
          });
        }
        break;
      case 'add-tertiary':
        onAddTertiaryCategory?.({
          name: formData.name,
          icon: formData.icon,
          defaultPoints: formData.defaultPoints,
          secondaryCategoryId: formData.secondaryCategoryId,
        });
        break;
      case 'edit-tertiary':
        if (editingItem) {
          onEditTertiaryCategory?.(editingItem.id, {
            name: formData.name,
            icon: formData.icon,
            defaultPoints: formData.defaultPoints,
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

  const openEditDialog = (type: DialogType, item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      icon: item.icon || '📚',
      key: item.key || 'category',
      primaryCategoryId: item.primaryCategoryId || '',
      secondaryCategoryId: item.secondaryCategoryId || '',
      defaultPoints: item.defaultPoints || 1,
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

  // @ts-ignore: unused
  const getSecondaryCategoryById = (id: string) => {
    return state.secondaryCategories.find(c => c.id === id);
  };

  // @ts-ignore: unused
  const getPrimaryCategoryById = (id: string) => {
    return state.primaryCategories.find(c => c.id === id);
  };

  // @ts-ignore: unused
  const categoryLabels = {
    study: '学习',
    sport: '运动',
    art: '艺术',
    other: '其他',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">作业管理</h1>
        </div>
      </header>

      <div className="flex p-4 gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          今日清单 ({todayTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'library'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
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
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="font-medium text-gray-600 mb-2">今日还没有作业</h3>
                  <p className="text-sm text-gray-400 mb-4">从作业库中添加任务到今日清单</p>
                  <Button
                    onClick={() => setActiveTab('library')}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    去分类与作业库
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTasks.map((dailyTask) => {
                    const task = getTaskById(dailyTask.taskId);
                    if (!task) {
                      const tertiaryCat = getTertiaryCategoryById(dailyTask.taskId);
                      if (!tertiaryCat) return null;
                      return (
                        <div key={dailyTask.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                          <div className="text-2xl">{tertiaryCat.icon}</div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{tertiaryCat.name}</div>
                            <div className="text-sm text-amber-600">+{tertiaryCat.defaultPoints} 积分</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveFromToday(dailyTask.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    }
                    return (
                      <div key={dailyTask.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className="text-2xl">{task.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{task.name}</div>
                          <div className="text-sm text-amber-600">+{task.basePoints} 积分</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveFromToday(dailyTask.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
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
              <Button
                onClick={() => openAddDialog('add-primary')}
                className="w-full mb-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                添加一级分类
              </Button>

              {state.primaryCategories.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="text-6xl mb-4">📁</div>
                  <h3 className="font-medium text-gray-600 mb-2">还没有分类</h3>
                  <p className="text-sm text-gray-400">点击上方按钮添加一级分类</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.primaryCategories.map((primary) => (
                    <div key={primary.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div 
                        className="p-4 flex items-center gap-3 cursor-pointer"
                        onClick={() => togglePrimary(primary.id)}
                      >
                        <div className="text-3xl">{primary.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{primary.name}</div>
                          <div className="text-xs text-gray-500">
                            {state.secondaryCategories.filter(s => s.primaryCategoryId === primary.id).length} 个二级分类
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddDialog('add-secondary', primary.id);
                            }}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
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
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePrimaryCategory?.(primary.id);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {expandedPrimary === primary.id ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {expandedPrimary === primary.id && (
                        <div className="border-t border-gray-100 p-4 bg-gray-50">
                          {state.secondaryCategories
                            .filter(s => s.primaryCategoryId === primary.id)
                            .map((secondary) => (
                              <div key={secondary.id} className="mb-2 bg-white rounded-lg overflow-hidden">
                                <div 
                                  className="p-3 flex items-center gap-2 cursor-pointer"
                                  onClick={() => toggleSecondary(secondary.id)}
                                >
                                  <div className="text-2xl">{secondary.icon}</div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-800 text-sm">{secondary.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {state.tertiaryCategories.filter(t => t.secondaryCategoryId === secondary.id).length} 个三级分类
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openAddDialog('add-tertiary', secondary.id);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
                                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteSecondaryCategory?.(secondary.id);
                                      }}
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                    {expandedSecondary === secondary.id ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>

                                {expandedSecondary === secondary.id && (
                                  <div className="border-t border-gray-100 p-3 bg-gray-50">

                                    {state.tertiaryCategories
                                      .filter(t => t.secondaryCategoryId === secondary.id)
                                      .map((tertiary) => (
                                        <div key={tertiary.id} className="mb-2 bg-white rounded-lg p-2 flex items-center gap-2">
                                          <div className="text-xl">{tertiary.icon}</div>
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-800 text-sm">{tertiary.name}</div>
                                            <div className="text-xs text-amber-600">+{tertiary.defaultPoints} 积分</div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => onAddTertiaryCategoryToToday?.(tertiary.id)}
                                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditDialog('edit-tertiary', tertiary)}
                                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => onDeleteTertiaryCategory?.(tertiary.id)}
                                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </Button>
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
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setDialogType(null);
                setEditingItem(null);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
            >
              <Check className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
