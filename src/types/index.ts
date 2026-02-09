// 作业类型
export interface Task {
  id: string;
  name: string;
  basePoints: number;
  icon: string;
  category: 'study' | 'sport' | 'art' | 'other';
  createdAt: number;
}

// 每日作业项
export interface DailyTask {
  taskId: string;
  completed: boolean;
  completedAt?: number;
}

// 每日记录
export interface DailyRecord {
  date: string; // YYYY-MM-DD
  tasks: DailyTask[];
  totalPoints: number;
}

// 奖品
export interface Reward {
  id: string;
  name: string;
  points: number;
  icon: string;
  description: string;
  category: 'entertainment' | 'physical' | 'privilege' | 'other';
  createdAt: number;
}

// 兑换记录
export interface Redemption {
  id: string;
  rewardId: string;
  rewardName: string;
  points: number;
  redeemedAt: number;
}

// 积分调整记录（手动增减积分）
export interface PointAdjustment {
  id: string;
  points: number;  // 正数为加分，负数为扣分
  reason: string;  // 调整原因
  createdAt: number;
}

// 徽章类型
export type BadgeType = 
  | 'streak_3' | 'streak_7' | 'streak_15'
  | 'sport_master' | 'study_master' | 'art_master'
  | 'points_50' | 'points_100' | 'points_200' | 'points_500'
  | 'first_reward' | 'task_master';

// 徽章
export interface Badge {
  id: BadgeType;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

// 应用状态
export interface AppState {
  tasks: Task[];
  dailyRecords: DailyRecord[];
  rewards: Reward[];
  redemptions: Redemption[];
  badges: Badge[];
  pointAdjustments: PointAdjustment[];  // 积分调整记录
  totalPoints: number;
  settings: {
    soundEnabled: boolean;
    lastVisitDate: string;
  };
}

// 图标类型
export const TASK_ICONS = {
  book: '📚',
  pencil: '✏️',
  calculator: '🔢',
  sport: '⚽',
  run: '🏃',
  jump: '⛹️',
  art: '🎨',
  music: '🎵',
  game: '🎮',
  star: '⭐',
  trophy: '🏆',
  medal: '🥇',
  target: '🎯',
  rocket: '🚀',
  diamond: '💎',
  gift: '🎁',
  cookie: '🍪',
  icecream: '🍦',
  toy: '🧸',
  car: '🚗',
  bike: '🚴',
  swim: '🏊',
  basketball: '🏀',
  football: '🏈',
};

export const REWARD_ICONS = {
  tv: '📺',
  game: '🎮',
  park: '🌳',
  toy: '🧸',
  candy: '🍬',
  icecream: '🍦',
  movie: '🎬',
  book: '📖',
  trip: '🚗',
  pizza: '🍕',
  burger: '🍔',
  popcorn: '🍿',
  balloon: '🎈',
  party: '🎉',
  shopping: '🛍️',
  sleep: '😴',
  phone: '📱',
  computer: '💻',
};

export const BADGE_ICONS: Record<BadgeType, string> = {
  streak_3: '🔥',
  streak_7: '🔥🔥',
  streak_15: '🔥🔥🔥',
  sport_master: '⚽',
  study_master: '📚',
  art_master: '🎨',
  points_50: '💰',
  points_100: '💎',
  points_200: '👑',
  points_500: '🏆',
  first_reward: '🎁',
  task_master: '⭐',
};
