import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface PointsDisplayProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
}

export const PointsDisplay = ({ 
  points, 
  size = 'md',
  showAnimation = true 
}: PointsDisplayProps) => {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (points !== displayPoints) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayPoints(points);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [points, displayPoints]);

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  const iconSizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <span className={`${iconSizes[size]} animate-pulse`}>⭐</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={displayPoints}
          className={`${sizeClasses[size]} font-bold text-yellow-300 drop-shadow-lg`}
          initial={showAnimation ? { scale: 0.8, opacity: 0 } : false}
          animate={{ 
            scale: isAnimating && showAnimation ? [1, 1.2, 1] : 1, 
            opacity: 1 
          }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {displayPoints}
        </motion.span>
      </AnimatePresence>
      <span className={`${iconSizes[size]} animate-pulse`}>⭐</span>
    </div>
  );
};
