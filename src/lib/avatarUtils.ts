/**
 * 头像系统工具函数
 */

import type { AvatarType, UserType } from './types';

/**
 * 生成像素头像URL（CryptoPunks风格）
 */
export function generatePixelAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}&style=pixel-art&backgroundColor=0a0a0f`;
}

/**
 * 获取用户头像URL
 */
export function getUserAvatarUrl(profile: {
  avatarType?: AvatarType;
  pixelAvatarSeed?: string;
  customAvatarUrl?: string;
  nftAvatarUrl?: string;
  photoURL?: string;
  uid: string;
}): string {
  // 优先级：NFT > 自定义 > 像素 > 默认
  if (profile.avatarType === 'nft' && profile.nftAvatarUrl) {
    return profile.nftAvatarUrl;
  }
  
  if (profile.avatarType === 'custom' && profile.customAvatarUrl) {
    return profile.customAvatarUrl;
  }
  
  if (profile.avatarType === 'pixel' && profile.pixelAvatarSeed) {
    return generatePixelAvatar(profile.pixelAvatarSeed);
  }
  
  // 兼容旧数据
  if (profile.photoURL) {
    return profile.photoURL;
  }
  
  // 默认使用用户ID生成像素头像
  return generatePixelAvatar(profile.uid);
}

/**
 * 检查用户是否可以自定义头像
 */
export function canCustomizeAvatar(userType?: UserType): boolean {
  return userType === 'pro';
}

/**
 * 勋章定义
 */
export const BADGES = {
  WEB3: {
    id: 'web3',
    name: 'WEB3',
    icon: '🔗',
    description: 'Connected Web3 wallet',
    color: 'text-blue-400'
  },
  NFT: {
    id: 'nft',
    name: 'NFT',
    icon: '🖼️',
    description: 'Using NFT as avatar',
    color: 'text-purple-400'
  },
  PRO: {
    id: 'pro',
    name: 'PRO',
    icon: '⭐',
    description: 'PRO merchant',
    color: 'text-yellow-400'
  },
  VERIFIED: {
    id: 'verified',
    name: 'VERIFIED',
    icon: '✓',
    description: 'Verified user',
    color: 'text-green-400'
  }
} as const;

/**
 * 检查用户是否拥有勋章
 */
export function hasBadge(badges: string[] | undefined, badgeId: string): boolean {
  return badges?.includes(badgeId) ?? false;
}

/**
 * 格式化钱包地址
 */
export function formatWalletAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 检查商品是否被锁定
 */
export function isProductLocked(lock: {
  status: string;
  expiresAt: any;
} | null): boolean {
  if (!lock || lock.status !== 'locked') return false;
  
  const now = new Date();
  const expiresAt = lock.expiresAt?.toDate?.() || new Date(lock.expiresAt);
  
  return expiresAt > now;
}

/**
 * 获取锁定剩余时间（秒）
 */
export function getLockRemainingTime(expiresAt: any): number {
  const now = new Date();
  const expires = expiresAt?.toDate?.() || new Date(expiresAt);
  const remaining = Math.floor((expires.getTime() - now.getTime()) / 1000);
  
  return Math.max(0, remaining);
}

/**
 * 格式化剩余时间
 */
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
