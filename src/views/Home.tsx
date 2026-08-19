import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Gift, CheckCircle2, Calendar, Trophy, Settings, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from '@/components/ProgressBar';
import { PointsDisplay } from '@/components/PointsDisplay';
import { TaskItem } from '@/components/TaskItem';
import type { Task } from '@/types';
import { getTodayStr } from '@/utils/date';
import { useAppState } from '@/contexts/AppStateContext';
import { toast } from 'sonner';

export const Home = () => {
  const { state, toggleTaskCompletion, completeAllTasks, getStats } = useAppState();
  const navigate = useNavigate();
  const stats = getStats();
  const today = getTodayStr();
  const todayRecord = state.dailyRecords.find(r => r.date === today);
  const todayTasks = todayRecord?.tasks || [];
  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  
  const [showCelebration, setShowCelebration] = useState(false);
  
  // 检查是否全部完成
  useEffect(() => {
    if (totalCount > 0 && completedCount === totalCount && completedCount > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [completedCount, totalCount]);

  const getTaskById = (taskId: string): Task | undefined => {
    return state.tasks.find(t => t.id === taskId);
  };

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

  const handleCompleteAll = () => {
    completeAllTasks();
    toast.success('全部完成!', {
      description: '今日作业全部完成，太棒了！',
      icon: '🎉',
    });
  };

  const getTertiaryCategoryById = (id: string) => {
    return state.tertiaryCategories.find(c => c.id === id);
  };

  const getSecondaryCategoryById = (id: string) => {
    return state.secondaryCategories.find(c => c.id === id);
  };

  const getPrimaryCategoryById = (id: string) => {
    return state.primaryCategories.find(c => c.id === id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return {
      date: date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
      weekday: weekdays[date.getDay()],
    };
  };

  const dateInfo = formatDate(today);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-brand-400 to-brand-500 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-title font-bold">小勇士积分王国</h1>
            <div className="flex items-center gap-2 text-brand-100 mt-1">
              <Calendar className="w-4 h-4" />
              <span className="text-body">{dateInfo.date} {dateInfo.weekday}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/achievements')}
              className="text-white hover:bg-white/20"
            >
              <Trophy className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* 总积分显示 */}
        <div className="bg-white/15 backdrop-blur-sm rounded-card p-4 text-center">
          <p className="text-brand-100 text-body mb-1">我的总积分</p>
          <PointsDisplay points={state.totalPoints} size="lg" />
        </div>
      </header>

      {/* 今日进度 */}
      <section className="px-4 mt-6">
        <div className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-neutral-800">今日进度</h2>
            <span className="text-caption text-neutral-400">
              {completedCount}/{totalCount} 完成
            </span>
          </div>
          <ProgressBar progress={stats.todayProgress} size="lg" color="from-accent-green-400 to-accent-green-600" />
          
          {totalCount > 0 && completedCount < totalCount && (
            <Button
              onClick={handleCompleteAll}
              className="w-full mt-4 bg-gradient-to-r from-accent-green-400 to-accent-green-600 hover:from-accent-green-600 hover:to-accent-green-600 text-white rounded-button shadow-button"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              一键完成所有作业
            </Button>
          )}
        </div>
      </section>

      {/* 今日作业清单 */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-neutral-800 text-title">今日作业清单</h2>
          <Button
            onClick={() => navigate('/tasks')}
            size="sm"
            className="bg-brand-500 hover:bg-brand-400 text-white rounded-full shadow-button"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加
          </Button>
        </div>
        
        {todayTasks.length === 0 ? (
          <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="font-medium text-neutral-600 mb-2">还没有添加今日作业</h3>
            <p className="text-caption text-neutral-400 mb-4">点击上方按钮添加作业任务</p>
            <Button
              onClick={() => navigate('/tasks')}
              className="bg-brand-500 hover:bg-brand-400 text-white rounded-full shadow-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加作业
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {todayTasks.map((dailyTask) => {
                const task = getTaskById(dailyTask.taskId);
                if (!task) {
                  const tertiaryCat = getTertiaryCategoryById(dailyTask.taskId);
                  if (!tertiaryCat) return null;
                  const secondaryCat = getSecondaryCategoryById(tertiaryCat.secondaryCategoryId);
                  const primaryCat = secondaryCat ? getPrimaryCategoryById(secondaryCat.primaryCategoryId) : undefined;
                  return (
                    <motion.div
                      key={dailyTask.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={`flex items-center gap-3 p-3 rounded-card border-2 transition-all ${
                        dailyTask.completed 
                          ? 'bg-accent-green-300/20 border-accent-green-300' 
                          : 'bg-white border-neutral-100 hover:border-brand-200'
                      }`}
                    >
                      <Checkbox
                        checked={dailyTask.completed}
                        onCheckedChange={() => handleToggleTask(dailyTask.id)}
                        className="w-6 h-6 border-2 data-[state=checked]:bg-accent-green-400 data-[state=checked]:border-accent-green-400"
                      />
                      
                      <div className="text-2xl">{tertiaryCat.icon}</div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${dailyTask.completed ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                          {tertiaryCat.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {primaryCat && (
                            <span className="text-caption px-2 py-0.5 rounded-badge bg-role-parent-soft text-role-parent">
                              {primaryCat.name}
                            </span>
                          )}
                          {secondaryCat && (
                            <span className="text-caption px-2 py-0.5 rounded-badge bg-accent-purple-300/30 text-accent-purple-600">
                              {secondaryCat.name}
                            </span>
                          )}
                          <span className="text-caption px-2 py-0.5 rounded-badge bg-accent-green-300/30 text-accent-green-600">
                            {tertiaryCat.name}
                          </span>
                          <span className="text-caption text-accent-yellow-600 font-bold">
                            +{tertiaryCat.defaultPoints} 积分
                          </span>
                        </div>
                      </div>
                      
                      {dailyTask.completed && (
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
                }
                let primaryCat;
                let secondaryCat;
                let tertiaryCat;
                if (task.tertiaryCategoryId) {
                  tertiaryCat = getTertiaryCategoryById(task.tertiaryCategoryId);
                  if (tertiaryCat) {
                    secondaryCat = getSecondaryCategoryById(tertiaryCat.secondaryCategoryId);
                    if (secondaryCat) {
                      primaryCat = getPrimaryCategoryById(secondaryCat.primaryCategoryId);
                    }
                  }
                } else if (task.secondaryCategoryId) {
                  secondaryCat = getSecondaryCategoryById(task.secondaryCategoryId);
                  if (secondaryCat) {
                    primaryCat = getPrimaryCategoryById(secondaryCat.primaryCategoryId);
                  }
                } else if (task.primaryCategoryId) {
                  primaryCat = getPrimaryCategoryById(task.primaryCategoryId);
                }
                return (
                  <TaskItem
                    key={dailyTask.id}
                    task={task}
                    completed={dailyTask.completed}
                    onToggle={() => handleToggleTask(dailyTask.id)}
                    primaryCategory={primaryCat}
                    secondaryCategory={secondaryCat}
                    tertiaryCategory={tertiaryCat}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* 快捷操作 */}
      <section className="px-4 mt-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/rewards')}
            className="bg-gradient-to-br from-accent-yellow-400 to-accent-orange-400 rounded-surface p-4 text-white shadow-button"
          >
            <Gift className="w-8 h-8 mb-2" />
            <div className="font-bold">兑换奖品</div>
            <div className="text-body text-white/80">用积分换奖励</div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/achievements')}
            className="bg-gradient-to-br from-accent-purple-400 to-role-child rounded-surface p-4 text-white shadow-button"
          >
            <Trophy className="w-8 h-8 mb-2" />
            <div className="font-bold">我的徽章</div>
            <div className="text-body text-white/80">
              {state.badges.filter(b => b.unlockedAt).length} 个徽章
            </div>
          </motion.button>
        </div>
      </section>

      {/* 庆祝动画 */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/20" />
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-surface p-8 shadow-card-hover text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-title font-bold text-neutral-800 mb-2">太棒了!</h2>
              <p className="text-neutral-600">今日作业全部完成!</p>
              <div className="mt-4 text-4xl">⭐ +{todayRecord?.totalPoints || 0}</div>
            </motion.div>
            
            {/* 彩花效果 */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl"
                initial={{ 
                  x: window.innerWidth / 2, 
                  y: window.innerHeight / 2,
                  scale: 0 
                }}
                animate={{ 
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  scale: Math.random() * 1.5 + 0.5,
                  rotate: Math.random() * 360,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              >
                {['🎊', '🎈', '⭐', '✨', '🎉'][Math.floor(Math.random() * 5)]}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
