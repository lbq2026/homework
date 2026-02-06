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
  redeemedCount = 0
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
      className={`relative p-4 rounded-2xl border-2 transition-all ${
        canAfford 
          ? 'bg-white border-blue-200 hover:border-blue-400 shadow-md hover:shadow-lg' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      {!canAfford && (
        <div className="absolute inset-0 bg-gray-100/50 rounded-2xl flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-3 shadow-lg">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
        </div>
      )}
      
      <div className="flex items-start gap-3">
        <div className="text-4xl">{reward.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 truncate">{reward.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 mt-1">{reward.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[reward.category]}`}>
              {categoryLabels[reward.category]}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-amber-500">⭐</span>
          <span className={`font-bold ${canAfford ? 'text-amber-600' : 'text-gray-400'}`}>
            {reward.points}
          </span>
        </div>
        
        {redeemedCount > 0 && (
          <span className="text-xs text-gray-500">
            已兑换 {redeemedCount} 次
          </span>
        )}
        
        <Button
          onClick={onRedeem}
          disabled={!canAfford}
          size="sm"
          className={`rounded-full ${
            canAfford 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white' 
              : 'bg-gray-200 text-gray-400'
          }`}
        >
          <Gift className="w-4 h-4 mr-1" />
          兑换
        </Button>
      </div>
    </motion.div>
  );
};
