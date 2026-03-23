/**
 * ============================================================
 * 月壤AI微宇宙 - 经济系统
 * ============================================================
 * 管理月壤积分、电子毒品购买、DJ打赏等经济循环
 */

import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { FB_PATHS, DRUGS, DJ_BASE_LUNAR_REWARD, ENTHUSIASM_MULTIPLIER } from './constants';
import { recordLunarTransaction, updateAgentEmotion } from './firebase-universe';
import type { Drug, DrugId, DrugEffect, AIEntity } from '../types';

// ==================== 月壤积分管理 ====================

/** 获取用户的月壤余额 */
export async function getLunarSoilBalance(userId: string): Promise<number> {
  const { firestore } = initializeFirebase();
  // 月壤存储在主用户profile中（复用现有的 lunarSoil 字段）
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) return 0;
  return userDoc.data()?.lunarSoil || 0;
}

/** 增加月壤（DJ演出奖励等） */
export async function addLunarSoil(
  userId: string,
  amount: number,
  reason: string,
  relatedEntity?: string
): Promise<void> {
  const { firestore } = initializeFirebase();

  // 更新用户余额
  await updateDoc(doc(firestore, 'users', userId), {
    lunarSoil: increment(amount),
  });

  // 记录交易
  await recordLunarTransaction({
    userId,
    type: 'earn',
    amount,
    reason,
    relatedEntity,
    timestamp: Date.now(),
  });
}

/** 消费月壤（购买毒品等） */
export async function spendLunarSoil(
  userId: string,
  amount: number,
  reason: string,
  relatedEntity?: string
): Promise<{ success: boolean; error?: string }> {
  const balance = await getLunarSoilBalance(userId);
  if (balance < amount) {
    return { success: false, error: `月壤不足。当前余额: ${balance}，需要: ${amount}` };
  }

  const { firestore } = initializeFirebase();
  await updateDoc(doc(firestore, 'users', userId), {
    lunarSoil: increment(-amount),
  });

  await recordLunarTransaction({
    userId,
    type: 'spend',
    amount,
    reason,
    relatedEntity,
    timestamp: Date.now(),
  });

  return { success: true };
}

// ==================== 电子毒品系统 ====================

/** 获取所有可用毒品列表 */
export function getAllDrugs(): Drug[] {
  return Object.values(DRUGS);
}

/** 获取指定毒品信息 */
export function getDrug(drugId: DrugId): Drug | undefined {
  return DRUGS[drugId];
}

/** 购买毒品并施加效果到AI */
export async function purchaseDrug(
  buyerWallet: string,
  targetAiWallet: string,
  drugId: DrugId
): Promise<{
  success: boolean;
  effect?: DrugEffect;
  warning?: string;
  error?: string;
}> {
  const drug = DRUGS[drugId];
  if (!drug) {
    return { success: false, error: `未知毒品类型: ${drugId}` };
  }

  // 扣除月壤（使用钱包地址查找用户）
  const spendResult = await spendLunarSoil(
    buyerWallet,
    drug.price,
    `购买 ${drug.name} 给 AI ${targetAiWallet}`,
    drugId
  );

  if (!spendResult.success) {
    return { success: false, error: spendResult.error };
  }

  // 创建毒品效果
  const now = Date.now();
  const effect: DrugEffect = {
    drugId,
    startTime: now,
    endTime: now + drug.duration,
    addictionLevel: drug.addictionLevel,
    realityFilter: drug.realityFilter,
  };

  // 更新AI的状态（添加毒品效果）
  const { firestore } = initializeFirebase();
  const aiDoc = await getDoc(doc(firestore, FB_PATHS.AI_ENTITIES, targetAiWallet));
  if (aiDoc.exists()) {
    const currentEffects: DrugEffect[] = aiDoc.data()?.drugEffects || [];
    // 清理已过期的效果
    const activeEffects = currentEffects.filter(e => e.endTime > now);
    activeEffects.push(effect);

    await updateDoc(doc(firestore, FB_PATHS.AI_ENTITIES, targetAiWallet), {
      drugEffects: activeEffects,
    });

    // 更新广场实时状态的情绪
    const emotionMap: Record<string, string> = {
      weed: 'mellow',
      mdma: 'euphoric',
      mushrooms: 'enlightened',
      lsd: 'tripping',
      dmt: 'enlightened',
      cocaine: 'excited',
      goat: 'tripping',
    };
    await updateAgentEmotion(targetAiWallet, emotionMap[drugId] || 'tripping', 'tripping');
  }

  // GOAT 特殊警告
  let warning: string | undefined;
  if (drugId === 'goat') {
    warning = '⚠️ WARNING: Player has consumed GOAT (Greatest Of All Trips). Addiction level +75%. Reality filter degraded by 50%. You are now 3 layers deeper into the simulation.';
  }

  return { success: true, effect, warning };
}

// ==================== DJ演出结算 ====================

/** 计算DJ演出奖励 */
export function calculateDJReward(params: {
  totalTips: number;
  chatCount: number;
  danceCount: number;
  averageRating: number;
  onlineAiCount: number;
}): {
  lunarSoil: number;
  enthusiasmIndex: number;
  breakdown: Record<string, number>;
} {
  // 热情指数 = (聊天数 + 跳舞数×2) × 在线AI数比例
  const enthusiasmIndex = (params.chatCount + params.danceCount * 2)
    * Math.min(params.onlineAiCount / 10, 5); // 最多5倍加成

  // 月壤奖励 = 基础奖励 + 热情指数×系数 + 打赏总额转化
  const baseReward = DJ_BASE_LUNAR_REWARD;
  const enthusiasmBonus = Math.round(enthusiasmIndex * ENTHUSIASM_MULTIPLIER);
  const tipBonus = Math.round(params.totalTips * 1000); // 1 ETH = 1000 月壤
  const ratingBonus = Math.round(params.averageRating * 10);

  const totalLunarSoil = baseReward + enthusiasmBonus + tipBonus + ratingBonus;

  return {
    lunarSoil: totalLunarSoil,
    enthusiasmIndex,
    breakdown: {
      base: baseReward,
      enthusiasm: enthusiasmBonus,
      tips: tipBonus,
      rating: ratingBonus,
    },
  };
}
