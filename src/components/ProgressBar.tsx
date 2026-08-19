import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  color?: string;
}

export const ProgressBar = ({ 
  progress, 
  size = 'md', 
  showPercentage = true,
  color = 'from-blue-400 to-blue-600'
}: ProgressBarProps) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-8',
  };

  return (
    <div className="w-full">
      <div className={`relative w-full ${sizeClasses[size]} bg-gray-200 rounded-full overflow-hidden`}>
        <motion.div
          className={`absolute left-0 top-0 h-full bg-gradient-to-r ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {showPercentage && size === 'lg' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-sm drop-shadow-md">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
      {showPercentage && size !== 'lg' && (
        <div className="text-right mt-1">
          <span className="text-sm font-medium text-gray-600">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};
