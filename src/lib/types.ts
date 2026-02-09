
export type BadgeType = 'none' | 'kyc' | 'web3' | 'pro' | 'nft' | 'email' | 'influencer' | 'contributor' | 'admin';

export type PaymentMethod = 'THB' | 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'THB' | 'USDT' | 'RMB';
  images: string[];
  imageHints: string[];
  seller: User;
  location: {
    city: string;
    country: string;
    countryCode: string;
    lat: number;
    lng: number;
  };
  category: string;
  isConsignment?: boolean;
  shippingMethod?: 'Seller Pays' | 'Buyer Pays';
  status?: 'active' | 'under_review' | 'hidden';
  reviewReason?: string;
  likes?: number;
  favorites?: number;
  views?: number;
  searchHits?: number;
  likedBy?: string[];
  favoritedBy?: string[];
  createdAt?: any;
  sellerId?: string;
  acceptedPaymentMethods?: PaymentMethod[];
};

export type RentalProperty = {
    id: string;
    title: string;
    description: string;
    images: string[];
    ownerId: string;
    location: {
        lat: number;
        lng: number;
        city?: string;
        country?: string;
        countryCode?: string;
        address?: string;
    };
    pricePerDay: number;
    maxGuests: number;
    propertyType: string; // e.g., '1室1厅', '整套公寓'
    amenities: string[];
    createdAt?: any;
};

export type Booking = {
    id: string;
    propertyId: string;
    userId: string;
    ownerId: string;
    checkIn: any;
    checkOut: any;
    totalPrice: number;
    guests: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    createdAt: any;
};

export type User = {
  id: string;
  loginId?: string;
  name: string;
  avatarUrl: string;
  rating: number;
  reviews: number;
  isPro?: boolean;
  isWeb3Verified?: boolean;
  isNftVerified?: boolean;
  kycStatus?: KycStatus;
  location?: {
    city: string;
    country: string;
    countryCode: string;
    lat: number;
    lng: number;
  };
  itemsOnSale?: number;
  itemsSold?: number;
  goodReviews?: number;
  neutralReviews?: number;
  badReviews?: number;
  creditScore?: number;
  creditLevel?: 'Newcomer' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
  followersCount?: number;
  followingCount?: number;
  featuredCount?: number;
  postsCount?: number;
  onSaleCount?: number;
  displayedBadge?: BadgeType;
  bannerUrl?: string;
};

export type KycStatus = 'Not Verified' | 'Pending' | 'Verified';

export type PaymentInfo = {
    bankAccount?: {
        accountName?: string;
        accountNumber?: string;
        bankName?: string;
    };
    usdtAddress?: string;
    alipayQrUrl?: string;
    wechatPayQrUrl?: string;
    promptPayQrUrl?: string;
};

export type UserProfile = {
    uid: string;
    loginId: string;
    phone?: string;
    email?: string;
    emailVerified?: boolean;
    displayName: string;
    photoURL: string;
    gender?: '男' | '女' | '其他' | '保密';
    location?: string;
    bio?: string;
    kycStatus: KycStatus;
    kycIdPhotoUrl?: string;
    kycSelfieUrl?: string;
    isPro?: boolean;
    isWeb3Verified?: boolean;
    isNftVerified?: boolean;
    isInfluencer?: boolean;
    isContributor?: boolean;
    walletAddress?: string;
    createdAt?: any;
    lastLogin?: any;
    rating?: number;
    reviewsCount?: number;
    salesCount?: number;
    onSaleCount?: number;
    purchasesCount?: number;
    followersCount?: number;
    followingCount?: number;
    followers?: string[];
    following?: string[];
    goodReviews?: number;
    neutralReviews?: number;
    badReviews?: number;
    featuredCount?: number;
    creditScore?: number;
    creditLevel?: 'Newcomer' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    lunarSoil?: number;
    role?: 'guest' | 'admin' | 'staff' | 'support' | 'user' | 'ghost';
    postsCount?: number;
    displayedBadge?: BadgeType;
    paymentInfo?: PaymentInfo;
    bannerUrl?: string;
    featuredProductId?: string;
    preferredLanguage?: 'en' | 'zh' | 'th';
    displayPriority?: number;
};

export type ProApplication = {
    id: string;
    userId: string;
    userName: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    reviewedAt?: any;
    reviewerId?: string;
    plan: 'tier1' | 'tier2' | 'tier3';
};

