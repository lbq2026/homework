/**
 * 图标常量表（从 types/index.ts 下沉，保持类型定义与数据分离）
 */
import type { BadgeType } from '@/types';

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
  // —— 学科学习（小学常见作业类型）——
  chinese: '📕', // 语文
  math_book: '📘', // 数学
  english_book: '📗', // 英语
  pinyin: '🔤', // 拼音/字母
  dictation: '👂', // 听写
  recite: '🗣️', // 背诵/口语
  handwriting: '🖋️', // 练字
  calligraphy: '🖌️', // 书法/毛笔字
  diary: '🗒️', // 日记
  homework: '📝', // 写作业
  // —— 数学专项 ——
  abacus: '🧮', // 口算/算术
  plus: '➕', // 加法
  minus: '➖', // 减法
  multiply: '✖️', // 乘法
  divide: '➗', // 除法
  geometry: '📐', // 几何
  ruler: '📏', // 测量
  // —— 科学探究 ——
  experiment: '🧪', // 科学实验
  telescope: '🔭', // 观察日记
  seedling: '🌱', // 种植观察
  map: '🗺️', // 地理地图
  art: '🎨',
  music: '🎵',
  piano: '🎹',
  guitar: '🎸',
  dance: '💃',
  // —— 艺术与兴趣素养 ——
  crayons: '🖍️', // 蜡笔画
  sing: '🎤', // 唱歌
  violin: '🎻', // 小提琴
  drum: '🥁', // 架子鼓
  music_notes: '🎶', // 音乐
  score: '🎼', // 乐谱
  handcraft: '✂️', // 手工剪纸
  chess: '♟️', // 棋类
  puzzle: '🧩', // 拼图
  lego: '🧱', // 积木
  programming: '💻', // 编程
  martial_arts: '🥋', // 武术/跆拳道
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
  // —— 体育专项 ——
  table_tennis: '🏓', // 乒乓球
  jump_rope: '🪢', // 跳绳
  gymnastics: '🤸', // 体操
  volleyball: '🏐', // 排球
  roller_skating: '🛴', // 轮滑（🛼 旧系统缺字，改用滑板车）
  ice_skating: '⛸️', // 滑冰
  skateboard: '🛹', // 滑板
  // —— 生活自理与习惯 ——
  schoolbag: '🎒', // 整理书包
  tidy_bed: '🛏️', // 整理床铺
  broom: '🧹', // 扫地/家务
  dishes: '🍽️', // 洗碗
  alarm: '⏰', // 早睡早起
  bath: '🛁', // 洗澡
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
