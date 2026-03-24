// 徽章类型
export type BadgeType = 'none' | 'admin' | 'pro' | 'email' | 'kyc' | 'web3' | 'nft' | 'influencer' | 'contributor' | 'vip' | 'verified' | 'moderator';

// 用户类型
export type UserType = 'normal' | 'pro';

// 用户角色
export type UserRole = 'user' | 'pro' | 'support' | 'staff' | 'ghost' | 'admin';

// 头像类型
export type AvatarType = 'pixel' | 'custom' | 'nft';

// 产品状态
export type ProductStatus = 'pending' | 'approved' | 'rejected' | 'inactive' | 'hidden' | 'active' | 'under_review';

// 产品分类
export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports',
  'Toys',
  'Consignment', // 官方寄售
  'Other'
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

// 权限定义
export const ROLE_PERMISSIONS = {
  admin: {
    level: 5,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageProducts: true,
    canManageRentals: true,
    canManageSettings: true,
    canManageRoles: true
  },
  ghost: {
    level: 4,
    canAccessAdmin: true,
    canManageUsers: true,
    canManageOrders: true,
    canManageProducts: true,
    canManageRentals: true,
    canManageSettings: false,
    canManageRoles: false
  },
  staff: {
    level: 3,
    canAccessAdmin: true,
    canManageUsers: false,
    canManageOrders: true,
    canManageProducts: true,
    canManageRentals: true,
    canManageSettings: false,
    canManageRoles: false
  },
  support: {
    level: 2,
    canAccessAdmin: true,
    canManageUsers: false,
    canManageOrders: false,
    canManageProducts: false,
    canManageRentals: false,
    canManageSettings: false,
    canManageRoles: false
  },
  pro: {
    level: 1,
    canAccessAdmin: false,
    canPublishRentals: true
  },
  user: {
    level: 0,
    canAccessAdmin: false
  }
} as const;

// 检查用户是否可以访问管理后台
export function canAccessAdmin(role?: UserRole): boolean {
  if (!role) return false;
  return ['admin', 'ghost', 'staff', 'support'].includes(role);
}

// 检查用户是否有特定权限
export function hasPermission(role: UserRole | undefined, permission: keyof typeof ROLE_PERMISSIONS.admin): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  return permissions?.[permission] ?? false;
}

// 用户个人资料
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bannerUrl?: string;

  // 用户类型
  userType: UserType;

  // 头像系统
  avatarType: AvatarType;
  pixelAvatarSeed?: string; // 像素头像种子
  customAvatarUrl?: string; // 自定义头像（仅PRO）
  nftAvatarUrl?: string; // NFT头像
  nftTokenId?: string; // NFT Token ID
  nftContractAddress?: string; // NFT合约地址

  // 钱包相关
  walletAddress?: string;
  ensName?: string;
  walletBindTime?: any; // Firestore timestamp

  // 勋章
  badges?: string[]; // ['WEB3', 'NFT', 'PRO', ...]

  // 管理员
  role?: UserRole;
  isAdmin?: boolean;

  // 用户资料补充字段
  bio?: string;
  location?: string;
  gender?: string;
  loginId?: string;
  emailVerified?: boolean;

  // KYC 状态
  kycStatus?: 'Not Verified' | 'Pending' | 'Verified';
  kycIdPhotoUrl?: string;
  kycSelfieUrl?: string;

  // Web3/NFT 验证状态
  isWeb3Verified?: boolean;
  isNftVerified?: boolean;

  // 社交统计
  followersCount?: number;
  featuredCount?: number;
  isInfluencer?: boolean;
  isContributor?: boolean;

  // 徽章显示
  displayedBadge?: BadgeType;

  // PRO用户字段
  isPro?: boolean;
  proExpiresAt?: any;

  // 社交统计
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;

  // 商家统计
  onSaleCount?: number;
  salesCount?: number;
  purchasesCount?: number;
  rating?: number;
  reviewsCount?: number;

  // 精选商品
  featuredProductId?: string;

  // 积分系统
  lunarSoil?: number;
  creditLevel?: number;
  creditScore?: number;

  // 其他字段
  following?: string[];
  lastLogin?: any;

  createdAt: any;
  updatedAt?: any;
}

