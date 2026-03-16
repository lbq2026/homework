import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, ClipboardList, Gift, Trophy, User } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth.tsx';
import { Auth } from '@/views/Auth';
import { Profile } from '@/views/Profile';
import { Home as HomeView } from '@/views/Home';
import { Tasks } from '@/views/Tasks';
import { Rewards } from '@/views/Rewards';
import { Achievements } from '@/views/Achievements';
import { Settings } from '@/views/Settings';
import { PointManagement } from '@/views/PointManagement';
import { BadgeUnlockModal } from '@/components/BadgeUnlockModal';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useSyncedAppState } from '@/hooks/useSyncedAppState';
// import { isSupabaseConfigured } from '@/lib/supabase';

type ViewType = 'home' | 'tasks' | 'rewards' | 'achievements' | 'settings' | 'profile' | 'pointManagement';

// 主应用内容
function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const { user, loading, isConfigured } = useAuth();
  
  // 同步状态管理
  const localState = useSyncedAppState();
  
  // 统计数据
  const stats = localState.getStats();

  // 如果正在加载，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full"
        />
      </div>
    );
  }

  // 如果未登录，显示登录页面
  if (!user && isConfigured) {
    return <Auth onLoginSuccess={() => setCurrentView('home')} />;
  }

  const handleRedeem = async (reward: any) => {
    const success = await localState.redeemReward(reward);
    if (success) {
      toast.success(`成功兑换: ${reward.name}`, {
        description: `消耗 ${reward.points} 积分`,
        icon: '🎉',
      });
    }
    return success;
  };

  const handleToggleTask = (dailyTaskId: string) => {
    localState.toggleTaskCompletion(dailyTaskId);
    const today = new Date().toISOString().split('T')[0];
    const todayRecord = localState.state.dailyRecords.find((r: any) => r.date === today);
    const task = todayRecord?.tasks.find((t: any) => t.id === dailyTaskId);
    if (!task) return;
    
    const taskDef = localState.state.tasks.find((t: any) => t.id === task.taskId);
    const tertiaryCat = localState.state.tertiaryCategories.find((c: any) => c.id === task.taskId);
    
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
    localState.completeAllTasks();
    toast.success('全部完成!', {
      description: '今日作业全部完成，太棒了！',
      icon: '🎉',
    });
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            state={localState.state}
            onAddTask={() => setCurrentView('tasks')}
            onRedeem={() => setCurrentView('rewards')}
            onAchievements={() => setCurrentView('achievements')}
            onSettings={() => setCurrentView('settings')}
            onToggleTask={handleToggleTask}
            onCompleteAll={handleCompleteAll}
            todayProgress={stats.todayProgress}
          />
        );
      case 'tasks':
        return (
          <Tasks
            state={localState.state}
            onBack={() => setCurrentView('home')}
            onAddTask={localState.addTask}
            onEditTask={localState.editTask}
            onDeleteTask={localState.deleteTask}
            onAddToToday={localState.addTaskToToday}
            onRemoveFromToday={localState.removeTaskFromToday}
            onToggleTask={handleToggleTask}
            onAddPrimaryCategory={localState.addPrimaryCategory}
            onEditPrimaryCategory={localState.editPrimaryCategory}
            onDeletePrimaryCategory={localState.deletePrimaryCategory}
            onAddSecondaryCategory={localState.addSecondaryCategory}
            onEditSecondaryCategory={localState.editSecondaryCategory}
            onDeleteSecondaryCategory={localState.deleteSecondaryCategory}
            onAddTertiaryCategory={localState.addTertiaryCategory}
            onEditTertiaryCategory={localState.editTertiaryCategory}
            onDeleteTertiaryCategory={localState.deleteTertiaryCategory}
            onAddTertiaryCategoryToToday={localState.addTertiaryCategoryToToday}
          />
        );
      case 'rewards':
        return (
          <Rewards
            state={localState.state}
            onBack={() => setCurrentView('home')}
            onAddReward={localState.addReward}
            onEditReward={localState.editReward}
            onDeleteReward={localState.deleteReward}
            onRedeem={handleRedeem}
          />
        );
      case 'achievements':
        return (
          <Achievements
            state={localState.state}
            onBack={() => setCurrentView('home')}
            streak={stats.streak}
            categoryStats={stats.primaryCategoryStats}
            totalCompletedTasks={stats.totalCompletedTasks}
          />
        );
      case 'settings':
        return (
          <Settings
            state={localState.state}
            onBack={() => setCurrentView('home')}
            onToggleSound={localState.toggleSound}
            onExport={localState.exportAppData}
            onImport={(data: string) => {
              const success = localState.importAppData(data);
              if (success) toast.success('数据恢复成功!');
              else toast.error('数据格式错误');
              return success;
            }}
            onResetAll={localState.resetAll}
            onResetToday={localState.resetToday}
          />
        );
      case 'profile':
        return <Profile state={localState.state} onBack={() => setCurrentView('home')} onOpenPointManagement={() => setCurrentView('pointManagement')} />;
      case 'pointManagement':
        return (
          <PointManagement
            state={localState.state}
            onBack={() => setCurrentView('profile')}
            onAdjustPoints={localState.adjustPoints}
            onEditPointAdjustment={localState.editPointAdjustment}
            onDeletePointAdjustment={localState.deletePointAdjustment}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <main className="max-w-lg mx-auto bg-white min-h-screen shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 底部导航栏 - 在所有页面显示 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          <NavButton
            icon={<Home className="w-5 h-5" />}
            label="首页"
            active={currentView === 'home'}
            onClick={() => setCurrentView('home')}
          />
          <NavButton
            icon={<ClipboardList className="w-5 h-5" />}
            label="作业"
            active={currentView === 'tasks'}
            onClick={() => setCurrentView('tasks')}
          />
          <NavButton
            icon={<Gift className="w-5 h-5" />}
            label="奖品"
            active={currentView === 'rewards'}
            onClick={() => setCurrentView('rewards')}
          />
          <NavButton
            icon={<Trophy className="w-5 h-5" />}
            label="成就"
            active={currentView === 'achievements'}
            onClick={() => setCurrentView('achievements')}
          />
          <NavButton
            icon={<User className="w-5 h-5" />}
            label="我的"
            active={currentView === 'profile'}
            onClick={() => setCurrentView('profile')}
          />
        </div>
      </nav>

      {/* 徽章解锁弹窗 */}
      <BadgeUnlockModal
        badges={localState.newlyUnlockedBadges}
        allBadges={localState.state.badges}
        onClose={localState.clearNewlyUnlockedBadges}
      />

      {/* Toast 通知 */}
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '1rem',
            padding: '1rem',
          },
        }}
      />
    </div>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
        active
          ? 'text-blue-600 bg-blue-50'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// 主应用组件
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
