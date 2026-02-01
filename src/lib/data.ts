import type { Product, User, KycStatus, BbsPost, UserAddress } from './types';
import { PlaceHolderImages } from './placeholder-images';

const users: User[] = [
  {
    id: 'user1',
    name: 'Alex Doe',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100',
    rating: 4.8,
    reviews: 120,
    isPro: true,
    isWeb3Verified: false,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
    onSaleCount: 5,
    itemsSold: 115,
    goodReviews: 110,
    neutralReviews: 8,
    badReviews: 2,
    creditScore: 950,
    creditLevel: 'Gold',
    followersCount: 1200,
    followingCount: 150,
    postsCount: 0,
    displayedBadge: 'kyc',
    featuredCount: 10,
  },
  {
    id: 'user2',
    name: 'Billie Jean',
    avatarUrl: 'https://picsum.photos/seed/user2/100/100',
    rating: 4.9,
    reviews: 85,
    isPro: false,
    isWeb3Verified: true,
    isNftVerified: true,
    kycStatus: 'Verified',
    location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
    onSaleCount: 12,
    itemsSold: 250,
    goodReviews: 83,
    neutralReviews: 2,
    badReviews: 0,
    creditScore: 985,
    creditLevel: 'Platinum',
    followersCount: 2500,
    followingCount: 80,
    postsCount: 1,
    displayedBadge: 'nft',
    featuredCount: 25,
  },
  {
    id: 'user3',
    name: 'Charlie Brown',
    avatarUrl: 'https://picsum.photos/seed/user3/100/100',
    rating: 4.5,
    reviews: 42,
    isPro: true,
    isWeb3Verified: true,
    isNftVerified: true,
    kycStatus: 'Verified',
    location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.7883, lng: 98.9853 },
    onSaleCount: 2,
    itemsSold: 30,
    goodReviews: 35,
    neutralReviews: 5,
    badReviews: 2,
    creditScore: 820,
    creditLevel: 'Silver',
    followersCount: 500,
    followingCount: 300,
    postsCount: 1,
    displayedBadge: 'pro',
  },
  {
    id: 'user4',
    name: 'Diana Prince',
    avatarUrl: 'https://picsum.photos/seed/user4/100/100',
    rating: 4.9,
    reviews: 210,
    isPro: true,
    isWeb3Verified: true,
    isNftVerified: true,
    kycStatus: 'Verified',
    location: { city: 'Phuket', country: 'Thailand', countryCode: 'TH', lat: 7.8804, lng: 98.3923 },
    onSaleCount: 25,
    itemsSold: 500,
    goodReviews: 205,
    neutralReviews: 5,
    badReviews: 0,
    creditScore: 1200,
    creditLevel: 'Diamond',
    followersCount: 10000,
    followingCount: 5,
    postsCount: 0,
    displayedBadge: 'influencer',
    featuredCount: 30,
  },
  {
    id: 'user5',
    name: 'Ethan Hunt',
    avatarUrl: 'https://picsum.photos/seed/user5/100/100',
    rating: 4.7,
    reviews: 150,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Pending',
    location: { city: 'Pattaya', country: 'Thailand', countryCode: 'TH', lat: 12.9246, lng: 100.8825 },
    onSaleCount: 8,
    itemsSold: 120,
    goodReviews: 140,
    neutralReviews: 10,
    badReviews: 0,
    creditScore: 900,
    creditLevel: 'Gold',
    followersCount: 800,
    followingCount: 20,
    postsCount: 1,
    displayedBadge: 'pro',
  },
  {
    id: 'user6',
    name: 'Fiona Glenanne',
    avatarUrl: 'https://picsum.photos/seed/user6/100/100',
    rating: 4.8,
    reviews: 95,
    isWeb3Verified: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Beijing', country: 'China', countryCode: 'CN', lat: 39.9042, lng: 116.4074 },
    onSaleCount: 10,
    itemsSold: 90,
    goodReviews: 90,
    neutralReviews: 4,
    badReviews: 1,
    creditScore: 960,
    creditLevel: 'Gold',
    followersCount: 950,
    followingCount: 180,
    postsCount: 0,
    displayedBadge: 'web3',
  },
  {
    id: 'user7',
    name: 'George Costanza',
    avatarUrl: 'https://picsum.photos/seed/user7/100/100',
    rating: 4.3,
    reviews: 33,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Shenzhen', country: 'China', countryCode: 'CN', lat: 22.5431, lng: 114.0579 },
    onSaleCount: 1,
    itemsSold: 15,
    goodReviews: 28,
    neutralReviews: 2,
    badReviews: 3,
    creditScore: 750,
    creditLevel: 'Bronze',
    followersCount: 200,
    followingCount: 250,
    postsCount: 1,
    displayedBadge: 'none',
  },
  {
    id: 'user8',
    name: 'Helen Troy',
    avatarUrl: 'https://picsum.photos/seed/user8/100/100',
    rating: 5.0,
    reviews: 18,
    isPro: false,
    isWeb3Verified: false,
    isNftVerified: false,
    kycStatus: 'Not Verified',
    location: { city: 'Nonthaburi', country: 'Thailand', countryCode: 'TH', lat: 13.859, lng: 100.5218 },
    onSaleCount: 3,
    itemsSold: 10,
    goodReviews: 18,
    neutralReviews: 0,
    badReviews: 0,
    creditScore: 500,
    creditLevel: 'Newcomer',
    followersCount: 150,
    followingCount: 90,
    postsCount: 1,
    displayedBadge: 'none',
  },
  {
    id: 'user9',
    name: 'Ivan Drago',
    avatarUrl: 'https://picsum.photos/seed/user9/100/100',
    rating: 4.6,
    reviews: 78,
    isPro: true,
    isWeb3Verified: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Samut Prakan', country: 'Thailand', countryCode: 'TH', lat: 13.5994, lng: 100.653 },
    onSaleCount: 7,
    itemsSold: 65,
    goodReviews: 70,
    neutralReviews: 8,
    badReviews: 0,
    creditScore: 880,
    creditLevel: 'Silver',
    followersCount: 650,
    followingCount: 400,
    postsCount: 1,
    displayedBadge: 'pro',
  },
  {
    id: 'user10',
    name: '南极弹吉他的橘黄海葵',
    avatarUrl: 'https://picsum.photos/seed/user10/100/100',
    rating: 4.9,
    reviews: 132,
    isPro: true,
    isWeb3Verified: true,
    isNftVerified: true,
    kycStatus: 'Verified',
    location: { city: 'Udon Thani', country: 'Thailand', countryCode: 'TH', lat: 17.4138, lng: 102.7881 },
    onSaleCount: 15,
    itemsSold: 180,
    goodReviews: 130,
    neutralReviews: 1,
    badReviews: 1,
    creditScore: 1050,
    creditLevel: 'Platinum',
    followersCount: 5000,
    followingCount: 120,
    postsCount: 0,
    displayedBadge: 'nft',
  },
  {
    id: 'staff-user-1',
    name: 'Luna月光漫步',
    avatarUrl: 'https://picsum.photos/seed/staff-user-1/100/100',
    rating: 4.9,
    reviews: 250,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
    onSaleCount: 10,
    itemsSold: 150,
    creditScore: 1100,
    creditLevel: 'Platinum',
    followersCount: 15000,
    followingCount: 200,
    postsCount: 2,
    displayedBadge: 'pro',
    featuredCount: 22
  },
  {
    id: 'staff-user-2',
    name: '赛博电玩兔',
    avatarUrl: 'https://picsum.photos/seed/staff-user-2/100/100',
    rating: 4.9,
    reviews: 310,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
    onSaleCount: 15,
    itemsSold: 300,
    creditScore: 1250,
    creditLevel: 'Diamond',
    followersCount: 25000,
    followingCount: 50,
    postsCount: 2,
    displayedBadge: 'pro',
    featuredCount: 30
  },
  {
    id: 'staff-user-3',
    name: '清迈旧时光',
    avatarUrl: 'https://picsum.photos/seed/staff-user-3/100/100',
    rating: 4.8,
    reviews: 180,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.7883, lng: 98.9853 },
    onSaleCount: 5,
    itemsSold: 90,
    creditScore: 980,
    creditLevel: 'Gold',
    followersCount: 8000,
    followingCount: 120,
    postsCount: 2,
    displayedBadge: 'pro',
  },
  {
    id: 'staff-user-4',
    name: '深圳搞机男',
    avatarUrl: 'https://picsum.photos/seed/staff-user-4/100/100',
    rating: 5.0,
    reviews: 500,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Shenzhen', country: 'China', countryCode: 'CN', lat: 22.5431, lng: 114.0579 },
    onSaleCount: 30,
    itemsSold: 800,
    creditScore: 1500,
    creditLevel: 'Diamond',
    followersCount: 50000,
    followingCount: 10,
    postsCount: 2,
    displayedBadge: 'pro',
    featuredCount: 50,
  },
  {
    id: 'staff-user-5',
    name: '普吉岛浪人',
    avatarUrl: 'https://picsum.photos/seed/staff-user-5/100/100',
    rating: 4.7,
    reviews: 95,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Phuket', country: 'Thailand', countryCode: 'TH', lat: 7.8804, lng: 98.3923 },
    onSaleCount: 3,
    itemsSold: 50,
    creditScore: 850,
    creditLevel: 'Silver',
    followersCount: 3000,
    followingCount: 300,
    postsCount: 2,
    displayedBadge: 'pro',
  },
  {
    id: 'staff-user-6',
    name: 'OOTD女王',
    avatarUrl: 'https://picsum.photos/seed/staff-user-6/100/100',
    rating: 4.9,
    reviews: 420,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Beijing', country: 'China', countryCode: 'CN', lat: 39.9042, lng: 116.4074 },
    onSaleCount: 25,
    itemsSold: 400,
    creditScore: 1300,
    creditLevel: 'Diamond',
    followersCount: 80000,
    followingCount: 88,
    postsCount: 2,
    displayedBadge: 'pro',
  },
  {
    id: 'staff-user-7',
    name: '曼谷食神',
    avatarUrl: 'https://picsum.photos/seed/staff-user-7/100/100',
    rating: 4.9,
    reviews: 600,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
    onSaleCount: 2,
    itemsSold: 20,
    creditScore: 1000,
    creditLevel: 'Platinum',
    followersCount: 12000,
    followingCount: 500,
    postsCount: 2,
    displayedBadge: 'pro',
    featuredCount: 40
  },
  {
    id: 'staff-user-8',
    name: 'VR时空旅人',
    avatarUrl: 'https://picsum.photos/seed/staff-user-8/100/100',
    rating: 4.8,
    reviews: 150,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
    onSaleCount: 8,
    itemsSold: 110,
    creditScore: 920,
    creditLevel: 'Gold',
    followersCount: 9500,
    followingCount: 210,
    postsCount: 2,
    displayedBadge: 'pro',
  },
  {
    id: 'staff-user-9',
    name: '机车与代码',
    avatarUrl: 'https://picsum.photos/seed/staff-user-9/100/100',
    rating: 4.7,
    reviews: 110,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Pattaya', country: 'Thailand', countryCode: 'TH', lat: 12.9246, lng: 100.8825 },
    onSaleCount: 12,
    itemsSold: 99,
    creditScore: 890,
    creditLevel: 'Silver',
    followersCount: 6000,
    followingCount: 800,
    postsCount: 2,
    displayedBadge: 'pro',
  },
  {
    id: 'staff-user-10',
    name: '中古收藏家',
    avatarUrl: 'https://picsum.photos/seed/staff-user-10/100/100',
    rating: 5.0,
    reviews: 70,
    isPro: true,
    isNftVerified: false,
    kycStatus: 'Verified',
    location: { city: 'Chengdu', country: 'China', countryCode: 'CN', lat: 30.5728, lng: 104.0668 },
    onSaleCount: 5,
    itemsSold: 60,
    creditScore: 1020,
    creditLevel: 'Platinum',
    followersCount: 7500,
    followingCount: 90,
    postsCount: 2,
    displayedBadge: 'pro',
  }
];

