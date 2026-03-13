import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Flame, Target, Star, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { ProgressBar } from '@/components/ProgressBar';
import type { AppState } from '@/types';
import type { PrimaryCategoryStats } from '@/utils/storage';

interface AchievementsProps {
  state: AppState;
  onBack: () => void;
  streak: number;
  categoryStats: PrimaryCategoryStats;
  totalCompletedTasks: number;
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
  const [expandedPrimaryCat, setExpandedPrimaryCat] = useState<string | null>(null);

  // 计算下一目标
  const getNextGoal = () => {
    if (streak < 3) return { name: '连续3天', progress: (streak / 3) * 100, remaining: 3 - streak };
    if (streak < 7) return { name: '连续7天', progress: (streak / 7) * 100, remaining: 7 - streak };
    if (streak < 15) return { name: '连续15天', progress: (streak / 15) * 100, remaining: 15 - streak };
    return { name: '保持连续', progress: 100, remaining: 0 };
  };

  const nextGoal = getNextGoal();
  const primaryCategories = Object.entries(categoryStats);

  const togglePrimaryCategory = (id: string) => {
    setExpandedPrimaryCat(expandedPrimaryCat === id ? null : id);
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
          </div>
          
          {primaryCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              暂无统计数据
            </div>
          ) : (
            <div className="space-y-2">
              {primaryCategories.map(([id, primaryCat]) => (
                <div key={id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => togglePrimaryCategory(id)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{primaryCat.icon}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-800">{primaryCat.name}</div>
                        <div className="text-sm text-gray-500">
                          完成 {primaryCat.total} 次
                        </div>
                      </div>
                    </div>
                    {expandedPrimaryCat === id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedPrimaryCat === id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-white grid grid-cols-2 gap-3">
                          {Object.entries(primaryCat.secondaryCategories).map(([scId, secondaryCat]) => (
                            <div
                              key={scId}
                              className="p-3 bg-gray-50 rounded-xl text-center"
                            >
                              <div className="text-xl mb-1">{secondaryCat.icon}</div>
                              <div className="text-lg font-bold text-gray-700">
                                {secondaryCat.total}
                              </div>
                              <div className="text-xs text-gray-500">
                                {secondaryCat.name}
                              </div>
                            </div>
                          ))}
                          {Object.keys(primaryCat.secondaryCategories).length === 0 && (
                            <div className="col-span-2 text-center py-4 text-gray-400 text-sm">
                              暂无二级分类
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
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
    </div>
  );
};