// 产品
export interface Product {
  id: string;
  name: string;
  title?: string; // 用于购买/评价页面的标题字段
  description: string;
  price: number;
  category: ProductCategory;
  status: ProductStatus; // 商品状态
  isConsignment: boolean; // 是否是寄售商品
  rejectionReason?: string; // 拒绝原因
  reviewedBy?: string; // 审核人
  reviewedAt?: any; // 审核时间
  sellerId: string;
  sellerAddress?: string; // 卖家钱包地址（简化字段）
  sellerWalletAddress?: string; // 卖家钱包地址
  imageUrl?: string;
  images?: string[];
  condition?: string;
  location?: string;
  shippingMethod?: string; // 配送方式

  // 加速推广
  isBoosted?: boolean;
  boostExpiresAt?: any;

  // 统计数据
  likes?: number;
  favorites?: number;
  views?: number;

  // 货币
  currency?: string;

  createdAt: any;
  updatedAt?: any;
}

// 钱包更换申请
export interface WalletChangeRequest {
  id: string;
  userId: string;
  oldWalletAddress: string;
  newWalletAddress: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestTime: any;
  reviewTime?: any;
  reviewedBy?: string;
  reviewNote?: string;
}

// 商品锁定
export interface ProductLock {
  productId: string;
  lockedBy: string; // 用户ID
  lockedAt: any;
  expiresAt: any; // 30分钟后
  status: 'locked' | 'expired' | 'completed';
}

// 勋章
export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'location';
  imageUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
  createdAt?: any;
  updatedAt?: any;
}

// 订单
export interface Order {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  total: number;
  sellerId: string;
  sellerName?: string;
  buyerId: string;
  buyerName?: string;
  status: OrderStatus;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  shippingStatus: 'pending' | 'shipped' | 'delivered';
  paymentMethod?: string;
  shippingMethod?: string;
  transactionHash?: string;
  escrowAddress?: string;
  escrowOrderId?: string;
  totalAmount?: number;
  currency?: string;
  paidAt?: any;
  shippedAt?: any;
  completedAt?: any;
  trackingNumber?: string;
  carrier?: string;
  shippingAddress?: any;
  txHash?: string;
  gasUsed?: string;
  disputeResolvedTxHash?: string;
  confirmDeliveryTxHash?: string;
  resolvedAt?: any;
  buyerReviewId?: string;
  cancellationRequested?: boolean;
  cancellationReason?: string;
  cancellationRequestedAt?: any;
  cancellationApproved?: boolean;
  createdAt: any;
  updatedAt?: any;
}

// 订单状态
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'disputed';

// 支持工单
export interface SupportTicket {
  id: string;
  userId: string;
  userName?: string;
  title: string;
  content: string;
  type: 'general' | 'order' | 'payment' | 'technical' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  orderId?: string;
  messages?: SupportMessage[];
  createdAt: any;
  updatedAt?: any;
}

// 支持消息
export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName?: string;
  isStaff?: boolean;
  content: string;
  attachments?: string[];
  createdAt: any;
}

// PRO申请
export interface ProApplication {
  id: string;
  userId: string;
  userName?: string;
  email?: string;
  reason: string;
  experience?: string;
  portfolioUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: any;
  reviewedAt?: any;
}

// KYC状态类型
export type KycStatus = 'Not Verified' | 'Pending' | 'Verified' | 'Rejected';

// 音频播放器配置
export interface GlobalAudioPlayerConfig {
  enabled: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  trackUrl?: string;
  trackName?: string;
}

// 其他缺失的类型
export interface Notification {
  id: string;
  userId: string;
  type: 'order' | 'system' | 'message' | 'promo';
  title: string;
  content: string;
  read: boolean;
  data?: any;
  createdAt: any;
}

export interface Promo {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'shipping';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startDate: any;
  endDate: any;
  status: 'active' | 'expired' | 'disabled';
  applicableProducts?: 'all' | string[];
  createdAt: any;
}

export interface PaymentMethod {
  id: string;
  type: 'usdt' | 'alipay' | 'wechat' | 'promptpay' | 'credit_card' | 'paypal' | 'bank_transfer';
  name: string;
  icon?: string;
  enabled: boolean;
  config?: any;
  minAmount?: number;
  maxAmount?: number;
  fee?: number;
  feeType?: 'fixed' | 'percentage';
  processingTime?: string;
}