const products: Product[] = [
  {
    id: 'vintage-camera',
    name: 'Vintage Film Camera',
    description: 'A classic 35mm film camera in excellent working condition. A true collector\'s item that still produces beautiful, grainy photos.',
    price: 6500,
    currency: 'THB',
    images: [PlaceHolderImages.find(p => p.id === 'vintage-camera')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'vintage-camera')?.imageHint || ''],
    seller: users[0],
    location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
    category: 'Electronics',
    shippingMethod: 'Buyer Pays',
    likes: 132,
    favorites: 256,
  },
  {
    id: 'leather-wallet',
    name: 'Handmade Leather Wallet',
    description: 'A durable and stylish wallet crafted from genuine full-grain leather. Ages beautifully and holds all your essentials.',
    price: 650,
    currency: 'THB', // Was 120 RMB
    images: [PlaceHolderImages.find(p => p.id === 'leather-wallet')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'leather-wallet')?.imageHint || ''],
    seller: users[1],
    location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
    category: 'Accessories',
    shippingMethod: 'Seller Pays',
    likes: 88,
    favorites: 150,
  },
  {
    id: 'smart-watch',
    name: 'Gen-5 Smart Watch',
    description: 'A sleek smart watch with fitness tracking, notifications, and a vibrant display. Compatible with both Android and iOS.',
    price: 5250,
    currency: 'THB', // Was 150 USDT
    images: [PlaceHolderImages.find(p => p.id === 'smart-watch')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'smart-watch')?.imageHint || ''],
    seller: users[2],
    location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.7883, lng: 98.9853 },
    category: 'Electronics',
    shippingMethod: 'Buyer Pays',
    likes: 215,
    favorites: 430,
  },
  {
    id: 'wireless-headphones',
    name: 'Noise-Cancelling Headphones',
    description: 'Immerse yourself in sound with these premium noise-cancelling headphones. Long battery life and crystal-clear audio quality.',
    price: 8000,
    currency: 'THB',
    images: [PlaceHolderImages.find(p => p.id === 'wireless-headphones')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'wireless-headphones')?.imageHint || ''],
    seller: users[0],
    location: { city: 'Phuket', country: 'Thailand', countryCode: 'TH', lat: 7.8804, lng: 98.3923 },
    category: 'Electronics',
    shippingMethod: 'Seller Pays',
    likes: 180,
    favorites: 320,
  },
  {
    id: 'designer-sunglasses',
    name: 'Designer Sunglasses',
    description: 'Protect your eyes in style with these authentic designer sunglasses. 100% UV protection and a timeless design.',
    price: 2340,
    currency: 'THB', // was 450 RMB
    images: [PlaceHolderImages.find(p => p.id === 'designer-sunglasses')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'designer-sunglasses')?.imageHint || ''],
    seller: users[1],
    location: { city: 'Beijing', country: 'China', countryCode: 'CN', lat: 39.9042, lng: 116.4074 },
    category: 'Accessories',
    shippingMethod: 'Seller Pays',
    likes: 95,
    favorites: 180,
  },
  {
    id: 'gaming-console',
    name: 'Next-Gen Gaming Console',
    description: 'Experience the future of gaming with this powerful console. Barely used and comes with two controllers and all original cables.',
    price: 13200,
    currency: 'THB', // Was 400 USDT
    images: [PlaceHolderImages.find(p => p.id === 'gaming-console')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'gaming-console')?.imageHint || ''],
    seller: users[2],
    location: { city: 'Pattaya', country: 'Thailand', countryCode: 'TH', lat: 12.9246, lng: 100.8825 },
    category: 'Electronics',
    isConsignment: true,
    shippingMethod: 'Buyer Pays',
    likes: 500,
    favorites: 980,
  },
  {
    id: 'ceramic-vase',
    name: 'Hand-Painted Ceramic Vase',
    description: 'A beautiful, one-of-a-kind ceramic vase hand-painted by a local artist. A perfect centerpiece for any room.',
    price: 2500,
    currency: 'THB',
    images: [PlaceHolderImages.find(p => p.id === 'ceramic-vase')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'ceramic-vase')?.imageHint || ''],
    seller: users[0],
    location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.74, lng: 100.52 },
    category: 'Home Goods',
    shippingMethod: 'Buyer Pays',
    likes: 45,
    favorites: 80,
  },
  {
    id: 'mountain-bike',
    name: 'Pro Mountain Bike',
    description: 'A high-performance mountain bike with a lightweight aluminum frame and full suspension. Ready for any trail.',
    price: 25000,
    currency: 'THB',
    images: [PlaceHolderImages.find(p => p.id === 'mountain-bike')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'mountain-bike')?.imageHint || ''],
    seller: users[2],
    location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.8, lng: 99.0 },
    category: 'Sports & Outdoors',
    shippingMethod: 'Buyer Pays',
    likes: 120,
    favorites: 210,
  },
   {
    id: 'ukulele',
    name: 'Soprano Ukulele',
    description: 'A beautiful soprano ukulele with a warm, bright tone. Perfect for beginners and experienced players alike. Comes with a carrying case.',
    price: 2800,
    currency: 'THB',
    images: [PlaceHolderImages.find(p => p.id === 'ukulele')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'ukulele')?.imageHint || ''],
    seller: users[3],
    location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.75, lng: 100.51 },
    category: 'Musical Instruments',
    shippingMethod: 'Seller Pays',
    likes: 60,
    favorites: 110,
  },
  {
    id: 'drone',
    name: '4K Camera Drone',
    description: 'A high-quality quadcopter drone with a 4K camera. Stable flight, long battery life, and intuitive controls. Great for aerial photography and videography.',
    price: 15000,
    currency: 'THB',
    images: [PlaceHolderImages.find(p => p.id === 'drone')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'drone')?.imageHint || ''],
    seller: users[4],
    location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.79, lng: 98.99 },
    category: 'Electronics',
    shippingMethod: 'Buyer Pays',
    likes: 350,
    favorites: 600,
  },
  {
    id: 'espresso-machine',
    name: 'Semi-Automatic Espresso Machine',
    description: 'A semi-automatic espresso machine for making cafe-quality coffee at home. Features a powerful steam wand for frothing milk.',
    price: 1820,
    currency: 'THB', // Was 350 RMB
    images: [PlaceHolderImages.find(p => p.id === 'espresso-machine')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'espresso-machine')?.imageHint || ''],
    seller: users[5],
    location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.22, lng: 121.48 },
    category: 'Home Goods',
    shippingMethod: 'Seller Pays',
    likes: 190,
    favorites: 380,
  },
  {
    id: 'leather-backpack',
    name: 'Vintage Leather Backpack',
    description: 'A stylish and durable leather backpack with multiple compartments. Perfect for work, travel, or everyday use.',
    price: 6600,
    currency: 'THB', // Was 200 USDT
    images: [PlaceHolderImages.find(p => p.id === 'leather-backpack')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'leather-backpack')?.imageHint || ''],
    seller: users[6],
    location: { city: 'Pattaya', country: 'Thailand', countryCode: 'TH', lat: 12.93, lng: 100.89 },
    category: 'Accessories',
    shippingMethod: 'Buyer Pays',
    likes: 220,
    favorites: 450,
  },
];

