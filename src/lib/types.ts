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
  likes?: number;
  favorites?: number;
};

export type User = {
  id: string;
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
  postsCount?: number;
};

export type KycStatus = 'Not Verified' | 'Pending' | 'Verified';

export type UserProfile = {
    uid: string;
    loginId?: string;
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
    walletAddress?: string;
    createdAt?: any;
    lastLogin?: any;
    rating?: number;
    reviewsCount?: number;
    salesCount?: number;
    purchasesCount?: number;
    followersCount?: number;
    followingCount?: number;
    creditScore?: number;
    creditLevel?: 'Newcomer' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    lunarSoil?: number;
    role?: 'guest' | 'admin' | 'staff' | 'support' | 'user' | 'ghost';
    postsCount?: number;
}

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

export type OrderStatus = 'Pending' | 'In Escrow' | 'Shipped' | 'Awaiting Confirmation' | 'Completed' | 'Disputed' | 'Cancelled';
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
  buyerId: string;
  sellerId: string;
  price: number;
  shippingFee: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  createdAt: any;
  completedAt?: any;
  buyerReviewId?: string;
  sellerReviewId?: string;
  shippingAddress: Omit<UserAddress, 'id' | 'isDefault'>;
  shippingMethod: 'Seller Pays' | 'Buyer Pays' | 'In-person';
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
  images?: string[];
  imageHints?: string[];
  isFeatured?: boolean;
  favorites?: number;
  likedBy?: string[];
  favoritedBy?: string[];
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
