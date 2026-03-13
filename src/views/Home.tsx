import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Gift, CheckCircle2, Calendar, Trophy, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProgressBar } from '@/components/ProgressBar';
import { PointsDisplay } from '@/components/PointsDisplay';
import { TaskItem } from '@/components/TaskItem';
import type { AppState, Task } from '@/types';

interface HomeProps {
  state: AppState;
  onAddTask: () => void;
  onRedeem: () => void;
  onAchievements: () => void;
  onSettings: () => void;
  onToggleTask: (taskId: string) => void;
  onCompleteAll: () => void;
  todayProgress: number;
}

export const Home = ({ 
  state, 
  onAddTask, 
  onRedeem,
  onAchievements,
  onSettings,
  onToggleTask,
  onCompleteAll,
  todayProgress,
}: HomeProps) => {
  const today = new Date().toISOString().split('T')[0];
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

  const getTertiaryCategoryById = (id: string) => {
    return state.tertiaryCategories.find(c => c.id === id);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 pb-24">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">小勇士积分王国</h1>
            <div className="flex items-center gap-2 text-blue-100 mt-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{dateInfo.date} {dateInfo.weekday}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onAchievements}
              className="text-white hover:bg-white/20"
            >
              <Trophy className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettings}
              className="text-white hover:bg-white/20"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        {/* 总积分显示 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-blue-100 text-sm mb-1">我的总积分</p>
          <PointsDisplay points={state.totalPoints} size="lg" />
        </div>
      </header>

      {/* 今日进度 */}
      <section className="px-4 mt-6">
        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">今日进度</h2>
            <span className="text-sm text-gray-500">
              {completedCount}/{totalCount} 完成
            </span>
          </div>
          <ProgressBar progress={todayProgress} size="lg" color="from-green-400 to-green-600" />
          
          {totalCount > 0 && completedCount < totalCount && (
            <Button
              onClick={onCompleteAll}
              className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full"
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
          <h2 className="font-bold text-gray-800 text-lg">今日作业清单</h2>
          <Button
            onClick={onAddTask}
            size="sm"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            添加
          </Button>
        </div>
        
        {todayTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-md border border-gray-100">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="font-medium text-gray-600 mb-2">还没有添加今日作业</h3>
            <p className="text-sm text-gray-400 mb-4">点击上方按钮添加作业任务</p>
            <Button
              onClick={onAddTask}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
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
                        onCheckedChange={() => onToggleTask(dailyTask.id)}
                        className="w-6 h-6 border-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      
                      <div className="text-2xl">{tertiaryCat.icon}</div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${dailyTask.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {tertiaryCat.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-amber-600 font-medium">
                            +{tertiaryCat.defaultPoints} 积分
                          </span>
                        </div>
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
                    </motion.div>
                  );
                }
                return (
                  <TaskItem
                    key={dailyTask.id}
                    task={task}
                    completed={dailyTask.completed}
                    onToggle={() => onToggleTask(dailyTask.id)}
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
            onClick={onRedeem}
            className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-lg"
          >
            <Gift className="w-8 h-8 mb-2" />
            <div className="font-bold">兑换奖品</div>
            <div className="text-sm text-white/80">用积分换奖励</div>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAchievements}
            className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-4 text-white shadow-lg"
          >
            <Trophy className="w-8 h-8 mb-2" />
            <div className="font-bold">我的徽章</div>
            <div className="text-sm text-white/80">
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
              className="bg-white rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">太棒了!</h2>
              <p className="text-gray-600">今日作业全部完成!</p>
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
