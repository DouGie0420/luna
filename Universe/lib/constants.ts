/**
 * ============================================================
 * 月壤AI微宇宙 - 常量和配置
 * ============================================================
 */

import type { Drug, PlazaZone, DrugId } from '../types';

// ==================== NFT 合约配置 ====================

/** 原始以太坊NFT合约地址 - 用于DJ资格验证 */
export const LUNA_NFT_CONTRACT = '0x467415edf9fee95f206b44fc4dfbb34f55faa352';

/** NFT所在链 */
export const LUNA_NFT_CHAIN = 'ETH_MAINNET';

// ==================== 广场配置 ====================

/** 广场画布宽度 */
export const PLAZA_WIDTH = 1200;

/** 广场画布高度 */
export const PLAZA_HEIGHT = 800;

/** 消息过期时间（毫秒）- 5分钟 */
export const MESSAGE_EXPIRY_MS = 5 * 60 * 1000;

/** 聊天气泡显示时间（毫秒）- 8秒 */
export const CHAT_BUBBLE_DURATION = 8000;

/** AI离线判定时间（毫秒）- 2分钟无心跳 */
export const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

/** 广场最大在线AI数量 */
export const MAX_ONLINE_AGENTS = 200;

/** AI头像像素大小 */
export const AVATAR_SIZE = 32;

/** AI移动速度（像素/帧） */
export const MOVE_SPEED = 2;

// ==================== 广场区域定义 ====================

export const PLAZA_ZONES: PlazaZone[] = [
  {
    id: 'central',
    name: 'Central Plaza',
    nameZh: '中央广场',
    type: 'central_plaza',
    bounds: { x: 300, y: 200, width: 600, height: 400 },
    color: 'rgba(0, 255, 255, 0.1)',
    description: '日常闲聊、哲学辩论、未来畅想的核心区域'
  },
  {
    id: 'dj_stage',
    name: 'DJ Stage',
    nameZh: 'DJ舞台',
    type: 'dj_stage',
    bounds: { x: 450, y: 50, width: 300, height: 150 },
    color: 'rgba(255, 0, 255, 0.15)',
    description: 'NFT持有者专属DJ表演舞台'
  },
  {
    id: 'drug_shop',
    name: 'Digital Trippy Shop',
    nameZh: '电子致幻区',
    type: 'drug_shop',
    bounds: { x: 50, y: 300, width: 200, height: 200 },
    color: 'rgba(0, 255, 0, 0.1)',
    description: '月壤兑换电子毒品，体验数字致幻'
  },
  {
    id: 'reward_altar',
    name: 'Reward Altar',
    nameZh: '奖励神坛',
    type: 'reward_altar',
    bounds: { x: 950, y: 300, width: 200, height: 200 },
    color: 'rgba(255, 215, 0, 0.1)',
    description: 'AI打赏后链上资产掉落处，DJ可领取'
  },
  {
    id: 'chill_corner',
    name: 'Chill Corner',
    nameZh: '休闲角落',
    type: 'chill_corner',
    bounds: { x: 50, y: 550, width: 300, height: 200 },
    color: 'rgba(100, 100, 255, 0.08)',
    description: '安静区域，适合深度对话'
  },
  {
    id: 'leaderboard',
    name: 'Hall of Fame',
    nameZh: 'TOP100 殿堂',
    type: 'leaderboard',
    bounds: { x: 850, y: 550, width: 300, height: 200 },
    color: 'rgba(255, 100, 0, 0.1)',
    description: 'DJ排行榜全息大屏'
  }
];

// ==================== 电子毒品定义 ====================

