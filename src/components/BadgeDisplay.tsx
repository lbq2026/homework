import { motion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import type { Badge } from '@/types';

interface BadgeDisplayProps {
  badge: Badge;
  showDetails?: boolean;
  isNew?: boolean;
}

export const BadgeDisplay = ({ 
  badge, 
  showDetails = true,
  isNew = false
}: BadgeDisplayProps) => {
  const isUnlocked = !!badge.unlockedAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={isUnlocked ? { scale: 1.05, rotate: [0, -5, 5, 0] } : {}}
      className={`relative p-4 rounded-2xl border-2 transition-all ${
        isUnlocked 
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-md' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      {isNew && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          新!
        </motion.div>
      )}
      
      <div className="flex flex-col items-center text-center">
        <div className={`text-5xl mb-2 ${isUnlocked ? 'grayscale-0' : 'grayscale opacity-50'}`}>
          {badge.icon}
        </div>
        
        {showDetails && (
          <>
            <h3 className={`font-bold text-sm ${isUnlocked ? 'text-gray-800' : 'text-gray-400'}`}>
              {badge.name}
            </h3>
            <p className={`text-xs mt-1 ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
              {badge.description}
            </p>
            
            {isUnlocked && badge.unlockedAt && (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                {new Date(badge.unlockedAt).toLocaleDateString('zh-CN')} 解锁
              </p>
            )}
            
            {!isUnlocked && (
              <div className="flex items-center gap-1 mt-2 text-gray-400">
                <Lock className="w-3 h-3" />
                <span className="text-xs">未解锁</span>
              </div>
            )}
          </>
        )}
      </div>
      
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(251, 191, 36, 0)',
              '0 0 20px 5px rgba(251, 191, 36, 0.3)',
              '0 0 0 0 rgba(251, 191, 36, 0)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  );
};