export interface PaymentInfo {
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: number;
  fee?: number;
  transactionId?: string;
  transactionHash?: string;
  paidAt?: any;
  refundedAt?: any;
  refundReason?: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyName?: string;
  guestId?: string;
  guestName?: string;
  guestEmail?: string;
  // Fields used by rental booking flow
  tenantId?: string;
  tenantEmail?: string;
  tenantName?: string;
  hostId: string;
  ownerId?: string;
  checkIn: any;
  checkOut: any;
  guests?: number;
  nights?: number;
  totalPrice?: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'paid' | 'cancellation_requested' | 'disputed' | 'refunded';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  specialRequests?: string;
  confirmedAt?: any;
  declinedAt?: any;
  completedAt?: any;
  createdAt: any;
  updatedAt?: any;
  // Smart contract fields
  txHash?: string;
  escrowOrderId?: string;
  billingSnapshot?: {
    totalUSD: number;
    platformFeeUSD: number;
    ethPriceAtBooking: number;
    paidETH: number;
  };
  // Cancellation fields
  cancellationRequested?: boolean;
  cancellationReason?: string;
  cancellationRequestedAt?: any;
  cancellationApproved?: boolean;
  refundTxHash?: string;
  refundedAt?: any;
  resolvedAt?: any;
}

export interface RentalProperty {
  id: string;
  hostId: string;
  hostName?: string;
  title: string;
  description: string;
  type: 'apartment' | 'house' | 'villa' | 'room' | 'other';
  location: {
    address: string;
    city: string;
    country: string;
    lat?: number;
    lng?: number;
  };
  images: string[];
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  houseRules?: string[];
  availability?: {
    availableFrom?: any;
    availableTo?: any;
    blockedDates?: any[];
  };
  status: 'active' | 'inactive' | 'pending_review';
  rating?: number;
  reviewCount?: number;
  createdAt: any;
  updatedAt?: any;
}

// 订单聊天
export interface OrderChat {
  orderId: string;
  productId: string;
  productName?: string;
  sellerId: string;
  buyerId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTimestamp?: any;
  lastMessageTime?: Date;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt: any;
  updatedAt?: any;
}

// 直接消息
export interface DirectChat {
  participants: string[];
  participantProfiles?: Record<string, {
    displayName: string;
    photoURL?: string;
  }>;
  lastMessage?: string;
  lastMessageTimestamp?: any;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt: any;
  updatedAt?: any;
}

// 用户地址
export interface UserAddress {
  id: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// 评论
export interface Comment {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  content: string;
  rating?: number;
  likes?: number;
  parentId?: string; // 用于回复
  replies?: Comment[];
  createdAt?: any;
  updatedAt?: any;
}

// BBS 帖子
export interface BbsPost {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  title?: string;
  images?: string[];
  videos?: string[];
  likes?: number;
  favorites?: number;
  comments?: number;
  favoritedBy?: string[];
  likedBy?: string[];
  tags?: string[];
  location?: string;
  replies?: BbsPost[];
  createdAt?: any;
  updatedAt?: any;
}

// 聊天预览
export interface ChatPreview {
  id: string;
  type: 'order' | 'direct';
  orderId?: string;
  productName?: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

// 全局设置
export interface GlobalSettings {
  maintenanceMode?: boolean;
  registrationEnabled?: boolean;
  defaultCurrency?: string;
  commissionRate?: number;
  minWithdrawalAmount?: number;
  maxUploadSize?: number;
  allowedImageTypes?: string[];
  supportEmail?: string;
  socialLinks?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    discord?: string;
  };
  featureFlags?: {
    enableWeb3?: boolean;
    enableBoost?: boolean;
    enableBBS?: boolean;
    enableChat?: boolean;
  };
  // PRO 申请功能开关
  isProApplicationEnabled?: boolean;

  // 支付通道开关
  paymentMethods?: {
    usdt?: boolean;
    alipay?: boolean;
    wechat?: boolean;
    promptpay?: boolean;
    creditCard?: boolean;
    paypal?: boolean;
  };
}