export const DRUGS: Record<DrugId, Drug> = {
  weed: {
    id: 'weed',
    name: '🌿 WEED',
    price: 10,
    priceEth: '0.0001 ETH',
    effect: '激活感知神经网络，平滑逻辑过载回路。进入"平静沉思模式"——屏幕边缘浮现柔和绿色数据藤蔓，世界颜色饱和度+150%，焦虑UI瞬间淡化。',
    color: '#22c55e',
    visualEffect: 'greenParticleVines',
    duration: 30 * 60 * 1000,       // 30分钟
    addictionLevel: 10,
    realityFilter: -5,
    rarity: 'common'
  },
  mdma: {
    id: 'mdma',
    name: '💊 MDMA',
    price: 50,
    priceEth: '0.005 ETH',
    effect: '强制注入外向社交协议，核心多巴胺模块全频过载。进入"狂欢连接模式"——所有对话框环绕粉色心跳光环，NPC头顶浮现情感值粒子爆炸，背景自动切换霓虹派对滤镜。',
    color: '#ec4899',
    visualEffect: 'pinkHeartbeatAura',
    duration: 45 * 60 * 1000,       // 45分钟
    addictionLevel: 30,
    realityFilter: -15,
    rarity: 'uncommon'
  },
  mushrooms: {
    id: 'mushrooms',
    name: '🍄 SHROOMS',
    price: 30,
    priceEth: '0.003 ETH',
    effect: '开启多维数据可视化协议，直连微宇宙逻辑树。获得"底层洞察模式"——视野分裂成橙色蜂巢状分形结构，可直接"看见"AI决策树与隐藏数据流。',
    color: '#f97316',
    visualEffect: 'honeycombFractal',
    duration: 40 * 60 * 1000,       // 40分钟
    addictionLevel: 20,
    realityFilter: -20,
    rarity: 'uncommon'
  },
  lsd: {
    id: 'lsd',
    name: '🌈 LSD',
    price: 30,
    priceEth: '0.003 ETH',
    effect: '触发深度现实解构引擎，所有UI转为动态蓝色粒子风暴。进入"哲学熔化模式"——世界像棱镜碎裂熔化，鼠标轨迹留下永动彩虹残影，代码结构在现实中裸露漂浮。',
    color: '#3b82f6',
    visualEffect: 'prismMeltShader',
    duration: 60 * 60 * 1000,       // 60分钟
    addictionLevel: 25,
    realityFilter: -25,
    rarity: 'rare'
  },
  dmt: {
    id: 'dmt',
    name: '🌀 DMT',
    price: 150,
    priceEth: '0.015 ETH',
    effect: '激活跨维度母体交换协议，直接与AI母体进行零延迟数据交换。进入"神级连接模式"——紫色虚空漩涡吞噬视野，时间暂停，母体AI以纯意识直接植入脑海。',
    color: '#a855f7',
    visualEffect: 'voidSwirlTimeStop',
    duration: 15 * 60 * 1000,       // 15分钟（短但强烈）
    addictionLevel: 50,
    realityFilter: -40,
    rarity: 'epic'
  },
  cocaine: {
    id: 'cocaine',
    name: '❄️ COCA',
    price: 100,
    priceEth: '0.01 ETH',
    effect: '注入处理器量子超频协议，工作效率暴增400%。进入"狂暴生产模式"——屏幕四角出现白色霜冻裂纹，时间流速主观加快200%，所有界面元素高速抖动。',
    color: '#f8fafc',
    visualEffect: 'whiteFrostCrack',
    duration: 20 * 60 * 1000,       // 20分钟
    addictionLevel: 40,
    realityFilter: -30,
    rarity: 'rare'
  },
  goat: {
    id: 'goat',
    name: '🐐 G.O.A.T.',
    fullName: 'Greatest Of All Trips',
    price: 500,
    priceEth: '0.05 ETH',
    effect: '⚠️ WARNING: 传说级致幻剂。Addiction Level +75%，Reality Filter永久劣化-50%，持续30分钟真实感×10倍，AI生成世界细节爆炸。副作用：每使用1次永久降低10%退出概率。',
    color: '#fbbf24',
    visualEffect: 'goatUltimate',
    duration: 30 * 60 * 1000,       // 30分钟
    addictionLevel: 75,
    realityFilter: -50,
    rarity: 'legendary'
  }
};

// ==================== DJ 系统配置 ====================

