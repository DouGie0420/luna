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
