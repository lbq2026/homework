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

// 三级分类
export interface TertiaryCategory {
  id: string;
  name: string;
  icon: string;
  defaultPoints: number;
  secondaryCategoryId: string;
  createdAt: number;
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
  pointAdjustments: PointAdjustment[];
  totalPoints: number;
  settings: {
    soundEnabled: boolean;
    lastVisitDate: string;
  };
}

// 图标类型
export const TASK_ICONS = {
  book: '📚',
  notebook: '📓',
  pencil: '✏️',
  pen: '🖊️',
  calculator: '🔢',
  reading: '📖',
  writing: '✍️',
  language: '💬',
  science: '🔬',
  history: '📜',
  geography: '🌍',
  art: '🎨',
  music: '🎵',
  piano: '🎹',
  guitar: '🎸',
  dance: '💃',
  sport: '⚽',
  run: '🏃',
  jump: '⛹️',
  basketball: '🏀',
  football: '🏈',
  tennis: '🎾',
  badminton: '🏸',
  swim: '🏊',
  bike: '🚴',
  yoga: '🧘',
  workout: '🏋️',
  star: '⭐',
  trophy: '🏆',
  medal: '🥇',
  target: '🎯',
  rocket: '🚀',
  diamond: '💎',
  brain: '🧠',
  lightbulb: '💡',
  rainbow: '🌈',
  sun: '☀️',
  moon: '🌙',
  flower: '🌸',
  tree: '🌳',
  animal: '🐱',
  dog: '🐶',
  butterfly: '🦋',
  robot: '🤖',
  unicorn: '🦄',
  dragon: '🐉',
  heart: '❤️',
  smile: '😊',
  cool: '😎',
  leaf: '🍃',
  snowflake: '❄️',
  fire: '🔥',
  lightning: '⚡',
  balloon: '🎈',
  cake: '🎂',
  icecream: '🍦',
  pizza: '🍕',
  apple: '🍎',
  orange: '🍊',
  banana: '🍌',
  grape: '🍇',
  watermelon: '🍉',
  strawberry: '🍓',
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
  soccer: '⚽',
  basketball: '🏀',
  swimming: '🏊',
  bike: '🚴',
  drawing: '🎨',
  music: '🎵',
  guitar: '🎸',
  puzzle: '🧩',
  robot: '🤖',
  dinosaur: '🦕',
  unicorn: '🦄',
  rocket: '🚀',
  spaceship: '🛸',
  star: '⭐',
  crown: '👑',
  gem: '💎',
  medal: '🏅',
  trophy: '🏆',
  rainbow: '🌈',
  sun: '☀️',
  moon: '🌙',
  flower: '🌸',
  butterfly: '🦋',
  cat: '🐱',
  dog: '🐶',
  rabbit: '🐰',
  bear: '🐻',
  panda: '🐼',
  icecream2: '🍨',
  donut: '🍩',
  cookie: '🍪',
  cake: '🎂',
  cupcake: '🧁',
  juice: '🧃',
  milk: '🥛',
  apple: '🍎',
  banana: '🍌',
  orange: '🍊',
  grapes: '🍇',
  watermelon: '🍉',
  strawberry: '🍓',
  blueberry: '🫐',
  cherry: '🍒',
  peach: '🍑',
  mango: '🥭',
  pineapple: '🍍',
  coconut: '🥥',
  boardgame: '🎲',
  chess: '♟️',
  lego: '🧱',
  car_toy: '🚗',
  plane_toy: '✈️',
  train_toy: '🚂',
  doll: '🪆',
  action_figure: '🦸',
  video_game: '🎮',
  arcade: '🕹️',
  cinema: '🎬',
  film: '🎞️',
  soda: '🥤',
  fries: '🍟',
  hotdog: '🌭',
  ice_cream_sundae: '🍧',
  candy_cane: '🍭',
  chocolate: '🍫',
  lollipop: '🍬',
  gift: '🎁',
  gift2: '🎀',
  magic_wand: '🪄',
  crystal_ball: '🔮',
  wand: '✨',
  sparkles: '🌟',
  fireworks: '🎆',
  sparkler: '🎇',
  beach: '🏖️',
  mountain: '🏔️',
  forest: '🌲',
  camping: '🏕️',
  tent: '⛺',
  smartphone: '📱',
  tablet: '📱',
  headphones: '🎧',
  speaker: '🔊',
  microphone: '🎤',
  drum: '🥁',
  piano: '🎹',
  violin: '🎻',
  trumpet: '🎺',
  saxophone: '🎷',
  art_supplies: '🎨',
  crayon: '🖍️',
  skateboard: '🛹',
  scooter: '🛴',
  roller_skates: '🛼',
  ice_skates: '⛸️',
  bowling: '🎳',
  pool: '🎱',
  darts: '🎯',
  archery: '🏹',
  fishing: '🎣',
  golf: '⛳',
  hockey: '🏒',
  boxing: '🥊',
  martial_arts: '🥋',
  surfing: '🏄',
  diving: '🤿',
  kayaking: '🚣',
  sailing: '⛵',
  rock_climbing: '🧗',
  hiking: '🥾',
  picnic: '🧺',
  barbecue: '🍖',
  steak: '🥩',
  chicken: '🍗',
  sushi: '🍣',
  ramen: '🍜',
  dumpling: '🥟',
  coffee: '☕',
  tea: '🍵',
  cocktail: '🍸',
  rose: '🌹',
  sunflower: '🌻',
  tulip: '🌷',
  cactus: '🌵',
  palm: '🌴',
  mushroom: '🍄',
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
