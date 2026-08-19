import { motion } from 'framer-motion';
import { Check, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Task, PrimaryCategory, SecondaryCategory, TertiaryCategory } from '@/types';

interface TaskItemProps {
  task: Task;
  completed?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  onAddToToday?: () => void;
  isInToday?: boolean;
  showActions?: boolean;
  primaryCategory?: PrimaryCategory;
  secondaryCategory?: SecondaryCategory;
  tertiaryCategory?: TertiaryCategory;
}

export const TaskItem = ({ 
  task, 
  completed = false,
  onToggle,
  onDelete,
  onAddToToday,
  isInToday = false,
  showActions = true,
  primaryCategory,
  secondaryCategory,
  tertiaryCategory,
}: TaskItemProps) => {
  const categoryColors = {
    study: 'bg-role-parent-soft text-role-parent border-role-parent/20',
    sport: 'bg-accent-green-300/30 text-accent-green-600 border-accent-green-300',
    art: 'bg-accent-purple-300/30 text-accent-purple-600 border-accent-purple-300',
    other: 'bg-neutral-100 text-neutral-600 border-neutral-200',
  };

  const categoryLabels = {
    study: '学习',
    sport: '运动',
    art: '艺术',
    other: '其他',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`flex items-center gap-3 p-3 rounded-card border-2 transition-all ${
        completed 
          ? 'bg-accent-green-300/20 border-accent-green-300' 
          : 'bg-white border-neutral-100 hover:border-brand-200'
      }`}
    >
      {onToggle && (
        <Checkbox
          checked={completed}
          onCheckedChange={onToggle}
          className="w-6 h-6 border-2 data-[state=checked]:bg-accent-green-400 data-[state=checked]:border-accent-green-400"
        />
      )}
      
      <div className="text-2xl">{task.icon}</div>
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
          {task.name}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {primaryCategory && (
            <span className="text-caption px-2 py-0.5 rounded-badge bg-role-parent-soft text-role-parent">
              {primaryCategory.name}
            </span>
          )}
          {secondaryCategory && (
            <span className="text-caption px-2 py-0.5 rounded-badge bg-accent-purple-300/30 text-accent-purple-600">
              {secondaryCategory.name}
            </span>
          )}
          {tertiaryCategory && (
            <span className="text-caption px-2 py-0.5 rounded-badge bg-accent-green-300/30 text-accent-green-600">
              {tertiaryCategory.name}
            </span>
          )}
          {!primaryCategory && !secondaryCategory && !tertiaryCategory && task.category && (
            <span className={`text-caption px-2 py-0.5 rounded-badge border ${categoryColors[task.category]}`}>
              {categoryLabels[task.category]}
            </span>
          )}
          <span className="text-caption text-accent-yellow-600 font-bold">
            +{task.basePoints} 积分
          </span>
        </div>
      </div>
      
      {showActions && (
        <div className="flex items-center gap-1">
          {onAddToToday && !isInToday && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddToToday}
              className="text-brand-500 hover:text-brand-600 hover:bg-brand-50"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          {isInToday && (
            <span className="text-caption text-accent-green-600 font-bold px-2">
              已添加
            </span>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-semantic-danger hover:text-semantic-danger hover:bg-semantic-danger-soft"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      
      {completed && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-accent-green-600"
        >
          <Check className="w-5 h-5" />
        </motion.div>
      )}
    </motion.div>
  );
};
