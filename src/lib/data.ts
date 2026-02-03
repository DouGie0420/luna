import type { Product, User, KycStatus, BbsPost, UserAddress, Order } from './types';
import { PlaceHolderImages } from './placeholder-images';

// All mock data is removed. Functions now return empty arrays.
// This ensures that any component still relying on this file will not display
// stale or incorrect data, forcing a switch to live Firestore data.

export async function getMockOrders(): Promise<Order[]> {
  return [];
}

export async function getMockOrderById(id: string): Promise<Order | undefined> {
  return undefined;
}

export async function getProducts(): Promise<Product[]> {
  return [];
}

export async function getProductById(id: string): Promise<Product | undefined> {
  return undefined;
}

export async function getUsers(): Promise<User[]> {
  return [];
}

export async function getUserById(id: string): Promise<User | undefined> {
  return undefined;
}

export async function getBbsPosts(): Promise<BbsPost[]> {
  return [];
}

export async function getBbsPostById(id: string): Promise<BbsPost | undefined> {
  return undefined;
}

export const mockAddresses: UserAddress[] = [];