const staffUsers = users.slice(10); // The 10 new staff users

const bbsPosts: BbsPost[] = [
    {
      id: 'xhs-post-1',
      title: '曼谷ins风咖啡厅天花板☕️ | 随便一拍就是大片!',
      content: `
姐妹们，挖到宝了！这家藏在Sukhumvit巷子里的咖啡厅也太好看了吧！😍
整体是纯白+原木风，阳光洒进来的时候，感觉整个人都在发光✨。

📸 **拍照Tips:**
1.  **窗边位置是王道！** 光线超好，怎么拍都好看。
2.  **利用楼梯和镜子。** 他们家有个旋转楼梯和很多落地镜，很适合拍全身照。
3.  **点一杯拿铁。** 拉花很精致，是绝佳的拍照道具。

🍰 **餐点推荐:**
-   **Dirty:** 咖啡和牛奶的分层超美，口感也很醇厚。
-   **巴斯克蛋糕:** 入口即化，甜而不腻，必点！

📍 **地址:** Luna Cafe, Sukhumvit 24, Bangkok
💰 **人均:** 200 THB

#曼谷咖啡厅 #曼谷旅游 #探店 #周末去哪儿 #拍照圣地 #ins风
      `,
      author: staffUsers[0],
      tags: ['曼谷咖啡厅', '探店', '拍照圣地'],
      replies: 199,
      likes: 2500,
      views: 55000,
      favorites: 1200,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-1/800/1000'],
      imageHints: ['cafe aesthetic'],
      isFeatured: true,
      location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7278, lng: 100.5241 },
    },
    {
      id: 'xhs-post-2',
      title: 'OOTD | 158小个子穿搭 · 废土风yyds！',
      content: `
今天穿这身走在路上被问了8遍！谁说小个子不能驾驭废土风？
Oversize的做旧外套搭配機能風馬甲，层次感一下就出来了。
下半身选择高腰工装裤，悄悄拉高腰线，视觉增高5cm！

🧥 **外套:** LUNA Vintage
🎽 **马甲:** CyberTech Gear
👖 **裤子:** TechWear Pro
👟 **鞋子:** [品牌]

#ootd #小个子穿搭 #废土风 #赛博朋克 #每日穿搭
      `,
      author: staffUsers[5],
      tags: ['OOTD', '穿搭', '废土风'],
      replies: 302,
      likes: 4200,
      views: 78000,
      favorites: 2100,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-2/800/1000'],
      imageHints: ['dystopian fashion'],
      isFeatured: true,
      location: { city: 'Beijing', country: 'China', countryCode: 'CN', lat: 39.9042, lng: 116.4074 },
    },
    {
        id: 'xhs-post-3',
        title: '开箱Vlog📹 | 新入手赛博猫窝，主子爽翻了！',
        content: `
铲屎官们看过来！给家里逆子新买的智能猫窝终于到了！
🛸 全自动清洁，解放双手！
🌀 内置新风系统，一点味道都没有。
🤖 还能APP远程监控，随时随地云吸猫。

我家主子刚开始还有点警惕，现在已经把它当皇宫了，笑死😂
推荐给所有想偷懒的铲屎官！

#宠物好物 #智能家居 #猫奴 #开箱 #赛博养猫
        `,
        author: staffUsers[1],
        tags: ['宠物好物', '智能家居', '开箱'],
        replies: 521,
        likes: 8900,
        views: 150000,
        favorites: 4500,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-3/800/1000'],
        imageHints: ['futuristic pet'],
        isFeatured: true,
        location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
    },
    {
        id: 'xhs-post-4',
        title: '清迈古城边的宝藏中古店🕰️ | Vintage爱好者必逛',
        content: `
来清迈N次，终于逛了这家传说中的中古店！
店面不大，但东西超全，从奢侈品包包到80年代的胶片机，应有尽有。
老板娘人超好，会跟你聊很多关于物件的故事。

我淘到了一个成色超棒的胶片相机，价格也很美丽！
喜欢淘货的姐妹们千万别错过！

#清迈旅游 #中古店 #vintage #好物分享 #泰国旅行
        `,
        author: staffUsers[2],
        tags: ['清迈', '中古店', 'Vintage'],
        replies: 88,
        likes: 1800,
        views: 42000,
        favorites: 900,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-4/800/1000'],
        imageHints: ['vintage shop'],
        location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.7883, lng: 98.9853 },
    },
    {
        id: 'xhs-post-5',
        title: '直男七夕礼物抄作业！这份科技感清单女友绝对爱！',
        content: `
兄弟们别再送花了！七夕送这些，女友夸你一整年！
整理了一份高颜值+实用性的科技礼物清单，直戳女生的心巴～

🎁 **清单:**
1.  **智能美妆镜:** 带灯光调节，化妆体验upup！
2.  **便携照片打印机:** 随时打印手机里的美照，超有纪念意义。
3.  **降噪耳机(粉色！):** 谁能拒绝一个粉色的降噪耳机呢？
4.  **香薰加湿器:** 氛围感神器，提升幸福感。

直接拿去抄！祝兄弟们都能过一个完美的七夕！❤️

#七夕礼物 #送女友礼物 #科技好物 #情侣 #礼物推荐
        `,
        author: staffUsers[3],
        tags: ['礼物', '科技', '七夕'],
        replies: 450,
        likes: 6200,
        views: 110000,
        favorites: 3100,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-5/800/1000'],
        imageHints: ['tech gifts'],
        isFeatured: true,
        location: { city: 'Shenzhen', country: 'China', countryCode: 'CN', lat: 22.5431, lng: 114.0579 },
    },
    {
        id: 'xhs-post-6',
        title: '普吉岛小众海滩攻略🌴 | 玻璃海，果冻浪！',
        content: `
避开人群，我私藏的普吉岛小众海滩，安静又出片！
这里的水质真的绝了，清澈见底，像玻璃一样。
沙子又细又白，踩上去软绵绵的。

📍 **地点:** Freedom Beach (需要坐长尾船或者徒步一小段)
🚤 **交通:** 从Patong海滩坐长尾船大概15分钟，400泰铢/人往返。

⚠️ **注意:**
-   带好防晒！
-   岛上只有一个小卖部，建议自备零食和水。
-   垃圾不落地，一起保护这片美丽的海滩。

#普吉岛 #泰国旅游 #小众景点 #海岛 #夏天
        `,
        author: staffUsers[4],
        tags: ['普吉岛', '旅游攻略', '海滩'],
        replies: 150,
        likes: 3800,
        views: 95000,
        favorites: 2200,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-6/800/1000'],
        imageHints: ['tropical beach'],
        location: { city: 'Phuket', country: 'Thailand', countryCode: 'TH', lat: 7.8804, lng: 98.3923 },
    },
    {
        id: 'xhs-post-7',
        title: '曼谷美食🌶️ | 这家街头泰式炒粉，好吃到我一周刷三次！',
        content: `
这绝对是我在曼谷吃过最好吃的Pad Thai！
不是那种迎合游客的甜腻口味，而是地道的泰式风味，酸辣咸香，锅气十足！
老板手速飞快，烟火缭绕，看着就是一种享受。

🔥 **必点:**
-   **大虾炒粉 (Pad Thai Goong Sod):** 虾给的超多，又大又新鲜！
-   再配上一杯冰镇的泰式奶茶，解辣又解腻。

📍 **店名:** Thip Samai (鬼门炒粉)
🤫 **提示:** 饭点排队人很多，建议错峰去。

#曼谷美食 #泰国美食 #街头小吃 #PadThai #吃货
        `,
        author: staffUsers[6],
        tags: ['曼谷美食', '街头小吃', '泰国'],
        replies: 280,
        likes: 5500,
        views: 130000,
        favorites: 2800,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-7/800/1000'],
        imageHints: ['street food'],
        location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7522, lng: 100.4977 },
    },
    {
      id: 'xhs-post-8',
      title: '沉浸式桌面搭建⌨️ | 我的赛博朋克工作站2.0',
      content: `
      耗时一个月，我的桌面改造计划终于完成！
      主题是赛博朋克 x 太空漫游，整体以深色调为主，搭配RGB灯光点缀。
      
      💡 **核心思路:**
      -   **多屏协作:** 一块带鱼屏 + 一块竖屏，写代码、查资料两不误。
      -   **光污染:** 用灯带、屏幕挂灯、RGB键盘鼠标垫打造氛围感。
      -   **无线化:** 尽量选择无线设备，保持桌面整洁。

      附上设备清单，欢迎大家抄作业～
      #桌面搭建 #desksetup #赛博朋克 #程序员 #EDC
      `,
      author: staffUsers[7],
      tags: ['桌面搭建', 'desksetup', '赛博朋克'],
      replies: 600,
      likes: 9800,
      views: 200000,
      favorites: 5500,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-8/800/1000'],
      imageHints: ['gaming setup'],
      location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.2304, lng: 121.4737 },
    },
    {
      id: 'xhs-post-9',
      title: '芭提雅骑行日记🏍️ | 逃离城市，感受风和自由',
      content: `
      租了一辆复古机车，沿着芭提雅的海岸线骑行了一天。
      海风吹在脸上的感觉真的太治愈了。
      远离了游客区，发现了很多宁静的观景台和本地小馆。
      
      如果你也喜欢骑行，强烈推荐这条路线！
      
      #芭提雅 #机车 #骑行 #旅行 #自由
      `,
      author: staffUsers[8],
      tags: ['芭提雅', '机车', '旅行'],
      replies: 120,
      likes: 2200,
      views: 60000,
      favorites: 1300,
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-9/800/1000'],
      imageHints: ['motorcycle journey'],
      location: { city: 'Pattaya', country: 'Thailand', countryCode: 'TH', lat: 12.9246, lng: 100.8825 },
    },
    {
      id: 'xhs-post-10',
      title: '成都慢生活🍵 | 在人民公园喝茶，感受巴适得板！',
      content: `
      来成都，一定要体验一次在公园里喝盖碗茶的悠闲。
      找个舒服的竹椅坐下，点一杯碧潭飘雪，看人来人往，掏掏耳朵。
      这才是成都的正确打开方式嘛！
      
      #成都 #成都旅游 #慢生活 #喝茶 #人民公园
      `,
      author: staffUsers[9],
      tags: ['成都', '慢生活', '喝茶'],
      replies: 95,
      likes: 1900,
      views: 45000,
      favorites: 1100,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-10/800/1000'],
      imageHints: ['tea house'],
      location: { city: 'Chengdu', country: 'China', countryCode: 'CN', lat: 30.5728, lng: 104.0668 },
    },
    {
      id: 'xhs-post-11',
      title: '曼谷夜市扫街全攻略 | Jodd Fairs夜市必吃榜！',
      content: `
      Jodd Fairs夜市也太好逛了叭！美食多到选择困难症发作！
      给你们整理了一份不踩雷必吃清单：
      
      🌋 **火山排骨:** 肉超多超烂糊，酸辣过瘾！
      🦑 **爆炒鱿鱼蛋:** 鱿鱼和蛋的完美结合，鲜！
      🥞 **水果西施:** 美女老板娘的煎饼，料足味美。
      🍉 **西瓜冰沙:** 夏日解暑神器！
      
      记得空着肚子来！
      #曼谷夜市 #joddfairs #泰国美食 #曼谷旅游
      `,
      author: staffUsers[0],
      tags: ['曼谷夜市', '美食', '攻略'],
      replies: 312,
      likes: 6800,
      views: 120000,
      favorites: 3500,
      createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-11/800/1000'],
      imageHints: ['night market food'],
      location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.75, lng: 100.55 },
    },
    {
      id: 'xhs-post-12',
      title: '赛博风改造计划 | 把我的旧iPad变成了透明探索版！',
      content: `
      旧的iPad mini压箱底太浪费，决定给它来个大改造！
      全程自己动手，拆机、换透明后壳，过程超解压。
      现在它变成了独一无二的透明版，科技感拉满！
      
      想看教程的姐妹扣1️⃣
      #DIY #改造 #赛博朋克 #iPad #极客
      `,
      author: staffUsers[1],
      tags: ['DIY', '改造', '赛博朋克'],
      replies: 780,
      likes: 12000,
      views: 250000,
      favorites: 6800,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      images: ['https://picsum.photos/seed/xhs-img-12/800/1000'],
      imageHints: ['transparent tech'],
      location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.23, lng: 121.47 },
    },
    {
        id: 'xhs-post-13',
        title: '我的泰国7-11必买清单🧾 | 好吃到停不下来！',
        content: `
        泰国的7-11简直是天堂！每次进去都拎着一大袋出来。
        分享一些我无限回购的宝藏零食和饮料：
        
        -   **NPB燕窝:** 便宜又好喝，每天一瓶。
        -   **烤吐司:** 热压的吐司夹着各种馅料，早餐首选！
        -   **Meiji草莓牛奶:** 甜甜的，童年的味道。
        -   **各种口味的乐事薯片:** 冬阴功味一定要试试！
        
        还有什么好吃的，姐妹们评论区补充呀！
        #泰国711 #泰国零食 #泰国旅游 #好吃到爆
        `,
        author: staffUsers[2],
        tags: ['泰国711', '零食', '攻略'],
        replies: 400,
        likes: 7200,
        views: 180000,
        favorites: 4000,
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-13/800/1000'],
        imageHints: ['convenience store snacks'],
        location: { city: 'Chiang Mai', country: 'Thailand', countryCode: 'TH', lat: 18.78, lng: 98.98 },
    },
    {
        id: 'xhs-post-14',
        title: '挑战24小时只用胶片相机拍照 | 深圳街拍',
        content: `
        放下数码相机，今天只用一台胶片机记录深圳。
        等待冲扫结果的过程，充满了未知的惊喜。
        胶片独特的质感和色彩，真的太有味道了。
        
        📷 **相机:** Contax T2
        🎞️ **胶卷:** Kodak Portra 400
        
        #胶片摄影 #街拍 #深圳 #复古 #filmphotography
        `,
        author: staffUsers[3],
        tags: ['胶片摄影', '街拍', '复古'],
        replies: 210,
        likes: 4500,
        views: 90000,
        favorites: 2500,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-14/800/1000'],
        imageHints: ['film photography city'],
        location: { city: 'Shenzhen', country: 'China', countryCode: 'CN', lat: 22.54, lng: 114.05 },
    },
    {
        id: 'xhs-post-15',
        title: '普吉岛跳岛游怎么选？| Racha+Coral岛一日游实录',
        content: `
        第一次来普吉，跳岛游路线太多，超纠结！
        最后选了皇帝岛(Racha)+珊瑚岛(Coral)一日游，体验感超棒！
        
        🏝️ **皇帝岛:** 水清沙幼，浮潜圣地，能看到超多小鱼！
        🐠 **珊瑚岛:** 水上项目多，拖曳伞、香蕉船都很好玩。
        
        一天玩下来很充实，推荐给第一次来普吉的朋友们！
        #普吉岛 #跳岛游 #浮潜 #旅游攻略 #泰国
        `,
        author: staffUsers[4],
        tags: ['普吉岛', '跳岛游', '旅游攻略'],
        replies: 180,
        likes: 3200,
        views: 85000,
        favorites: 1900,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-15/800/1000'],
        imageHints: ['island hopping'],
        location: { city: 'Phuket', country: 'Thailand', countryCode: 'TH', lat: 7.89, lng: 98.39 },
    },
    {
        id: 'xhs-post-16',
        title: '我的赛博风穿搭公式 | 3个Tips穿出未来感',
        content: `
        All Black太单调？试试这几个小技巧，轻松get赛博未来感！
        
        1.  **异材质拼接:** 皮革、金属、pvc，不同材质的碰撞超有层次感。
        2.  **金属配饰点缀:** 一条金属链条或者一个机能风的包包，立马提升细节。
        3.  **廓形单品:** 选择有设计感的廓形外套或裤子，气场全开！
        
        #穿搭 #赛博朋克 #机能风 #时尚
        `,
        author: staffUsers[5],
        tags: ['穿搭', '赛博朋克', '时尚'],
        replies: 250,
        likes: 5800,
        views: 115000,
        favorites: 3200,
        createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-16/800/1000'],
        imageHints: ['techwear fashion'],
        location: { city: 'Beijing', country: 'China', countryCode: 'CN', lat: 39.91, lng: 116.41 },
    },
    {
        id: 'xhs-post-17',
        title: '去泰国必做的马杀鸡！| 这家Spa我给100分！',
        content: `
        来泰国怎么能不做泰式按摩！
        这家Let's Relax Spa是连锁店，环境和服务都超棒，基本不会踩雷。
        我选的是草药球按摩，技师手法很专业，按完整个人都活过来了！
        
        做完还有免费的芒果糯米饭吃，也太幸福了吧！
        #泰式按摩 #马杀鸡 #曼谷 #泰国旅游 #Spa
        `,
        author: staffUsers[6],
        tags: ['泰式按摩', 'Spa', '曼谷'],
        replies: 220,
        likes: 4800,
        views: 100000,
        favorites: 2600,
        createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-17/800/1000'],
        imageHints: ['spa interior'],
        location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.73, lng: 100.52 },
    },
    {
        id: 'xhs-post-18',
        title: 'PS5游戏推荐 | 6款必玩大作，不好玩你打我！',
        content: `
        刚入手PS5不知道玩什么？
        作为一个资深玩家，给你们整理了6款必玩的PS5大作！
        
        1.  《赛博朋克2077》：体验夜之城的魅力。
        2.  《艾尔登法环》：魂系玩家的盛宴。
        3.  《战神：诸神黄昏》：史诗级的父子冒险。
        4.  《地平线：西之绝境》：绝美的画面和爽快的战斗。
        5.  《漫威蜘蛛侠2》：双蜘蛛侠，双倍快乐。
        6.  《最终幻想7：重生》：JRPG的巅峰之作。
        
        #PS5 #游戏推荐 #游戏 #赛博朋克2077 #艾尔登法环
        `,
        author: staffUsers[7],
        tags: ['PS5', '游戏推荐', '游戏'],
        replies: 800,
        likes: 15000,
        views: 300000,
        favorites: 8000,
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-18/800/1000'],
        imageHints: ['video game'],
        location: { city: 'Shanghai', country: 'China', countryCode: 'CN', lat: 31.22, lng: 121.48 },
    },
    {
        id: 'xhs-post-19',
        title: 'DIY复古像素时钟 | 摆在桌上真的太酷了！',
        content: `
        最近迷上了像素风，就自己动手DIY了一个复古像素时钟。
        可以显示时间、天气，还能播放像素动画，可玩性超高！
        成本不到200，但是成就感满满！
        
        #DIY #像素风 #桌面好物 #极客 #手工
        `,
        author: staffUsers[8],
        tags: ['DIY', '像素风', '桌面好物'],
        replies: 350,
        likes: 6500,
        views: 120000,
        favorites: 3500,
        createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-19/800/1000'],
        imageHints: ['pixel art clock'],
        location: { city: 'Pattaya', country: 'Thailand', countryCode: 'TH', lat: 12.93, lng: 100.87 },
    },
    {
        id: 'xhs-post-20',
        title: '成都中古探店 | 带你逛西南最大的中古市场！',
        content: `
        成都的中古市场真的太好逛了！
        这个市场很大，分好几个区域，家具、服饰、相机、黑胶唱片...什么都有！
        花一下午时间在这里寻宝，真的超有趣。
        
        我淘到了一堆80年代的中文杂志和一张邓丽君的黑胶，开心！
        
        #中古 #vintage #探店 #成都 #旧物仓
        `,
        author: staffUsers[9],
        tags: ['中古', '探店', '成都'],
        replies: 130,
        likes: 2800,
        views: 75000,
        favorites: 1500,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        images: ['https://picsum.photos/seed/xhs-img-20/800/1000'],
        imageHints: ['flea market'],
        location: { city: 'Chengdu', country: 'China', countryCode: 'CN', lat: 30.57, lng: 104.06 },
    }
];

