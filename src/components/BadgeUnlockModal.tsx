import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Badge, BadgeType } from '@/types';

interface BadgeUnlockModalProps {
  badges: BadgeType[];
  allBadges: Badge[];
  onClose: () => void;
}

export const BadgeUnlockModal = ({ badges, allBadges, onClose }: BadgeUnlockModalProps) => {
  if (badges.length === 0) return null;

  const unlockedBadges = allBadges.filter(b => badges.includes(b.id));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4"
            >
              <Trophy className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              恭喜解锁新徽章!
            </h2>
            <p className="text-gray-600">
              太棒了！你获得了 {badges.length} 个新徽章
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {unlockedBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 text-center border-2 border-amber-200"
              >
                <div className="text-4xl mb-2">{badge.icon}</div>
                <h3 className="font-bold text-gray-800 text-sm">{badge.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
              </motion.div>
            ))}
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full py-6 text-lg font-bold"
          >
            太棒了！继续加油！
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
