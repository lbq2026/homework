import { motion } from 'framer-motion';
import { Check, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Task } from '@/types';

interface TaskItemProps {
  task: Task;
  completed?: boolean;
  onToggle?: () => void;
  onDelete?: () => void;
  onAddToToday?: () => void;
  isInToday?: boolean;
  showActions?: boolean;
}

export const TaskItem = ({ 
  task, 
  completed = false,
  onToggle,
  onDelete,
  onAddToToday,
  isInToday = false,
  showActions = true,
}: TaskItemProps) => {
  const categoryColors = {
    study: 'bg-blue-100 text-blue-700 border-blue-200',
    sport: 'bg-green-100 text-green-700 border-green-200',
    art: 'bg-purple-100 text-purple-700 border-purple-200',
    other: 'bg-gray-100 text-gray-700 border-gray-200',
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
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        completed 
          ? 'bg-green-50 border-green-200' 
          : 'bg-white border-gray-100 hover:border-blue-200'
      }`}
    >
      {onToggle && (
        <Checkbox
          checked={completed}
          onCheckedChange={onToggle}
          className="w-6 h-6 border-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
        />
      )}
      
      <div className="text-2xl">{task.icon}</div>
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium truncate ${completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.name}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {task.category && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryColors[task.category]}`}>
              {categoryLabels[task.category]}
            </span>
          )}
          <span className="text-xs text-amber-600 font-medium">
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
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
          {isInToday && (
            <span className="text-xs text-green-600 font-medium px-2">
              已添加
            </span>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
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
          className="text-green-500"
        >
          <Check className="w-5 h-5" />
        </motion.div>
      )}
    </motion.div>
  );
};
