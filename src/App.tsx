import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ClipboardList, Gift, Trophy, User } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuth.tsx';
import { useReminder } from '@/hooks/useReminder';
import { Auth } from '@/views/Auth';
import { BadgeUnlockModal } from '@/components/BadgeUnlockModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { Toaster } from '@/components/ui/sonner';
import { AppStateProvider, useAppState } from '@/contexts/AppStateContext';

// 路由级代码分割：各页面按需加载（视图为命名导出，映射为 default）
const HomeView = lazy(() => import('@/views/Home').then(m => ({ default: m.Home })));
const Tasks = lazy(() => import('@/views/Tasks').then(m => ({ default: m.Tasks })));
const Rewards = lazy(() => import('@/views/Rewards').then(m => ({ default: m.Rewards })));
const Achievements = lazy(() => import('@/views/Achievements').then(m => ({ default: m.Achievements })));
const Settings = lazy(() => import('@/views/Settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('@/views/Profile').then(m => ({ default: m.Profile })));
const PointManagement = lazy(() => import('@/views/PointManagement').then(m => ({ default: m.PointManagement })));
const ResetPassword = lazy(() => import('@/views/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Children = lazy(() => import('@/views/Children').then(m => ({ default: m.Children })));
const Privacy = lazy(() => import('@/views/Privacy').then(m => ({ default: m.Privacy })));
const Badges = lazy(() => import('@/views/Badges').then(m => ({ default: m.Badges })));
const ParentDashboard = lazy(() => import('@/views/ParentDashboard').then(m => ({ default: m.ParentDashboard })));

// 页面切换动画包装
const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

// 路由表（Suspense 加载态 + 过渡动画）
function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full"
          />
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<PageTransition><HomeView /></PageTransition>} />
        <Route path="/tasks" element={<PageTransition><Tasks /></PageTransition>} />
        <Route path="/rewards" element={<PageTransition><Rewards /></PageTransition>} />
        <Route path="/achievements" element={<PageTransition><Achievements /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/profile/points" element={<PageTransition><PointManagement /></PageTransition>} />
        <Route path="/profile/children" element={<PageTransition><Children /></PageTransition>} />
        <Route path="/profile/badges" element={<PageTransition><Badges /></PageTransition>} />
        <Route path="/parent" element={<PageTransition><ParentDashboard /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

// 主应用内容
function AppContent() {
  const { user, loading, isConfigured, role } = useAuth();
  const { newlyUnlockedBadges, state, clearNewlyUnlockedBadges } = useAppState();
  const location = useLocation();
  // 本地作业提醒（仅在登录后启用）
  useReminder(state, state.settings.remindEnabled, state.settings.remindTime);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return !localStorage.getItem('littleWarriorKingdom_onboarded');
    } catch {
      return false;
    }
  });

  const completeOnboarding = () => {
    try {
      localStorage.setItem('littleWarriorKingdom_onboarded', '1');
    } catch {
      // ignore storage errors
    }
    setShowOnboarding(false);
  };

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

  // 密码重置页无需登录，直接渲染（绕过认证守卫）
  const isResetPage = location.pathname.startsWith('/reset-password');

  // 如果未登录，显示登录页面
  if (!user && isConfigured && !isResetPage) {
    return <Auth onLoginSuccess={() => window.location.replace('/')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主内容区域 */}
      <main className="max-w-lg mx-auto bg-white min-h-screen shadow-xl">
        <AppRoutes />
      </main>

      {/* 底部导航栏 - 在所有页面显示 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          <NavButton to="/" icon={<Home className="w-5 h-5" />} label="首页" />
          <NavButton to="/tasks" icon={<ClipboardList className="w-5 h-5" />} label="作业" />
          <NavButton to="/rewards" icon={<Gift className="w-5 h-5" />} label="奖品" />
          <NavButton to="/achievements" icon={<Trophy className="w-5 h-5" />} label="成就" />
          <NavButton to="/profile" icon={<User className="w-5 h-5" />} label="我的" />
        </div>
      </nav>

      {/* 徽章解锁弹窗 */}
      <BadgeUnlockModal
        badges={newlyUnlockedBadges}
        allBadges={state.badges}
        onClose={clearNewlyUnlockedBadges}
      />

      {/* 新手引导（首次登录） */}
      {showOnboarding && user && (
        <OnboardingModal role={role} onComplete={completeOnboarding} />
      )}

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
  to: string;
  icon: React.ReactNode;
  label: string;
}

// 底部导航按钮（基于路由 active 状态高亮）
function NavButton({ to, icon, label }: NavButtonProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
          isActive
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`
      }
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}

// 主应用组件
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppStateProvider>
          <AppContent />
        </AppStateProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
