import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Star, Trophy, Rocket, ShieldCheck, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/hooks/useAuth';

interface OnboardingModalProps {
  role: UserRole | null;
  onComplete: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}

/** 新手引导：首次登录时展示（4 步），家长/孩子文案区分 */
export const OnboardingModal = ({ role, onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState(0);
  const isParent = role === 'parent';

  const steps: Step[] = isParent
    ? [
        {
          icon: <ClipboardList className="w-10 h-10" />,
          title: '欢迎使用小勇士积分王国',
          desc: '这是一款帮助孩子养成作业习惯的积分激励工具。你作为家长，负责配置任务、设置奖品、审核孩子的兑换申请。',
          accent: 'from-blue-500 to-blue-600',
        },
        {
          icon: <Star className="w-10 h-10" />,
          title: '积分是怎么来的',
          desc: '在「作业」里创建分类和任务，孩子完成后获得积分；你也可以在「我的 → 积分管理」手动加减分（仅家长可见）。',
          accent: 'from-amber-400 to-orange-500',
        },
        {
          icon: <ShieldCheck className="w-10 h-10" />,
          title: '兑换需要你确认',
          desc: '孩子发起兑换后，积分会先冻结。你在「奖品 → 兑换记录」里通过，积分才正式扣减；也可以驳回退还。',
          accent: 'from-green-500 to-emerald-600',
        },
        {
          icon: <Rocket className="w-10 h-10" />,
          title: '开始配置吧',
          desc: '先去「作业」添加任务，再到「奖品」设置奖励，然后就能邀请孩子开始打卡啦！',
          accent: 'from-purple-500 to-pink-500',
        },
      ]
    : [
        {
          icon: <ClipboardList className="w-10 h-10" />,
          title: '欢迎，小勇士！',
          desc: '这里是你的积分王国。每天完成爸爸妈妈布置的作业，就能赚取积分、解锁徽章、兑换奖品！',
          accent: 'from-blue-500 to-blue-600',
        },
        {
          icon: <Star className="w-10 h-10" />,
          title: '赚积分，很简单',
          desc: '打开「首页」查看今日作业清单，完成一项就勾选一项，积分马上到账！',
          accent: 'from-amber-400 to-orange-500',
        },
        {
          icon: <Trophy className="w-10 h-10" />,
          title: '收集专属徽章',
          desc: '坚持打卡、完成任务、积累积分，都能解锁酷炫徽章，快去「成就」页看看还差几个！',
          accent: 'from-purple-500 to-pink-500',
        },
        {
          icon: <GiftIcon />,
          title: '兑换心仪奖品',
          desc: '攒够积分就能在「奖品」页兑换想要的礼物啦！兑换后记得请爸爸妈妈确认哦。',
          accent: 'from-green-500 to-emerald-600',
        },
      ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        {/* 步骤头部渐变 */}
        <div className={`h-40 bg-gradient-to-br ${current.accent} flex items-center justify-center text-white`}>
          {current.icon}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-xl font-bold text-gray-800 mb-2">{current.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{current.desc}</p>
            </motion.div>
          </AnimatePresence>

          {/* 步骤指示器 */}
          <div className="flex justify-center gap-2 my-5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? `w-8 bg-gradient-to-r ${current.accent}` : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(s => s - 1)}
              >
                上一步
              </Button>
            )}
            <Button
              className={`flex-1 bg-gradient-to-r ${current.accent} text-white`}
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(s => s + 1);
                } else {
                  onComplete();
                }
              }}
            >
              {step < steps.length - 1 ? '下一步' : '开始使用'}
            </Button>
          </div>

          {isParent && step === 0 && (
            <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
              <Settings className="w-3 h-3" />
              家长可随时在「设置」中调整
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// 礼物图标（避免与 lucide 命名冲突）
const GiftIcon = () => (
  <span className="text-6xl">🎁</span>
);
