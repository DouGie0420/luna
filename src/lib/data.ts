import type { Product, User } from './types';
import { PlaceHolderImages } from './placeholder-images';

const users: User[] = [
  {
    id: 'user1',
    name: 'Alex Doe',
    avatarUrl: 'https://images.unsplash.com/photo-1581094119822-2c5950a21345?q=80&w=100&auto=format&fit=crop',
    rating: 4.8,
    reviews: 120,
  },
  {
    id: 'user2',
    name: 'Billie Jean',
    avatarUrl: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=100&auto=format&fit=crop',
    rating: 4.9,
    reviews: 85,
  },
  {
    id: 'user3',
    name: 'Charlie Brown',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop',
    rating: 4.5,
    reviews: 42,
  },
  {
    id: 'user4',
    name: 'Diana Prince',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
    rating: 4.9,
    reviews: 210,
  },
  {
    id: 'user5',
    name: 'Ethan Hunt',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=100&auto=format&fit=crop',
    rating: 4.7,
    reviews: 150,
  },
  {
    id: 'user6',
    name: 'Fiona Glenanne',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=100&auto=format&fit=crop',
    rating: 4.8,
    reviews: 95,
  },
  {
    id: 'user7',
    name: 'George Costanza',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop',
    rating: 4.3,
    reviews: 33,
  },
  {
    id: 'user8',
    name: 'Helen Troy',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100&auto=format&fit=crop',
    rating: 5.0,
    reviews: 18,
  },
  {
    id: 'user9',
    name: 'Ivan Drago',
    avatarUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=100&auto=format&fit=crop',
    rating: 4.6,
    reviews: 78,
  },
  {
    id: 'user10',
    name: 'Jane Smith',
    avatarUrl: 'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=100&auto=format&fit=crop',
    rating: 4.9,
    reviews: 132,
  },
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
    location: { city: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
    category: 'Electronics',
  },
  {
    id: 'leather-wallet',
    name: 'Handmade Leather Wallet',
    description: 'A durable and stylish wallet crafted from genuine full-grain leather. Ages beautifully and holds all your essentials.',
    price: 120,
    currency: 'RMB',
    images: [PlaceHolderImages.find(p => p.id === 'leather-wallet')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'leather-wallet')?.imageHint || ''],
    seller: users[1],
    location: { city: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
    category: 'Accessories',
  },
  {
    id: 'smart-watch',
    name: 'Gen-5 Smart Watch',
    description: 'A sleek smart watch with fitness tracking, notifications, and a vibrant display. Compatible with both Android and iOS.',
    price: 150,
    currency: 'USDT',
    images: [PlaceHolderImages.find(p => p.id === 'smart-watch')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'smart-watch')?.imageHint || ''],
    seller: users[2],
    location: { city: 'Chiang Mai', country: 'Thailand', lat: 18.7883, lng: 98.9853 },
    category: 'Electronics',
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
    location: { city: 'Phuket', country: 'Thailand', lat: 7.8804, lng: 98.3923 },
    category: 'Electronics',
  },
  {
    id: 'designer-sunglasses',
    name: 'Designer Sunglasses',
    description: 'Protect your eyes in style with these authentic designer sunglasses. 100% UV protection and a timeless design.',
    price: 450,
    currency: 'RMB',
    images: [PlaceHolderImages.find(p => p.id === 'designer-sunglasses')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'designer-sunglasses')?.imageHint || ''],
    seller: users[1],
    location: { city: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
    category: 'Accessories',
  },
  {
    id: 'gaming-console',
    name: 'Next-Gen Gaming Console',
    description: 'Experience the future of gaming with this powerful console. Barely used and comes with two controllers and all original cables.',
    price: 400,
    currency: 'USDT',
    images: [PlaceHolderImages.find(p => p.id === 'gaming-console')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'gaming-console')?.imageHint || ''],
    seller: users[2],
    location: { city: 'Pattaya', country: 'Thailand', lat: 12.9246, lng: 100.8825 },
    category: 'Electronics',
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
    location: { city: 'Bangkok', country: 'Thailand', lat: 13.74, lng: 100.52 },
    category: 'Home Goods',
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
    location: { city: 'Chiang Mai', country: 'Thailand', lat: 18.8, lng: 99.0 },
    category: 'Sports & Outdoors',
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
    location: { city: 'Bangkok', country: 'Thailand', lat: 13.75, lng: 100.51 },
    category: 'Musical Instruments',
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
    location: { city: 'Chiang Mai', country: 'Thailand', lat: 18.79, lng: 98.99 },
    category: 'Electronics',
  },
  {
    id: 'espresso-machine',
    name: 'Semi-Automatic Espresso Machine',
    description: 'A semi-automatic espresso machine for making cafe-quality coffee at home. Features a powerful steam wand for frothing milk.',
    price: 350,
    currency: 'RMB',
    images: [PlaceHolderImages.find(p => p.id === 'espresso-machine')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'espresso-machine')?.imageHint || ''],
    seller: users[5],
    location: { city: 'Shanghai', country: 'China', lat: 31.22, lng: 121.48 },
    category: 'Home Goods',
  },
  {
    id: 'leather-backpack',
    name: 'Vintage Leather Backpack',
    description: 'A stylish and durable leather backpack with multiple compartments. Perfect for work, travel, or everyday use.',
    price: 200,
    currency: 'USDT',
    images: [PlaceHolderImages.find(p => p.id === 'leather-backpack')?.imageUrl || ''],
    imageHints: [PlaceHolderImages.find(p => p.id === 'leather-backpack')?.imageHint || ''],
    seller: users[6],
    location: { city: 'Pattaya', country: 'Thailand', lat: 12.93, lng: 100.89 },
    category: 'Accessories',
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
