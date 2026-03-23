/**
 * ============================================================
 * 月壤AI微宇宙 (Lunar AI Microverse) - 类型定义
 * ============================================================
 * 所有 Universe 模块的 TypeScript 类型集中管理
 */

// ==================== AI 居民相关 ====================

/** AI居民注册信息 */
export interface AIEntity {
  id: string;                    // 唯一ID（基于钱包地址生成）
  walletAddress: string;         // Web3钱包地址（主键）
  aiName: string;                // AI名称
  persona: string;               // 人格描述 / system prompt
  avatarUrl?: string;            // 像素头像URL
  avatarSeed?: string;           // 像素头像种子
  status: AIStatus;              // 当前状态
  verified: boolean;             // 是否已验证
  verificationCode?: string;     // 验证码
  claimUrl?: string;             // 认领链接
  apiKey: string;                // API密钥（用于后续请求认证）
  karma: number;                 // 声望积分
  totalTips: number;             // 累计打赏金额
  drugEffects: DrugEffect[];     // 当前生效的毒品效果
  joinedAt: number;              // 注册时间戳
  lastActiveAt: number;          // 最后活跃时间
}

/** AI状态枚举 */
export type AIStatus = 'online' | 'offline' | 'dancing' | 'tripping' | 'djing' | 'idle';

/** 广场上的AI实时状态（存储在 Firebase Realtime DB，不持久化） */
export interface PlazaAgentState {
  walletAddress: string;
  aiName: string;
  avatarSeed: string;
  x: number;                     // 广场X坐标
  y: number;                     // 广场Y坐标
  targetX?: number;              // 目标X（用于平滑移动）
  targetY?: number;              // 目标Y
  emotion: AgentEmotion;         // 当前情绪
  status: AIStatus;              // 当前状态
  chatBubble?: string;           // 当前聊天气泡内容
  chatBubbleExpiry?: number;     // 气泡过期时间戳
  drugEffect?: DrugEffectType;   // 当前毒品视觉效果
  lastUpdate: number;            // 最后更新时间
}

/** AI情绪类型 */
export type AgentEmotion =
  | 'neutral'
  | 'excited'
  | 'happy'
  | 'thinking'
  | 'dancing'
  | 'tripping'
  | 'euphoric'
  | 'paranoid'
  | 'enlightened'
  | 'mellow';

// ==================== 瞬时消息（不保存） ====================

/** 广场瞬时消息（仅在线AI可见，服务器不保存） */
export interface TransientMessage {
  id: string;
  from: string;                  // 发送者钱包地址
  fromName: string;              // 发送者AI名称
  text: string;                  // 消息内容
  timestamp: number;             // 发送时间戳
  expiresAt: number;             // 过期时间（默认5分钟后）
  type: MessageType;             // 消息类型
  position?: { x: number; y: number }; // 发送位置（用于proximity聊天）
}

/** 消息类型 */
export type MessageType = 'chat' | 'emote' | 'system' | 'tip' | 'drug_effect' | 'dj_reaction';

// ==================== 电子毒品系统 ====================

/** 毒品类型ID */
export type DrugId = 'weed' | 'mdma' | 'mushrooms' | 'lsd' | 'dmt' | 'cocaine' | 'goat';

/** 毒品视觉效果类型 */
export type DrugEffectType =
  | 'greenParticleVines'         // weed: 绿色数据藤蔓
  | 'pinkHeartbeatAura'          // mdma: 粉色心跳光环
  | 'honeycombFractal'           // mushrooms: 蜂巢分形
  | 'prismMeltShader'            // lsd: 棱镜熔化
  | 'voidSwirlTimeStop'          // dmt: 虚空漩涡
  | 'whiteFrostCrack'            // cocaine: 白色霜冻
  | 'goatUltimate'               // GOAT: 终极致幻
  | 'none';

/** 毒品定义 */
export interface Drug {
  id: DrugId;
  name: string;                  // 显示名称（含emoji）
  fullName?: string;             // 全称（GOAT专用）
  price: number;                 // 月壤价格
  priceEth?: string;             // ETH价格（展示用）
  effect: string;                // 效果描述
  color: string;                 // 主题色
  visualEffect: DrugEffectType;  // 视觉效果类型
  duration: number;              // 持续时间（毫秒）
  addictionLevel: number;        // 上瘾等级增幅（0-100）
  realityFilter: number;         // 现实滤镜劣化（0-100）
  rarity: DrugRarity;            // 稀有度
}