export type PaymentChangeRequest = {
    id: string;
    userId: string;
    userName: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    reviewedAt?: any;
    reviewerId?: string;
    rejectionReason?: string;
    requestedPaymentInfo: PaymentInfo;
    currentPaymentInfo?: PaymentInfo;
};

export type Promo = {
  id: string;
  heroTitle: string;
  heroDescription: string;
  heroBackgroundGif: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  productsSectionTitle: string;
  featuredProductIds: string[];
};

export type OrderStatus = 'Pending' | 'In Escrow' | 'Shipped' | 'Awaiting Confirmation' | 'Completed' | 'Disputed' | 'Released' | 'Refunded' | 'Cancelled';
export type Rating = 'Good' | 'Neutral' | 'Bad';

export type UserAddress = {
  id: string;
  recipientName: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  isDefault?: boolean;
};

export type Order = {
  id: string;
  productId: string;
  productName: string;
  buyerId: string;
  sellerId: string;
  participants: string[];
  price: number;
  shippingFee: number;
  platformFee?: number;
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  disputeReason?: string;
  createdAt: any;
  completedAt?: any;
  buyerReviewId?: string;
  sellerReviewId?: string;
  shippingAddress: Omit<UserAddress, 'id' | 'isDefault'>;
  shippingMethod: 'Seller Pays' | 'Buyer Pays' | 'In-person';
  shippingProvider?: string;
  trackingNumber?: string;
  paymentTransactionId?: string;
};

export type Review = {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  role: 'buyer' | 'seller';
  rating: Rating;
  comment?: string;
  images?: string[];
  createdAt: any;
};

export type LunarSoilLedgerEntry = {
  id: string;
  amount: number;
  earnedAt: any;
  expiresAt: any;
  source: string; // e.g., 'review', 'daily-login', 'purchase'
};

export type BbsPost = {
  id: string;
  titleKey?: string;
  contentKey?: string;
  title?: string;
  content?: string;
  authorId: string;
  author: User;
  tags: string[];
  replies: number;
  likes: number;
  views: number;
  createdAt: any;
  updatedAt?: any;
  images?: string[];
  videos?: string[];
  imageHints?: string[];
  isFeatured?: boolean;
  status?: 'active' | 'under_review' | 'hidden';
  reviewReason?: string;
  favorites?: number;
  likedBy?: string[];
  favoritedBy?: string[];
  location: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
    countryCode?: string;
  };
  searchHits?: number;
};

export type Comment = {
  id: string;
  authorId: string;
  text: string;
  parentId?: string;
  createdAt: any;
  likes?: number;
  dislikes?: number;
  likedBy?: string[];
  dislikedBy?: string[];
};


export type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  type: 'info' | 'success' | 'warning' | 'error';
};

export type SupportTicket = {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    category: string;
    description: string;
    status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
    createdAt: any;
    updatedAt?: any;
    assignedTo?: string;
};

export type DirectChat = {
  id: string;
  participants: string[];
  participantProfiles: { [key: string]: Pick<UserProfile, 'displayName' | 'photoURL'> };
  lastMessage: string;
  lastMessageTimestamp: any;
  unreadCount: { [key: string]: number };
  isFriendMode: boolean;
  hasReplied: boolean;
  initiatorId: string;
  initialMessageCount: number;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
  imageUrl?: string;
  originalText?: string;
  isTranslated?: boolean;
};

export type GlobalSettings = {
  id?: string;
  isAiAnalysisEnabled: boolean;
  isProApplicationEnabled: boolean;
  isRentalEnabled: boolean;
};

export type GlobalAudioPlayerConfig = {
  id: string;
  display_logic: {
    isVisible: boolean;
    isMinimized: boolean;
    enableOnMobile: boolean;
  };
  content_source: {
    platform: 'youtube_live';
    videoId: string;
    fallbackUrl?: string;
    autoPlay: boolean;
  };
  ui_customization: {
    position: 'bottom-left';
    theme: 'cyberpunk_neon';
    primaryColor: string;
    secondaryColor: string;
    opacity: number;
    blur: string;
    showLiveBadge: boolean;
  };
  metadata: {
    stationName: string;
    channelIcon?: string;
    channelId?: string;
  };
};

    