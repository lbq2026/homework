import { motion } from 'framer-motion';
import { Gift, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Reward } from '@/types';

interface RewardCardProps {
  reward: Reward;
  userPoints: number;
  onRedeem: () => void;
  redeemedCount?: number;
}

export const RewardCard = ({ 
  reward, 
  userPoints, 
  onRedeem,
  redeemedCount: _redeemedCount = 0,
}: RewardCardProps) => {
  const canAfford = userPoints >= reward.points;
  const categoryLabels: Record<string, string> = {
    entertainment: '娱乐',
    physical: '实物',
    privilege: '特权',
    other: '其他',
  };

  const categoryColors: Record<string, string> = {
    entertainment: 'bg-role-child-soft text-role-child',
    physical: 'bg-accent-yellow-300/40 text-accent-yellow-600',
    privilege: 'bg-accent-purple-300/30 text-accent-purple-600',
    other: 'bg-neutral-100 text-neutral-600',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-3 sm:p-4 rounded-card border-2 transition-all flex flex-col h-full ${
        canAfford 
          ? 'bg-white border-brand-200 hover:border-brand-400 shadow-card hover:shadow-card-hover' 
          : 'bg-neutral-50 border-neutral-200'
      }`}
    >
      {!canAfford && (
        <div className="absolute inset-0 bg-neutral-100/50 rounded-card flex items-center justify-center z-10">
          <div className="bg-white/90 rounded-full p-2 sm:p-3 shadow-card">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center text-center">
        <div className="text-3xl sm:text-4xl mb-2">{reward.icon}</div>
        <h3 className="font-bold text-neutral-800 text-body sm:text-subtitle truncate w-full">{reward.name}</h3>
        <p className="text-caption text-neutral-400 line-clamp-2 mt-1 hidden sm:block">{reward.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-caption px-2 py-0.5 rounded-badge ${categoryColors[reward.category]}`}>
            {categoryLabels[reward.category]}
          </span>
        </div>
      </div>
      
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-accent-yellow-400">⭐</span>
          <span className={`font-bold text-subtitle ${canAfford ? 'text-accent-yellow-600' : 'text-neutral-400'}`}>
            {reward.points}
          </span>
        </div>
        
        <Button
          onClick={onRedeem}
          disabled={!canAfford}
          size="sm"
          className={`w-full rounded-button text-caption ${
            canAfford 
              ? 'bg-gradient-to-r from-brand-400 to-brand-500 hover:from-brand-500 hover:to-brand-600 text-white' 
              : 'bg-neutral-200 text-neutral-400'
          }`}
        >
          <Gift className="w-3 h-3 mr-1" />
          兑换
        </Button>
      </div>
    </motion.div>
  );
};
