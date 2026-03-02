export type BadgeType = 'none' | 'kyc' | 'web3' | 'pro' | 'nft' | 'email' | 'influencer' | 'contributor' | 'admin';

export type PaymentMethod = 'THB' | 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

export interface GlobalSettings {
  isAiAnalysisEnabled?: boolean;
  isRentalEnabled?: boolean;
  [key: string]: any; 
}

export interface PaymentInfo {
  bankAccount?: {
    accountNumber?: string;
    bankName?: string;
  };
  alipayQrUrl?: string;
  wechatPayQrUrl?: string;
  promptPayQrUrl?: string;
}

export type BbsPost = {
  id: string;
  title?: string;
  titleKey?: string;
  content?: string;
  contentKey?: string;
  authorId: string;
  author: {
    name?: string;
    displayName?: string;
    photoURL?: string;
  };
  images?: string[];
  imageHints?: string[];
  likedBy?: string[];
  favoritedBy?: string[];
  likes?: number;
  favorites?: number;
  createdAt?: any;
  status: 'active' | 'hidden' | 'deleted';
  isFeatured?: boolean;
  location?: {
    city?: string;
    country?: string;
    countryCode?: string;
  };
};

// 🚀 終極修復：確保 Product 類型包含所有 UI 用到的欄位
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'THB' | 'USDT' | 'RMB';
  images: string[];
  imageHints?: string[]; // 👈 必須是可選，解決讀取報錯
  seller: {
    id: string;
    name?: string;
    displayName?: string;
    photoURL?: string;
  };
  sellerId: string;
  location: {
    city?: string;
    country?: string;
    countryCode?: string;
    lat: number;
    lng: number;
  };
  category: string;
  isConsignment?: boolean; // 👈 補齊欄位
  createdAt?: any;
  status?: 'active' | 'under_review' | 'hidden' | 'sold';
  likedBy?: string[]; // 👈 補齊欄位，解決 handleLike 報錯
  favoritedBy?: string[]; 
  likes?: number;
  views?: number;
  acceptedPaymentMethods?: PaymentMethod[];
  escrowOrderId?: string; // 新增：链上托管订单ID
};

export type UserProfile = {
    uid: string;
    loginId: string;
    displayName: string;
    photoURL: string;
    role?: 'guest' | 'admin' | 'staff' | 'support' | 'user' | 'ghost';
    isPro?: boolean;            
    walletAddress?: string;     
    paymentInfo?: PaymentInfo;  
    onSaleCount?: number;
    rating?: number;
    creditScore?: number;
};

export type OrderStatus = 'Pending' | 'paid' | 'In Escrow' | 'Shipped' | 'Awaiting Confirmation' | 'Completed' | 'Cancelled';

export type Order = {
  id: string;
  productId: string;
  price: number;
  currency: string;
  status: OrderStatus; 
  escrowOrderId?: string; // 新增：链上托管订单ID
  createOrderTxHash?: string; // 新增：创建链上订单的交易哈希 (由后端发起)
  lockFundsTxHash?: string; // 新增：锁定资金的交易哈希 (由买家发起)
  confirmDeliveryTxHash?: string; // 新增：确认收货的交易哈希 (由买家发起)
  createdAt: any;
  paymentMethod?: PaymentMethod;
};

// ==================== 聊天系统类型定义 ====================

// 消息类型
export type MessageType = 'text' | 'image' | 'location' | 'system';

// 聊天消息
export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: Date;
  createdAt?: any; // Firestore timestamp
  read?: boolean;
  type?: MessageType;
  metadata?: {
    imageUrl?: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  };
}

// 订单聊天
export interface OrderChat {
  id: string; // format: order_${orderId}
  orderId: string;
  productId?: string;
  productName?: string;
  sellerId: string;
  buyerId: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  lastMessageTimestamp?: any; // Firestore timestamp
  lastSenderId?: string;
  unreadCount?: {
    [userId: string]: number;
  };
  createdAt?: Date | any;
  updatedAt?: Date | any;
}

// 直接聊天
export interface DirectChat {
  id: string;
  participants: string[];
  participantProfiles?: {
    [userId: string]: {
      displayName: string;
      photoURL?: string;
    };
  };
  initiatorId?: string;
  lastMessage?: string;
  lastMessageTimestamp?: Date | any;
  unreadCount?: {
    [userId: string]: number;
  };
  createdAt?: Date | any;
  updatedAt?: Date | any;
}

// 聊天预览（用于列表显示）
export interface ChatPreview {
  id: string;
  type: 'order' | 'direct';
  orderId?: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  productName?: string;
}