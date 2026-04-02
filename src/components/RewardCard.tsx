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
    entertainment: 'bg-pink-100 text-pink-700',
    physical: 'bg-amber-100 text-amber-700',
    privilege: 'bg-indigo-100 text-indigo-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`relative p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col h-full ${
        canAfford 
          ? 'bg-white border-blue-200 hover:border-blue-400 shadow-md hover:shadow-lg' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      {!canAfford && (
        <div className="absolute inset-0 bg-gray-100/50 rounded-2xl flex items-center justify-center z-10">
          <div className="bg-white/90 rounded-full p-2 sm:p-3 shadow-lg">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center text-center">
        <div className="text-3xl sm:text-4xl mb-2">{reward.icon}</div>
        <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate w-full">{reward.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mt-1 hidden sm:block">{reward.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[reward.category]}`}>
            {categoryLabels[reward.category]}
          </span>
        </div>
      </div>
      
      <div className="mt-auto flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-amber-500">⭐</span>
          <span className={`font-bold text-lg ${canAfford ? 'text-amber-600' : 'text-gray-400'}`}>
            {reward.points}
          </span>
        </div>
        
        <Button
          onClick={onRedeem}
          disabled={!canAfford}
          size="sm"
          className={`w-full rounded-full text-xs ${
            canAfford 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white' 
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Gift className="w-3 h-3 mr-1" />
          兑换
        </Button>
      </div>
    </motion.div>
  );
};
