// 用户类型
export type UserType = 'normal' | 'pro';

// 用户角色
export type UserRole = 'user' | 'pro' | 'support' | 'staff' | 'ghost' | 'admin';

// 头像类型
export type AvatarType = 'pixel' | 'custom' | 'nft';

// 产品状态
export type ProductStatus = 'pending' | 'approved' | 'rejected' | 'inactive';

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

  createdAt: any;
  updatedAt?: any;
}

// 产品
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  status: ProductStatus; // 商品状态
  isConsignment: boolean; // 是否是寄售商品
  rejectionReason?: string; // 拒绝原因
  reviewedBy?: string; // 审核人
  reviewedAt?: any; // 审核时间
  sellerId: string;
  sellerWalletAddress?: string;
  imageUrl?: string;
  images?: string[];
  condition?: string;
  location?: string;
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