export const mockAddresses: UserAddress[] = [
  {
    id: 'addr1',
    recipientName: 'Alex Doe',
    phone: '+66 81 234 5678',
    country: 'Thailand',
    province: 'Bangkok',
    city: 'Bangkok',
    addressLine1: '123 Cyberpunk Road, Sukhumvit Soi 11',
    postalCode: '10110',
    isDefault: true,
  },
  {
    id: 'addr2',
    recipientName: 'Alex Doe',
    phone: '+86 138 1234 5678',
    country: 'China',
    province: 'Shanghai',
    city: 'Shanghai',
    addressLine1: 'Room 101, No. 456 Neon Avenue, Pudong District',
    postalCode: '200120',
  },
];

export async function getProducts(): Promise<Product[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return products;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return products.find(p => p.id === id);
}

export async function getUsers(): Promise<User[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return users;
}

export async function getBbsPosts(): Promise<BbsPost[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return bbsPosts.map(post => ({
        ...post,
        // Convert string date to Date object for sorting if needed
        createdAt: new Date(post.createdAt)
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getBbsPostById(id: string): Promise<BbsPost | undefined> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  const post = bbsPosts.find(p => p.id === id);
  if (post) {
    return {
        ...post,
        createdAt: new Date(post.createdAt)
    }
  }
  return undefined;
}
