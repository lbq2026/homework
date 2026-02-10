import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Flame, Target, Star, TrendingUp, X, Calendar, Clock, BookOpen, BarChart3, PieChart, TrendingUp as TrendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { ProgressBar } from '@/components/ProgressBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AppState } from '@/types';

interface AchievementsProps {
  state: AppState;
  onBack: () => void;
  streak: number;
  categoryStats: Record<string, number>;
  totalCompletedTasks: number;
}

// 作业明细项
interface TaskDetail {
  taskName: string;
  category: string;
  points: number;
  completedAt: number;
  date: string;
  icon: string;
}

export const Achievements = ({
  state,
  onBack,
  streak,
  categoryStats,
  totalCompletedTasks,
}: AchievementsProps) => {
  const unlockedBadges = state.badges.filter(b => b.unlockedAt);
  const lockedBadges = state.badges.filter(b => !b.unlockedAt);
  
  // 明细弹窗状态
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // 统计分析弹窗状态
  const [showStatsDialog, setShowStatsDialog] = useState(false);

  // 计算下一目标
  const getNextGoal = () => {
    if (streak < 3) return { name: '连续3天', progress: (streak / 3) * 100, remaining: 3 - streak };
    if (streak < 7) return { name: '连续7天', progress: (streak / 7) * 100, remaining: 7 - streak };
    if (streak < 15) return { name: '连续15天', progress: (streak / 15) * 100, remaining: 15 - streak };
    return { name: '保持连续', progress: 100, remaining: 0 };
  };

  const nextGoal = getNextGoal();
  
  // 生成已完成作业明细
  const generateTaskDetails = (): TaskDetail[] => {
    const details: TaskDetail[] = [];
    
    state.dailyRecords.forEach(record => {
      record.tasks.forEach(task => {
        if (task.completed) {
          const taskDef = state.tasks.find(t => t.id === task.taskId);
          if (taskDef) {
            details.push({
              taskName: taskDef.name,
              category: taskDef.category,
              points: taskDef.basePoints,
              completedAt: task.completedAt || 0,
              date: record.date,
              icon: taskDef.icon,
            });
          }
        }
      });
    });
    
    // 按完成时间倒序排列
    return details.sort((a, b) => b.completedAt - a.completedAt);
  };
  
  // 获取分类明细
  const getCategoryDetails = (category: string) => {
    const allDetails = generateTaskDetails();
    return allDetails.filter(d => d.category === category);
  };
  
  // 打开分类明细
  const openCategoryDetail = (category: string) => {
    setSelectedCategory(category);
    setShowDetailDialog(true);
  };
  
  // 分类标签映射
  const categoryLabels: Record<string, string> = {
    study: '学习',
    sport: '运动',
    art: '艺术',
    other: '其他',
  };
  
  // 分类颜色映射
  const categoryColors: Record<string, { bg: string; text: string; icon: string; gradient: string; border: string }> = {
    study: { bg: 'bg-blue-50', text: 'text-blue-600', icon: '📚', gradient: 'from-blue-400 to-blue-600', border: 'border-blue-200' },
    sport: { bg: 'bg-green-50', text: 'text-green-600', icon: '⚽', gradient: 'from-green-400 to-green-600', border: 'border-green-200' },
    art: { bg: 'bg-purple-50', text: 'text-purple-600', icon: '🎨', gradient: 'from-purple-400 to-purple-600', border: 'border-purple-200' },
    other: { bg: 'bg-gray-50', text: 'text-gray-600', icon: '📌', gradient: 'from-gray-400 to-gray-600', border: 'border-gray-200' },
  };
  
  // 计算各类作业积分统计
  const calculateCategoryPoints = () => {
    const stats: Record<string, { count: number; points: number; percentage: number }> = {
      study: { count: 0, points: 0, percentage: 0 },
      sport: { count: 0, points: 0, percentage: 0 },
      art: { count: 0, points: 0, percentage: 0 },
      other: { count: 0, points: 0, percentage: 0 },
    };
    
    let totalPoints = 0;
    
    state.dailyRecords.forEach(record => {
      record.tasks.forEach(task => {
        if (task.completed) {
          const taskDef = state.tasks.find(t => t.id === task.taskId);
          if (taskDef) {
            stats[taskDef.category].count += 1;
            stats[taskDef.category].points += taskDef.basePoints;
            totalPoints += taskDef.basePoints;
          }
        }
      });
    });
    
    // 计算百分比
    Object.keys(stats).forEach(key => {
      stats[key].percentage = totalPoints > 0 ? Math.round((stats[key].points / totalPoints) * 100) : 0;
    });
    
    return { stats, totalPoints };
  };
  
  // 计算每日完成趋势（最近7天）
  const calculateDailyTrend = () => {
    const trend: { date: string; points: number; count: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const record = state.dailyRecords.find(r => r.date === dateStr);
      trend.push({
        date: dateStr,
        points: record?.totalPoints || 0,
        count: record?.tasks.filter(t => t.completed).length || 0,
      });
    }
    
    return trend;
  };
  
  // 计算各作业（按名称）积分统计
  const calculateTaskStats = () => {
    const taskMap = new Map<string, { 
      name: string; 
      icon: string; 
      category: string;
      count: number; 
      points: number;
    }>();
    
    state.dailyRecords.forEach(record => {
      record.tasks.forEach(task => {
        if (task.completed) {
          const taskDef = state.tasks.find(t => t.id === task.taskId);
          if (taskDef) {
            const existing = taskMap.get(taskDef.name);
            if (existing) {
              existing.count += 1;
              existing.points += taskDef.basePoints;
            } else {
              taskMap.set(taskDef.name, {
                name: taskDef.name,
                icon: taskDef.icon,
                category: taskDef.category,
                count: 1,
                points: taskDef.basePoints,
              });
            }
          }
        }
      });
    });
    
    // 转换为数组并按积分排序
    return Array.from(taskMap.values()).sort((a, b) => b.points - a.points);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">成就徽章</h1>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{unlockedBadges.length}</div>
            <div className="text-xs text-white/80">已获得</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Flame className="w-6 h-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{streak}</div>
            <div className="text-xs text-white/80">连续天数</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Target className="w-6 h-6 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalCompletedTasks}</div>
            <div className="text-xs text-white/80">完成任务</div>
          </div>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {/* 下一目标 */}
        <section className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold text-gray-800">下一目标</h2>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-700">{nextGoal.name}</span>
              <span className="text-sm text-purple-600">
                {nextGoal.remaining > 0 ? `还需 ${nextGoal.remaining} 天` : '已完成!'}
              </span>
            </div>
            <ProgressBar progress={nextGoal.progress} size="md" color="from-purple-400 to-pink-500" />
          </div>
        </section>

        {/* 分类统计 */}
        <section className="bg-white rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="font-bold text-gray-800">作业统计</h2>
            <span className="text-xs text-gray-400 ml-auto">点击卡片查看明细</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openCategoryDetail('study')}
              className="text-center p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <div className="text-2xl mb-1">📚</div>
              <div className="text-xl font-bold text-blue-600">{categoryStats.study}</div>
              <div className="text-xs text-gray-500">学习</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openCategoryDetail('sport')}
              className="text-center p-3 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-colors"
            >
              <div className="text-2xl mb-1">⚽</div>
              <div className="text-xl font-bold text-green-600">{categoryStats.sport}</div>
              <div className="text-xs text-gray-500">运动</div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openCategoryDetail('art')}
              className="text-center p-3 bg-purple-50 rounded-xl cursor-pointer hover:bg-purple-100 transition-colors"
            >
              <div className="text-2xl mb-1">🎨</div>
              <div className="text-xl font-bold text-purple-600">{categoryStats.art}</div>
              <div className="text-xs text-gray-500">艺术</div>
            </motion.button>
          </div>
          
          {/* 查看统计分析按钮 */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowStatsDialog(true)}
            className="w-full mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-center gap-2 text-amber-700 hover:from-amber-100 hover:to-orange-100 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">查看积分统计分析</span>
          </motion.button>
        </section>

        {/* 已获得的徽章 */}
        <section>
          <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            已获得的徽章 ({unlockedBadges.length})
          </h2>
          {unlockedBadges.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-md">
              <div className="text-6xl mb-4">🏅</div>
              <h3 className="font-medium text-gray-600 mb-2">还没有获得徽章</h3>
              <p className="text-sm text-gray-400">坚持完成作业，解锁更多徽章！</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {unlockedBadges.map((badge, index) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <BadgeDisplay badge={badge} />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* 未解锁的徽章 */}
        {lockedBadges.length > 0 && (
          <section>
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-400" />
              待解锁徽章 ({lockedBadges.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-60">
              {lockedBadges.map((badge) => (
                <BadgeDisplay key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        )}

        {/* 激励语 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 text-center text-white"
        >
          <div className="text-4xl mb-3">🌟</div>
          <h3 className="font-bold text-lg mb-2">
            {unlockedBadges.length === 0 
              ? '开始你的徽章收集之旅吧!' 
              : unlockedBadges.length < 5 
                ? '继续加油，解锁更多徽章!' 
                : '太棒了!你是真正的积分王者!'}
          </h3>
          <p className="text-white/80 text-sm">
            每完成一个作业，就离目标更近一步
          </p>
        </motion.div>
      </div>
      
      {/* 作业明细弹窗 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              {selectedCategory && (
                <>
                  <span>{categoryColors[selectedCategory]?.icon}</span>
                  <span>{categoryLabels[selectedCategory]}作业明细</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4">
            {selectedCategory && (
              <>
                {getCategoryDetails(selectedCategory).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📝</div>
                    <p>暂无完成的{categoryLabels[selectedCategory]}作业</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-500 mb-2 flex justify-between">
                      <span>共完成 {getCategoryDetails(selectedCategory).length} 个作业</span>
                      <span>
                        总积分: +
                        {getCategoryDetails(selectedCategory).reduce((sum, d) => sum + d.points, 0)}
                      </span>
                    </div>
                    
                    <AnimatePresence>
                      {getCategoryDetails(selectedCategory).map((detail, index) => (
                        <motion.div
                          key={`${detail.date}-${detail.taskName}-${index}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="bg-gray-50 rounded-xl p-3 flex items-center gap-3"
                        >
                          <div className="text-2xl">{detail.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 truncate">
                              {detail.taskName}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span>{detail.date}</span>
                              <Clock className="w-3 h-3 ml-1" />
                              <span>
                                {detail.completedAt
                                  ? new Date(detail.completedAt).toLocaleTimeString('zh-CN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '--:--'}
                              </span>
                            </div>
                          </div>
                          <div className="text-amber-600 font-bold text-sm">
                            +{detail.points}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDetailDialog(false)}
            >
              <X className="w-4 h-4 mr-2" />
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* 统计分析弹窗 */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-500" />
              <span>作业积分统计分析</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4 space-y-6">
            {(() => {
              const { stats, totalPoints } = calculateCategoryPoints();
              const trend = calculateDailyTrend();
              
              return (
                <>
                  {/* 总览卡片 */}
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-white">
                    <div className="text-center">
                      <div className="text-sm text-white/80 mb-1">作业完成总积分</div>
                      <div className="text-4xl font-bold">{totalPoints}</div>
                      <div className="text-sm text-white/80 mt-2">
                        共完成 {totalCompletedTasks} 个作业
                      </div>
                    </div>
                  </div>
                  
                  {/* 分类积分详情 */}
                  <div>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      分类积分详情
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(stats)
                        .filter(([_, data]) => data.count > 0)
                        .sort((a, b) => b[1].points - a[1].points)
                        .map(([category, data]) => (
                          <motion.div
                            key={category}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 rounded-xl border ${categoryColors[category].border} bg-white`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${categoryColors[category].bg} flex items-center justify-center text-xl`}>
                                {categoryColors[category].icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-800">
                                    {categoryLabels[category]}
                                  </span>
                                  <span className={`font-bold ${categoryColors[category].text}`}>
                                    +{data.points} 积分
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{data.count} 个作业</span>
                                          <span>·</span>
                                          <span>占比 {data.percentage}%</span>
                                        </div>
                                        {/* 进度条 */}
                                        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${data.percentage}%` }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            className={`h-full bg-gradient-to-r ${categoryColors[category].gradient}`}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              {totalPoints === 0 && (
                                <div className="text-center py-6 text-gray-400">
                                  <div className="text-4xl mb-2">📊</div>
                                  <p>还没有完成作业，快去开始吧！</p>
                                </div>
                              )}
                            </div>
                          </div>
                  
                  {/* 各作业积分统计 */}
                  {totalPoints > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        各作业积分统计
                      </h3>
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {(() => {
                          const taskStats = calculateTaskStats();
                          const maxTaskPoints = taskStats.length > 0 ? taskStats[0].points : 1;
                          
                          return (
                            <div className="max-h-[240px] overflow-y-auto">
                              {taskStats.length === 0 ? (
                                <div className="text-center py-6 text-gray-400">
                                  <div className="text-3xl mb-2">📝</div>
                                  <p className="text-sm">暂无作业数据</p>
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100">
                                  {taskStats.map((task, index) => (
                                    <motion.div
                                      key={task.name}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.03 }}
                                      className="p-3 flex items-center gap-3 hover:bg-gray-50"
                                    >
                                      {/* 排名 */}
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        index === 0 ? 'bg-amber-100 text-amber-600' :
                                        index === 1 ? 'bg-gray-100 text-gray-600' :
                                        index === 2 ? 'bg-orange-100 text-orange-600' :
                                        'bg-gray-50 text-gray-400'
                                      }`}>
                                        {index + 1}
                                      </div>
                                      
                                      {/* 图标 */}
                                      <div className="text-xl">{task.icon}</div>
                                      
                                      {/* 作业信息 */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-800 truncate">
                                            {task.name}
                                          </span>
                                          <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[task.category].bg} ${categoryColors[task.category].text}`}>
                                            {categoryLabels[task.category]}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          {/* 进度条背景 */}
                                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <motion.div
                                              initial={{ width: 0 }}
                                              animate={{ width: `${(task.points / maxTaskPoints) * 100}%` }}
                                              transition={{ duration: 0.5, delay: 0.1 + index * 0.03 }}
                                              className={`h-full bg-gradient-to-r ${categoryColors[task.category].gradient}`}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* 统计数据 */}
                                      <div className="text-right">
                                        <div className="font-bold text-amber-600 text-sm">
                                          +{task.points}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {task.count}次
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {/* 最近7天趋势 */}
                  {totalPoints > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <TrendIcon className="w-4 h-4 text-green-500" />
                        最近7天趋势
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-end justify-between h-32 gap-1">
                          {trend.map((day, index) => {
                            const maxPoints = Math.max(...trend.map(d => d.points), 1);
                            const height = day.points > 0 ? (day.points / maxPoints) * 100 : 0;
                            const dayLabel = new Date(day.date).getDate();
                            
                            return (
                              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.05 }}
                                    className={`w-full max-w-[24px] rounded-t ${
                                      day.points > 0 
                                        ? 'bg-gradient-to-t from-blue-400 to-blue-500' 
                                        : 'bg-gray-200'
                                    }`}
                                  />
                                </div>
                                <div className="text-xs text-gray-500">{dayLabel}日</div>
                                {day.points > 0 && (
                                  <div className="text-xs font-bold text-blue-600">+{day.points}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 积分分布饼图示意 */}
                  {totalPoints > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-pink-500" />
                        积分分布
                      </h3>
                      <div className="flex items-center gap-4">
                        {/* 简易饼图 */}
                        <div className="relative w-24 h-24">
                          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                            {Object.entries(stats)
                              .filter(([_, data]) => data.points > 0)
                              .reduce((acc, [category, data]) => {
                                const prevOffset = acc.offset;
                                const dashArray = data.percentage;
                                const circle = (
                                  <circle
                                    key={category}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    strokeWidth="20"
                                    strokeDasharray={`${dashArray} ${100 - dashArray}`}
                                    strokeDashoffset={-prevOffset}
                                    className={`stroke-current ${categoryColors[category].text.replace('text-', 'text-')}`}
                                    style={{
                                      stroke: category === 'study' ? '#3b82f6' : 
                                              category === 'sport' ? '#22c55e' : 
                                              category === 'art' ? '#a855f7' : '#6b7280'
                                    }}
                                  />
                                );
                                return {
                                  elements: [...acc.elements, circle],
                                  offset: prevOffset + dashArray,
                                };
                              }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                          </svg>
                        </div>
                        
                        {/* 图例 */}
                        <div className="flex-1 space-y-1">
                          {Object.entries(stats)
                            .filter(([_, data]) => data.points > 0)
                            .map(([category, data]) => (
                              <div key={category} className="flex items-center gap-2 text-sm">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{
                                    backgroundColor: category === 'study' ? '#3b82f6' : 
                                                    category === 'sport' ? '#22c55e' : 
                                                    category === 'art' ? '#a855f7' : '#6b7280'
                                  }}
                                />
                                <span className="text-gray-600">{categoryLabels[category]}</span>
                                <span className="text-gray-400 ml-auto">{data.percentage}%</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowStatsDialog(false)}
            >
              <X className="w-4 h-4 mr-2" />
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
