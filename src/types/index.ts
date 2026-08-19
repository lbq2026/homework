// 领域模型类型定义
// 注意：TASK_ICONS / REWARD_ICONS / BADGE_ICONS 图标常量已下沉至 src/constants/icons.ts

// 一级分类
export interface PrimaryCategory {
  id: string;
  name: string;
  icon: string;
  key: string;
  createdAt: number;
}

// 二级分类
export interface SecondaryCategory {
  id: string;
  name: string;
  icon: string;
  primaryCategoryId: string;
  createdAt: number;
}

/** 重复规则类型：none=不重复（仅一次）｜daily=每天｜weekly=每周固定日 */
export type RepeatType = 'none' | 'daily' | 'weekly';

/** 重复规则：weekly 时 weekdays 为星期数组（0=周日 ... 6=周六） */
export interface RepeatRule {
  type: RepeatType;
  weekdays?: number[];
}

// 三级分类
export interface TertiaryCategory {
  id: string;
  name: string;
  icon: string;
  defaultPoints: number;
  secondaryCategoryId: string;
  createdAt: number;
  /** 周期性任务规则（P1-3）：none 默认，daily 每天，weekly 每周固定日 */
  repeat?: RepeatRule;
}

// 作业类型
export interface Task {
  id: string;
  name: string;
  basePoints: number;
  icon: string;
  primaryCategoryId?: string;
  secondaryCategoryId?: string;
  tertiaryCategoryId?: string;
  category?: 'study' | 'sport' | 'art' | 'other';
  isTemporary?: boolean;
  createdAt: number;
}

// 每日作业项
export interface DailyTask {
  id: string;
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
  /** 兑换状态：pending=待家长确认（积分冻结）｜approved=已确认（扣分）｜fulfilled=已兑现｜rejected=已驳回（退还） */
  status?: 'pending' | 'approved' | 'fulfilled' | 'rejected';
}

// 积分调整记录
export interface PointAdjustment {
  id: string;
  points: number;
  reason: string;
  adjustedAt: number;
  createdAt?: number;
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

/** 自定义徽章条件类型（P2-2） */
export type CustomBadgeCondition = 'tasks' | 'points' | 'streak';

// 自定义徽章（家长可配置）
export interface CustomBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  conditionType: CustomBadgeCondition;
  conditionValue: number;
  unlockedAt?: number;
  createdAt: number;
}

// 应用状态
export interface AppState {
  primaryCategories: PrimaryCategory[];
  secondaryCategories: SecondaryCategory[];
  tertiaryCategories: TertiaryCategory[];
  tasks: Task[];
  dailyRecords: DailyRecord[];
  rewards: Reward[];
  redemptions: Redemption[];
  badges: Badge[];
  /** 家长自定义徽章（P2-2） */
  customBadges: CustomBadge[];
  pointAdjustments: PointAdjustment[];
  totalPoints: number;
  settings: {
    soundEnabled: boolean;
    lastVisitDate: string;
    /** 连击达成阈值（0~1，默认 0.8：当天完成率 ≥80% 即视为达成） */
    streakThreshold: number;
    /** 补签卡数量（用积分兑换，可补回一天连击） */
    makeupCards: number;
    /** 已使用补签卡的日期列表 YYYY-MM-DD */
    usedMakeupDates: string[];
    /** 作业提醒开关（PWA 本地通知） */
    remindEnabled: boolean;
    /** 提醒时间 HH:mm */
    remindTime: string;
  };
}