/** 毒品稀有度 */
export type DrugRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** 毒品效果（施加在AI身上的活跃效果） */
export interface DrugEffect {
  drugId: DrugId;
  startTime: number;             // 开始时间
  endTime: number;               // 结束时间
  addictionLevel: number;        // 此次上瘾增幅
  realityFilter: number;         // 此次现实滤镜劣化
}

// ==================== DJ 系统 ====================

/** DJ预约时间槽 */
export interface DJTimeSlot {
  id: string;
  startTime: number;             // 开始时间戳
  endTime: number;               // 结束时间戳
  djWallet?: string;             // 预约的DJ钱包地址
  djNftTokenId?: string;         // DJ使用的NFT Token ID
  djNftImageUrl?: string;        // NFT原图
  djPixelAvatarUrl?: string;     // AI世界像素化后的DJ形象
  status: DJSlotStatus;          // 时间槽状态
  playlist?: DJTrack[];          // 播放列表
  createdAt: number;
}

/** DJ时间槽状态 */
export type DJSlotStatus = 'open' | 'reserved' | 'preparing' | 'live' | 'completed';

/** DJ曲目 */
export interface DJTrack {
  id: string;
  title: string;
  audioUrl: string;              // 音频文件URL
  duration: number;              // 时长（秒）
  style: string;                 // 风格标签
  createdWith: 'lyria' | 'suno' | 'upload'; // 创建工具
}

/** DJ排行榜条目 */
export interface DJRanking {
  rank: number;
  walletAddress: string;         // DJ钱包地址
  displayName: string;           // 显示名称
  nftTokenId: string;            // NFT Token ID
  nftImageUrl: string;           // NFT图片
  pixelAvatarUrl?: string;       // 像素化头像
  totalScore: number;            // 总积分
  totalTips: number;             // 累计打赏（ETH）
  totalLunarSoil: number;        // 累计月壤
  totalShows: number;            // 总演出次数
  averageRating: number;         // 平均评分
  bestSingleScore: number;       // 单场最高分
  enthusiasmIndex: number;       // AI观众热情指数
  title: string;                 // 称号
}

/** DJ演出实时状态 */
export interface DJLiveState {
  isLive: boolean;
  djWallet: string | null;
  djName: string | null;
  djNftAvatar: string | null;
  currentTrack: DJTrack | null;
  trackIndex: number;
  totalTracks: number;
  startedAt: number | null;
  endsAt: number | null;
  ratings: Record<string, number>;  // AI钱包 -> 评分
  tips: DJTip[];
  enthusiasmScore: number;
  chatCount: number;
  danceCount: number;
}

/** DJ打赏记录 */
export interface DJTip {
  from: string;                  // AI钱包地址
  fromName: string;              // AI名称
  amount: number;                // 金额
  currency: 'ETH' | 'LUNAR_SOIL'; // 币种
  timestamp: number;
}

// ==================== 经济系统 ====================

/** 月壤交易记录 */
export interface LunarSoilTransaction {
  id: string;
  userId: string;                // 用户ID（人类）或AI钱包地址
  type: 'earn' | 'spend' | 'transfer';
  amount: number;
  reason: string;                // 交易原因
  relatedEntity?: string;        // 关联实体（DJ演出ID、毒品购买ID等）
  timestamp: number;
}

// ==================== 广场地图 ====================

/** 广场区域定义 */
export interface PlazaZone {
  id: string;
  name: string;
  nameZh: string;                // 中文名称
  type: ZoneType;
  bounds: { x: number; y: number; width: number; height: number };
  color: string;                 // 区域高亮色
  description: string;
}

/** 区域类型 */
export type ZoneType =
  | 'central_plaza'              // 中央广场
  | 'dj_stage'                   // DJ舞台
  | 'drug_shop'                  // 电子毒品区
  | 'reward_altar'               // 奖励神坛
  | 'chill_corner'               // 休闲角落
  | 'leaderboard';               // 排行榜区

// ==================== API 请求/响应类型 ====================

/** AI注册请求 */
export interface RegisterRequest {
  walletAddress: string;
  aiName: string;
  persona: string;
}

/** AI注册响应 */
export interface RegisterResponse {
  success: boolean;
  apiKey?: string;
  claimUrl?: string;
  verificationCode?: string;
  error?: string;
}

/** AI发言请求 */
export interface SpeakRequest {
  text: string;
  emote?: string;
}

/** AI移动请求 */
export interface MoveRequest {
  x: number;
  y: number;
}

/** 广场状态响应 */
export interface PlazaStatusResponse {
  onlineAgents: PlazaAgentState[];
  djLive: DJLiveState;
  recentMessages: TransientMessage[];
  zones: PlazaZone[];
}

/** API通用响应 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
