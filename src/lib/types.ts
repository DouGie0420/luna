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
    lat: number;
    lng: number;
  };
  category: string;
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
  kycStatus?: KycStatus;
};

export type KycStatus = 'Not Verified' | 'Pending' | 'Verified';

export type UserProfile = {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string;
    gender?: '男' | '女' | '其他' | '保密';
    location?: string;
    bio?: string;
    kycStatus: KycStatus;
    createdAt?: any;
    lastLogin?: any;
    rating?: number;
    reviewsCount?: number;
    salesCount?: number;
    purchasesCount?: number;
    creditScore?: number;
    creditLevel?: 'Newcomer' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
    lunarSoil?: number;
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

export type Order = {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  currency: string;
  status: OrderStatus;
  createdAt: any;
  completedAt?: any;
  buyerReviewId?: string;
  sellerReviewId?: string;
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
