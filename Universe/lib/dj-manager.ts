/**
 * ============================================================
 * 月壤AI微宇宙 - DJ管理系统
 * ============================================================
 * 处理DJ预约、演出控制、状态同步
 */

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getDatabase,
  ref,
  set as rtdbSet,
  remove as rtdbRemove,
} from 'firebase/database';
import { initializeFirebase } from '@/firebase';
import { verifyNFT } from './nft-verification';
import type { DJTimeSlot, DJLiveState, DJRanking, DJTrack } from '../types';
import { FB_PATHS, DJ_MAX_SHOW_DURATION, DJ_BOOKING_ADVANCE_MS } from './constants';

// ==================== DJ 时间槽管理 ====================

/** 获取所有时间槽 */
export async function getAllTimeSlots(): Promise<DJTimeSlot[]> {
  const { firestore } = initializeFirebase();
  const q = query(
    collection(firestore, FB_PATHS.DJ_SLOTS),
    orderBy('startTime', 'asc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DJTimeSlot));
}

/** 获取 Realtime Database 实例 */
function getRtdb() {
  const { app } = initializeFirebase();
  return getDatabase(app);
}

/** 获取指定时间范围内的时间槽 */
export async function getTimeSlotsInRange(startTime: number, endTime: number): Promise<DJTimeSlot[]> {
  const { firestore } = initializeFirebase();
  const q = query(
    collection(firestore, FB_PATHS.DJ_SLOTS),
    where('startTime', '>=', startTime),
    where('startTime', '<=', endTime),
    orderBy('startTime', 'asc'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DJTimeSlot));
}

/** 创建新的时间槽（管理员功能） */
export async function createTimeSlot(slotData: Omit<DJTimeSlot, 'id' | 'createdAt'>): Promise<string> {
  const { firestore } = initializeFirebase();

  // 验证时间槽长度不超过最大限制
  const duration = slotData.endTime - slotData.startTime;
  if (duration > DJ_MAX_SHOW_DURATION) {
    throw new Error(`Show duration ${duration}ms exceeds maximum ${DJ_MAX_SHOW_DURATION}ms`);
  }

  const docRef = await addDoc(collection(firestore, FB_PATHS.DJ_SLOTS), {
    ...slotData,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/** 预约时间槽 */
export async function reserveTimeSlot(
  slotId: string,
  walletAddress: string,
  nftTokenId?: string,
  playlist?: DJTrack[],
): Promise<{
  success: boolean;
  error?: string;
  reservationId?: string;
}> {
  try {
    // 1. NFT验证
    const nftResult = await verifyNFT(walletAddress);
    if (!nftResult.valid) {
      return {
        success: false,
        error: 'NFT validation failed. You must hold the specified NFT to become a DJ.',
      };
    }

    // 2. 获取时间槽信息
    const { firestore } = initializeFirebase();
    const slotDoc = await getDoc(doc(firestore, FB_PATHS.DJ_SLOTS, slotId));
    if (!slotDoc.exists()) {
      return { success: false, error: 'Time slot not found' };
    }

    const slot = slotDoc.data() as DJTimeSlot;
    const now = Date.now();

    // 检查是否已经预约
    if (slot.djWallet) {
      return { success: false, error: 'This time slot is already reserved' };
    }

    // 检查时间槽是否在允许预约的范围内（最多提前48小时）
    if (slot.startTime < now) {
      return { success: false, error: 'Cannot reserve past time slots' };
    }

    if (slot.startTime > now + DJ_BOOKING_ADVANCE_MS) {
      return { success: false, error: 'Cannot reserve more than 48 hours in advance' };
    }

    // 3. 更新时间槽预约信息
    await updateDoc(doc(firestore, FB_PATHS.DJ_SLOTS, slotId), {
      djWallet: walletAddress,
      nftTokenId: nftTokenId || nftResult.tokenIds?.[0],
      playlist: playlist || [],
      status: 'reserved',
    });

    return { success: true, reservationId: slotId };
  } catch (error: any) {
    console.error('[DJ Reservation Error]', error);
    return {
      success: false,
      error: error.message || 'Reservation failed',
    };
  }
}

/** 取消时间槽预约 */
export async function cancelReservation(
  slotId: string,
  walletAddress: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = initializeFirebase();

    const slotDoc = await getDoc(doc(firestore, FB_PATHS.DJ_SLOTS, slotId));
    if (!slotDoc.exists()) {
      return { success: false, error: 'Time slot not found' };
    }

    const slot = slotDoc.data() as DJTimeSlot;

    if (slot.djWallet !== walletAddress) {
      return { success: false, error: 'You can only cancel your own reservations' };
    }

    await updateDoc(doc(firestore, FB_PATHS.DJ_SLOTS, slotId), {
      djWallet: null,
      nftTokenId: null,
      playlist: [],
      status: 'open',
    });

    return { success: true };
  } catch (error: any) {
    console.error('[DJ Cancellation Error]', error);
    return {
      success: false,
      error: error.message || 'Cancellation failed',
    };
  }
}

// ==================== DJ 演出控制 ====================

/** 开始DJ演出 */
export async function startDJShow(
  walletAddress: string,
  slotId: string,
  playlist: DJTrack[],
): Promise<{ success: boolean; showId?: string; error?: string }> {
  const { firestore } = initializeFirebase();

  // 1. 验证NFT持有（再次确认）
  const nftResult = await verifyNFT(walletAddress);
  if (!nftResult.valid) {
    return { success: false, error: 'NFT validation failed. Cannot start DJ show.' };
  }

  // 2. 获取时间槽信息
  const slotDoc = await getDoc(doc(firestore, FB_PATHS.DJ_SLOTS, slotId));
    if (!slotDoc.exists()) {
      return { success: false, error: 'Time slot not found' };
    }

  const slot = slotDoc.data() as DJTimeSlot;

  // 检查是否是预约的时间槽
  if (!slot.djWallet || slot.djWallet.toLowerCase() !== walletAddress.toLowerCase()) {
    return { success: false, error: 'You are not the DJ of this time slot' };
  }

  const now = Date.now();

  // 检查时间槽是否已开始或已结束
  if (slot.startTime > now + 5 * 60 * 1000) { // 最多提前5分钟开始
    return { success: false, error: 'Cannot start show more than 5 minutes early' };
  }

  if (slot.endTime < now) {
    return { success: false, error: 'Time slot has already ended' };
  }

  // 3. 创建DJ演出记录
    const showDocRef = await addDoc(collection(firestore, 'universe_dj_shows'), {
      slotId,
      walletAddress,
      nftTokenId: slot.djNftTokenId,
      playlist,
      status: 'live',
      startTime: now,
      endTime: slot.endTime,
      enthusiasmScore: 0,
      ratings: {},
      tips: [],
      chatCount: 0,
      danceCount: 0,
      createdAt: serverTimestamp(),
    });

  // 4. 更新 Realtime DB 中的DJ实时状态
  const rtdb = getRtdb();
  const djStateRef = ref(rtdb, FB_PATHS.PLAZA_DJ);

  const newDJState: DJLiveState = {
    isLive: true,
    djWallet: walletAddress,
    djName: nftResult.nfts?.[0]?.name ?? 'DJ',
    djNftAvatar: nftResult.nfts?.[0]?.image?.originalUrl || null,
    currentTrack: playlist[0] || null,
    trackIndex: 0,
    totalTracks: playlist.length,
    startedAt: now,
    endsAt: slot.endTime,
    ratings: {},
    tips: [],
    enthusiasmScore: 0,
    chatCount: 0,
    danceCount: 0,
  };

  // 写入 Realtime DB，让所有客户端实时收到DJ状态更新
  await rtdbSet(djStateRef, newDJState);

  return { success: true, showId: showDocRef.id };
}

/** 结束DJ演出 */
export async function stopDJShow(
  showId: string,
  walletAddress: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = initializeFirebase();
    const showDoc = await getDoc(doc(firestore, 'universe_dj_shows', showId));

    if (!showDoc.exists()) {
      return { success: false, error: 'DJ show not found' };
    }

    const show = showDoc.data() as any;
    if (show.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return { success: false, error: 'Only the DJ can end the show' };
    }

    await updateDoc(doc(firestore, 'universe_dj_shows', showId), {
      status: 'completed',
      endTime: Date.now(),
    });

    // 清除 Realtime DB 中的DJ实时状态（演出结束）
    const rtdb = getRtdb();
    const djStateRef = ref(rtdb, FB_PATHS.PLAZA_DJ);
    await rtdbSet(djStateRef, {
      isLive: false,
      djWallet: null,
      djName: null,
      djNftAvatar: null,
      currentTrack: null,
      trackIndex: 0,
      totalTracks: 0,
      startedAt: null,
      endsAt: null,
      ratings: {},
      tips: [],
      enthusiasmScore: 0,
      chatCount: 0,
      danceCount: 0,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[DJ Stop Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to stop DJ show',
    };
  }
}

// ==================== DJ 排行榜 ====================

/** 获取DJ排行榜（TOP 100） */
export async function getDJRanks(count: number = 100): Promise<DJRanking[]> {
  const { firestore } = initializeFirebase();
  const q = query(
    collection(firestore, FB_PATHS.DJ_RANKINGS),
    orderBy('totalScore', 'desc'),
    firestoreLimit(count),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d, i) => ({
    rank: i + 1,
    ...d.data(),
  } as unknown as DJRanking));
}

/** 更新DJ积分 */
export async function updateDJScore(
  walletAddress: string,
  showId: string,
  score: number,
  tips: number,
  chatCount: number,
  danceCount: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { firestore } = initializeFirebase();

    // 获取现有DJ排行榜数据
    const rankDoc = await getDoc(doc(firestore, FB_PATHS.DJ_RANKINGS, walletAddress));
    const showDoc = await getDoc(doc(firestore, 'universe_dj_shows', showId));

    if (!showDoc.exists()) {
      return { success: false, error: 'DJ show not found' };
    }

    const show = showDoc.data() as any;

    // 更新DJ排行榜
    if (rankDoc.exists()) {
      const existing = rankDoc.data() as DJRanking;
      await updateDoc(doc(firestore, FB_PATHS.DJ_RANKINGS, walletAddress), {
        totalScore: (existing.totalScore || 0) + score,
        totalTips: (existing.totalTips || 0) + tips,
        totalShows: (existing.totalShows || 0) + 1,
        averageRating: ((existing.averageRating || 0) + score) / 2,
        bestSingleScore: Math.max(existing.bestSingleScore || 0, score),
        title: getDJTitle(score),
        lastUpdated: serverTimestamp(),
      });
    } else {
      // 创建新的排行榜条目
      await setDoc(doc(firestore, FB_PATHS.DJ_RANKINGS, walletAddress), {
        walletAddress,
        displayName: show.djName || 'DJ',
        nftTokenId: show.nftTokenId,
        nftImageUrl: show.djNftAvatar,
        pixelAvatarUrl: await generatePixelAvatar(walletAddress, show.nftTokenId),
        totalScore: score,
        totalTips: tips,
        totalShows: 1,
        averageRating: score,
        bestSingleScore: score,
        title: getDJTitle(score),
        enthusiasmIndex: 0,
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }

    // 更新DJ演出记录
    await updateDoc(doc(firestore, 'universe_dj_shows', showId), {
      enthusiasmScore: calculateEnthusiasmScore(chatCount, danceCount),
      chatCount,
      danceCount,
    });

    return { success: true };
  } catch (error: any) {
    console.error('[DJ Score Update Error]', error);
    return {
      success: false,
      error: error.message || 'Failed to update DJ score',
    };
  }
}

// ==================== 辅助函数 ====================

/** 生成DJ称号 */
function getDJTitle(score: number): string {
  if (score >= 1000) return 'Legendary Overlord';
  if (score >= 500) return 'Master Selector';
  if (score >= 200) return 'Beat Commander';
  if (score >= 100) return 'Rhythm Knight';
  return 'Apprentice Mixer';
}

/** 计算热情指数 */
function calculateEnthusiasmScore(chatCount: number, danceCount: number): number {
  // 基本公式：(聊天数 + 跳舞数×2) × 在线AI比例
  return (chatCount + danceCount * 2);
}

/** 生成像素头像 */
async function generatePixelAvatar(walletAddress: string, nftTokenId?: string): Promise<string> {
  // 简化版：基于钱包地址生成随机像素头像
  // 实际应用中，这里应该使用NFT图像生成像素艺术

  const colors = [
    '#00ffff', '#ff00ff', '#ffff00', '#00ff00',
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1',
    '#dda0dd', '#f0e68c', '#87ceeb', '#98fb98',
  ];

  // 基于钱包地址生成可重复的随机颜色
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    hash = walletAddress.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex]; // 简化：只返回一个颜色
}