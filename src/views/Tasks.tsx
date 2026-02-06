import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeft, Edit2, Trash2, X, Check, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { AppState, Task } from '@/types';
import { TASK_ICONS } from '@/types';

interface TasksProps {
  state: AppState;
  onBack: () => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onEditTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddToToday: (taskId: string) => void;
  onRemoveFromToday: (taskId: string) => void;
}

export const Tasks = ({
  state,
  onBack,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onAddToToday,
  onRemoveFromToday,
}: TasksProps) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'today'>('today');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    basePoints: 1,
    icon: '📚',
    category: 'study' as Task['category'],
  });

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = state.dailyRecords.find(r => r.date === today);
  const todayTaskIds = todayRecord?.tasks.map(t => t.taskId) || [];

  const resetForm = () => {
    setFormData({
      name: '',
      basePoints: 1,
      icon: '📚',
      category: 'study',
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    if (editingTask) {
      onEditTask(editingTask.id, formData);
      setEditingTask(null);
    } else {
      onAddTask(formData);
    }
    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      basePoints: task.basePoints,
      icon: task.icon,
      category: task.category,
    });
    setShowAddDialog(true);
  };

  const categoryLabels = {
    study: '学习',
    sport: '运动',
    art: '艺术',
    other: '其他',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-800">作业管理</h1>
        </div>
      </header>

      {/* 标签切换 */}
      <div className="flex p-4 gap-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'today'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          今日清单 ({todayTaskIds.length})
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
            activeTab === 'library'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          作业库 ({state.tasks.length})
        </button>
      </div>

      {/* 内容区域 */}
      <div className="px-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'today' ? (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {todayTaskIds.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="font-medium text-gray-600 mb-2">今日还没有作业</h3>
                  <p className="text-sm text-gray-400 mb-4">从作业库中添加任务到今日清单</p>
                  <Button
                    onClick={() => setActiveTab('library')}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    去作业库选择
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayTaskIds.map((taskId) => {
                    const task = state.tasks.find(t => t.id === taskId);
                    if (!task) return null;
                    return (
                      <div key={taskId} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className="text-2xl">{task.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{task.name}</div>
                          <div className="text-sm text-amber-600">+{task.basePoints} 积分</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveFromToday(taskId)}
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
              {/* 添加按钮 */}
              <Button
                onClick={() => {
                  setEditingTask(null);
                  resetForm();
                  setShowAddDialog(true);
                }}
                className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                创建新作业
              </Button>

              {state.tasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="font-medium text-gray-600 mb-2">作业库是空的</h3>
                  <p className="text-sm text-gray-400 mb-4">创建你的第一个作业任务</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {state.tasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{task.icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{task.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {categoryLabels[task.category]}
                            </span>
                            <span className="text-xs text-amber-600">+{task.basePoints} 积分</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {todayTaskIds.includes(task.id) ? (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              已添加
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddToToday(task.id)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(task)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 添加/编辑对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? '编辑作业' : '创建新作业'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>作业名称</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：数学练习、阅读30分钟"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>基础积分</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, basePoints: Math.max(1, formData.basePoints - 1) })}
                >
                  -
                </Button>
                <span className="text-xl font-bold w-12 text-center">{formData.basePoints}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, basePoints: formData.basePoints + 1 })}
                >
                  +
                </Button>
              </div>
            </div>
            
            <div>
              <Label>分类</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as Task['category'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="study">📚 学习</SelectItem>
                  <SelectItem value="sport">⚽ 运动</SelectItem>
                  <SelectItem value="art">🎨 艺术</SelectItem>
                  <SelectItem value="other">📌 其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>图标</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {Object.entries(TASK_ICONS).map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`text-2xl p-2 rounded-lg transition-all ${
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
                setShowAddDialog(false);
                setEditingTask(null);
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
              {editingTask ? '保存' : '创建'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