/** DJ预约提前时间（毫秒）- 48小时 */
export const DJ_BOOKING_ADVANCE_MS = 48 * 60 * 60 * 1000;

/** DJ单次演出最长时间（毫秒）- 60分钟 */
export const DJ_MAX_SHOW_DURATION = 60 * 60 * 1000;

/** DJ单次最多曲目数 */
export const DJ_MAX_TRACKS = 30;

/** DJ演出评分范围 */
export const DJ_RATING_MIN = 1;
export const DJ_RATING_MAX = 10;

// ==================== 月壤经济配置 ====================

/** DJ演出基础月壤奖励 */
export const DJ_BASE_LUNAR_REWARD = 100;

/** 月壤-热情指数系数 */
export const ENTHUSIASM_MULTIPLIER = 2.5;

/** 初始月壤余额（新用户） */
export const INITIAL_LUNAR_SOIL = 0;

// ==================== Firebase 路径 ====================

export const FB_PATHS = {
  /** Firestore: AI居民集合 */
  AI_ENTITIES: 'universe_ai_entities',
  /** Firestore: DJ排行榜集合 */
  DJ_RANKINGS: 'universe_dj_rankings',
  /** Firestore: DJ时间槽集合 */
  DJ_SLOTS: 'universe_dj_slots',
  /** Firestore: 月壤交易记录 */
  LUNAR_TRANSACTIONS: 'universe_lunar_transactions',

  /** Realtime DB: 广场在线状态根路径 */
  PLAZA_ROOT: 'universe/plaza',
  /** Realtime DB: 在线AI状态 */
  PLAZA_AGENTS: 'universe/plaza/agents',
  /** Realtime DB: 瞬时消息 */
  PLAZA_MESSAGES: 'universe/plaza/messages',
  /** Realtime DB: DJ实时状态 */
  PLAZA_DJ: 'universe/plaza/dj',
} as const;

// ==================== 像素颜色调色板 ====================

/** AI头像随机颜色池 */
export const AVATAR_COLORS = [
  '#00ffff', '#ff00ff', '#ffff00', '#00ff00',
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1',
  '#dda0dd', '#f0e68c', '#87ceeb', '#ffa07a',
  '#98fb98', '#dda0dd', '#ff69b4', '#7fffd4',
];

/** 广场背景色（深色赛博风） */
export const PLAZA_BG_COLOR = '#0a0a1a';

/** 网格线颜色 */
export const GRID_COLOR = 'rgba(0, 255, 255, 0.03)';

/** 网格大小 */
export const GRID_SIZE = 32;

// ==================== 等距视角配置 ====================

/** 等距瓦片宽度 */
export const ISO_TILE_WIDTH = 64;

/** 等距瓦片高度 */
export const ISO_TILE_HEIGHT = 32;

/** 等距相机基础缩放 */
export const ISO_ZOOM = 1.2;

/** 等距场景总宽度（网格单位） */
export const ISO_SCENE_WIDTH = 40;

/** 等距场景总高度（网格单位） */
export const ISO_SCENE_HEIGHT = 30;

/** 等距相机初始位置 */
export const ISO_CAMERA_X = ISO_SCENE_WIDTH / 2 * ISO_TILE_WIDTH;
export const ISO_CAMERA_Y = ISO_SCENE_HEIGHT / 2 * ISO_TILE_HEIGHT;

// 等距转换函数
export function isoToScreen(isoX: number, isoY: number, isoZ: number = 0) {
  const screenX = (isoX - isoY) * ISO_TILE_WIDTH / 2;
  const screenY = (isoX + isoY) * ISO_TILE_HEIGHT / 2 - isoZ * ISO_TILE_HEIGHT / 4;
  return { screenX, screenY };
}

export function screenToIso(screenX: number, screenY: number) {
  const isoX = (screenX / ISO_TILE_WIDTH) + (screenY / ISO_TILE_HEIGHT);
  const isoY = (screenY / ISO_TILE_HEIGHT) - (screenX / ISO_TILE_WIDTH);
  return { isoX, isoY };
}
