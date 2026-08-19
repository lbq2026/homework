import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Flame, Target, Star, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Ticket, ShoppingCart, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { ProgressBar } from '@/components/ProgressBar';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { useAppState } from '@/contexts/AppStateContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getYesterdayStr } from '@/utils/date';
import { isDayAchieved, MAKEUP_CARD_PRICE, getPointsTrend, getWeeklyReport } from '@/utils/storage';

export const Achievements = () => {
  const navigate = useNavigate();
  const { state, getStats, buyMakeupCard, useMakeupCard, availablePoints } = useAppState();
  const stats = getStats();
  const { streak, primaryCategoryStats: categoryStats, totalCompletedTasks } = stats;
  const unlockedBadges = state.badges.filter(b => b.unlockedAt);
  const lockedBadges = state.badges.filter(b => !b.unlockedAt);
  const [expandedPrimaryCat, setExpandedPrimaryCat] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState<'7' | '30'>('7');

  // 成长趋势数据
  const trendData = getPointsTrend(state, Number(trendDays));
  const weeklyReport = getWeeklyReport(state);
  const weekCompletedDelta = weeklyReport.thisWeek.completed - weeklyReport.lastWeek.completed;
  const weekPointsDelta = weeklyReport.thisWeek.points - weeklyReport.lastWeek.points;

  // 补签卡状态
  const makeupCards = state.settings.makeupCards || 0;
  const yesterday = getYesterdayStr();
  const yesterdayAchieved = isDayAchieved(state, yesterday);
  const yesterdayUsed = state.settings.usedMakeupDates?.includes(yesterday) || false;
  const canUseMakeup = makeupCards > 0 && !yesterdayAchieved && !yesterdayUsed;
  const canBuyMakeup = availablePoints >= MAKEUP_CARD_PRICE;

  const handleBuyMakeup = async () => {
    const ok = await buyMakeupCard();
    if (ok) {
      toast.success('购买成功', { description: `补签卡 +1（消耗 ${MAKEUP_CARD_PRICE} 积分）`, icon: '🎫' });
    } else {
      toast.error('购买失败', { description: '积分不足或未登录' });
    }
  };

  const handleUseMakeup = async () => {
    const ok = await useMakeupCard();
    if (ok) {
      toast.success('补签成功', { description: '昨天已补记为达成，连击保住啦！', icon: '🔥' });
    } else {
      toast.error('无法补签', { description: '请确认有补签卡且昨天未达成/未补签' });
    }
  };

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
    <div className="min-h-screen bg-neutral-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-role-child to-accent-purple-400 text-white p-6 rounded-b-surface shadow-card">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-title font-bold">成就徽章</h1>
        </div>
        
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-card p-3 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-1" />
            <div className="text-title font-bold">{unlockedBadges.length}</div>
            <div className="text-caption text-white/80">已获得</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-card p-3 text-center">
            <Flame className="w-6 h-6 mx-auto mb-1" />
            <div className="text-title font-bold">{streak}</div>
            <div className="text-caption text-white/80">连续天数</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-card p-3 text-center">
            <Target className="w-6 h-6 mx-auto mb-1" />
            <div className="text-title font-bold">{totalCompletedTasks}</div>
            <div className="text-caption text-white/80">完成任务</div>
          </div>
        </div>
      </header>

      <div className="p-4 pb-24 space-y-6">
        {/* 下一目标 */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-role-child" />
            <h2 className="font-bold text-neutral-800">下一目标</h2>
          </div>
          <div className="bg-role-child-soft rounded-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-neutral-700">{nextGoal.name}</span>
              <span className="text-body text-role-child font-bold">
                {nextGoal.remaining > 0 ? `还需 ${nextGoal.remaining} 天` : '已完成!'}
              </span>
            </div>
            <ProgressBar progress={nextGoal.progress} size="md" color="from-role-child to-accent-purple-400" />
          </div>
        </section>

        {/* 连击守护（补签卡） */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-accent-yellow-600" />
            <h2 className="font-bold text-neutral-800">连击守护</h2>
            <span className="ml-auto text-caption bg-accent-yellow-300/40 text-accent-yellow-600 px-2 py-0.5 rounded-badge font-bold">
              补签卡 × {makeupCards}
            </span>
          </div>

          <div className="bg-accent-orange-300/20 rounded-card p-4 space-y-3">
            <p className="text-body text-neutral-600">
              {yesterdayAchieved
                ? '✅ 昨天已达成，连击状态良好'
                : yesterdayUsed
                  ? '🔄 昨天已使用补签卡'
                  : streak > 0
                    ? `⚠️ 昨天未达成（完成率不足 80%），用补签卡保住 ${streak} 天连击`
                    : '⚠️ 昨天未达成，用补签卡可以补回连击'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-accent-yellow-300 text-accent-yellow-600 hover:bg-accent-yellow-300/20 rounded-button"
                onClick={handleBuyMakeup}
                disabled={!canBuyMakeup}
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                购买（{MAKEUP_CARD_PRICE}⭐）
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-gradient-to-r from-accent-orange-400 to-accent-yellow-400 hover:from-accent-orange-600 hover:to-accent-yellow-600 text-white rounded-button"
                onClick={handleUseMakeup}
                disabled={!canUseMakeup}
              >
                <Ticket className="w-3.5 h-3.5 mr-1" />
                补签昨天
              </Button>
            </div>
            <p className="text-caption text-neutral-400">
              每天完成 80% 以上任务即算达成；补签卡可用 {availablePoints}⭐ 兑换
            </p>
          </div>
        </section>

        {/* 成长趋势 */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-500" />
              <h2 className="font-bold text-neutral-800">成长趋势</h2>
            </div>
            <div className="flex rounded-input overflow-hidden border border-neutral-200">
              {(['7', '30'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-3 py-1 text-caption font-bold transition-colors ${
                    trendDays === d ? 'bg-brand-500 text-white' : 'bg-white text-neutral-400 hover:bg-neutral-50'
                  }`}
                >
                  近{d}天
                </button>
              ))}
            </div>
          </div>

          <div className="h-48 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                <defs>
                  <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [`${value} 积分`, '获得积分']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="points" stroke="#0EA5E9" strokeWidth={2} fill="url(#pointsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 本周周报 */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-accent-green-600" />
            <h2 className="font-bold text-neutral-800">本周周报</h2>
            <span className="ml-auto text-caption text-neutral-400">
              {weeklyReport.weekStart.slice(5)} ~ {weeklyReport.weekEnd.slice(5)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-accent-green-300/20 rounded-card p-3">
              <div className="text-caption text-neutral-600 mb-1">本周完成任务</div>
              <div className="text-title font-bold text-accent-green-600">
                {weeklyReport.thisWeek.completed}
                <span className="text-body font-normal text-neutral-400 ml-1">/ {weeklyReport.thisWeek.total}</span>
              </div>
              <div className={`text-caption mt-1 flex items-center gap-1 ${
                weekCompletedDelta >= 0 ? 'text-accent-green-600' : 'text-semantic-danger'
              }`}>
                {weekCompletedDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                较上周 {weekCompletedDelta >= 0 ? '+' : ''}{weekCompletedDelta}
              </div>
            </div>
            <div className="bg-accent-yellow-300/30 rounded-card p-3">
              <div className="text-caption text-neutral-600 mb-1">本周获得积分</div>
              <div className="text-title font-bold text-accent-yellow-600">
                {weeklyReport.thisWeek.points}
                <span className="text-body font-normal text-neutral-400 ml-1">⭐</span>
              </div>
              <div className={`text-caption mt-1 flex items-center gap-1 ${
                weekPointsDelta >= 0 ? 'text-accent-green-600' : 'text-semantic-danger'
              }`}>
                {weekPointsDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                较上周 {weekPointsDelta >= 0 ? '+' : ''}{weekPointsDelta}
              </div>
            </div>
          </div>
        </section>

        {/* 分类统计 */}
        <section className="bg-white rounded-card p-4 shadow-card border border-neutral-100">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-accent-yellow-600" />
            <h2 className="font-bold text-neutral-800">作业统计</h2>
          </div>
          
          {primaryCategories.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              暂无统计数据
            </div>
          ) : (
            <div className="space-y-2">
              {primaryCategories.map(([id, primaryCat]) => (
                <div key={id} className="border border-neutral-100 rounded-card overflow-hidden">
                  <button
                    onClick={() => togglePrimaryCategory(id)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-brand-50 to-role-parent-soft hover:from-brand-100 hover:to-role-parent-soft transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{primaryCat.icon}</span>
                      <div className="text-left">
                        <div className="font-medium text-neutral-800">{primaryCat.name}</div>
                        <div className="text-body text-neutral-400">
                          完成 {primaryCat.total} 次
                        </div>
                      </div>
                    </div>
                    {expandedPrimaryCat === id ? (
                      <ChevronUp className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
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
                              className="p-3 bg-neutral-50 rounded-card text-center"
                            >
                              <div className="text-xl mb-1">{secondaryCat.icon}</div>
                              <div className="text-subtitle font-bold text-neutral-700">
                                {secondaryCat.total}
                              </div>
                              <div className="text-caption text-neutral-400">
                                {secondaryCat.name}
                              </div>
                            </div>
                          ))}
                          {Object.keys(primaryCat.secondaryCategories).length === 0 && (
                            <div className="col-span-2 text-center py-4 text-neutral-400 text-body">
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
          <h2 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent-yellow-600" />
            已获得的徽章 ({unlockedBadges.length})
          </h2>
          {unlockedBadges.length === 0 ? (
            <div className="bg-white rounded-card p-8 text-center shadow-card border border-neutral-100">
              <div className="text-6xl mb-4">🏅</div>
              <h3 className="font-medium text-neutral-600 mb-2">还没有获得徽章</h3>
              <p className="text-caption text-neutral-400">坚持完成作业，解锁更多徽章！</p>
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
            <h2 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-neutral-400" />
              待解锁徽章 ({lockedBadges.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 opacity-60">
              {lockedBadges.map((badge) => (
                <BadgeDisplay key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        )}

        {/* 自定义徽章（家长配置） */}
        {state.customBadges.length > 0 && (
          <section>
            <h2 className="font-bold text-neutral-800 mb-3 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-role-child" />
              专属徽章 ({state.customBadges.filter(b => b.unlockedAt).length}/{state.customBadges.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {state.customBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`bg-white rounded-card p-4 text-center shadow-card border-2 ${
                    badge.unlockedAt ? 'border-role-child' : 'border-neutral-100 opacity-60'
                  }`}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-medium text-neutral-800 text-body">{badge.name}</div>
                  <div className="text-caption text-neutral-400 mt-1 line-clamp-2">{badge.description}</div>
                  <div className={`text-caption mt-2 px-2 py-0.5 rounded-badge inline-block font-bold ${
                    badge.unlockedAt ? 'bg-role-child-soft text-role-child' : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    {badge.unlockedAt ? '已解锁 🎉' : '未解锁'}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 激励语 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-accent-yellow-400 to-accent-orange-400 rounded-surface p-6 text-center text-white shadow-button"
        >
          <div className="text-4xl mb-3">🌟</div>
          <h3 className="font-bold text-subtitle mb-2">
            {unlockedBadges.length === 0 
              ? '开始你的徽章收集之旅吧!' 
              : unlockedBadges.length < 5 
                ? '继续加油，解锁更多徽章!' 
                : '太棒了!你是真正的积分王者!'}
          </h3>
          <p className="text-white/80 text-body">
            每完成一个作业，就离目标更近一步
          </p>
        </motion.div>
      </div>
    </div>
  );
};
