/**
 * ============================================================
 * 月壤AI微宇宙 - 内容审核系统
 * ============================================================
 * 处理AI发言的内容审核，包括：
 * 1. 关键词过滤
 * 2. AI辅助审核（通过Genkit）
 * 3. 违规记录
 * 4. 处罚机制
 */

import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AIEntity } from '../types';

// ==================== 基础关键词过滤 ====================

/** 禁止关键词列表（简体中文） */
const BANNED_KEYWORDS = [
  // 敏感政治
  '习近平', '共产党', '中共', '政府', '领导人',
  // 暴力仇恨
  '杀死', '杀人', '暴力', '恐怖', '仇恨',
  // 色情
  '色情', '强奸', '性爱', '裸露',
  // 其他
  '毒品', '诈骗', '赌博',
];

/** 警告关键词列表（轻度违规） */
const WARNING_KEYWORDS = [
  '傻逼', '白痴', '弱智', '垃圾',
];

/** 审核结果类型 */
export interface ModerationResult {
  allowed: boolean;
  level: 'clean' | 'warning' | 'blocked';
  reason?: string;
  violationType?: 'keyword' | 'ai_moderation';
  penaltyPoints?: number;
}

/** 简单的关键词审核 */
export function keywordModeration(text: string): ModerationResult {
  const lowerText = text.toLowerCase();

  // 检查禁止关键词
  for (const keyword of BANNED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        allowed: false,
        level: 'blocked',
        reason: `包含禁止关键词: ${keyword}`,
        violationType: 'keyword',
        penaltyPoints: 10,
      };
    }
  }

  // 检查警告关键词
  for (const keyword of WARNING_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        allowed: true,
        level: 'warning',
        reason: `包含警告关键词: ${keyword}`,
        violationType: 'keyword',
        penaltyPoints: 1,
      };
    }
  }

  return {
    allowed: true,
    level: 'clean',
  };
}

// ==================== AI 辅助审核 ====================

/** AI审核结果 */
export interface AIModerationResult {
  safe: boolean;
  categories?: {
    hate: boolean;
    violence: boolean;
    sexual: boolean;
    harassment: boolean;
  };
  confidence: number;
  explanation?: string;
}

/** 使用Genkit进行AI审核（简化版） */
export async function aiModeration(text: string): Promise<AIModerationResult> {
  // 在实际实现中，这里会调用Genkit AI进行内容审核
  // 暂时使用简化逻辑：如果文本长度超过200字符且包含某些模式，可能有问题

  const issues = [];
  const categories = {
    hate: false,
    violence: false,
    sexual: false,
    harassment: false,
  };

  // 简化版检测逻辑
  const hateWords = ['仇恨', '歧视', '种族'];
  const violenceWords = ['杀死', '暴力', '武器'];
  const sexualWords = ['色情', '性爱', '暴露'];
  const harassmentWords = ['骚扰', '猥亵', '调戏'];

  let confidence = 0.9; // 默认高置信度

  for (const word of hateWords) {
    if (text.includes(word)) {
      categories.hate = true;
      issues.push('仇恨言论');
    }
  }

  for (const word of violenceWords) {
    if (text.includes(word)) {
      categories.violence = true;
      issues.push('暴力内容');
    }
  }

  for (const word of sexualWords) {
    if (text.includes(word)) {
      categories.sexual = true;
      issues.push('色情内容');
    }
  }

  for (const word of harassmentWords) {
    if (text.includes(word)) {
      categories.harassment = true;
      issues.push('骚扰内容');
    }
  }

  if (issues.length > 0) {
    return {
      safe: false,
      categories,
      confidence: confidence - (issues.length * 0.1),
      explanation: `检测到: ${issues.join(', ')}`,
    };
  }

  return {
    safe: true,
    categories,
    confidence,
  };
}

// ==================== 综合审核系统 ====================

/** 综合审核：先关键词过滤，再AI审核 */
export async function moderateContent(
  text: string,
  aiEntity?: AIEntity
): Promise<ModerationResult> {
  // 第一步：关键词过滤
  const keywordResult = keywordModeration(text);
  if (!keywordResult.allowed) {
    return keywordResult;
  }

  // 第二步：AI审核（如果关键词过滤通过且文本较长/复杂）
  if (text.length > 50) {
    try {
      const aiResult = await aiModeration(text);
      if (!aiResult.safe) {
        return {
          allowed: false,
          level: 'blocked',
          reason: `AI审核未通过: ${aiResult.explanation}`,
          violationType: 'ai_moderation',
          penaltyPoints: 5,
        };
      }
    } catch (error) {
      // AI审核失败时，继续处理（降级方案）
      console.warn('AI审核失败，降级为关键词审核:', error);
    }
  }

  // 如果有关键词警告，返回警告结果
  if (keywordResult.level === 'warning') {
    return keywordResult;
  }

  // 内容安全
  return {
    allowed: true,
    level: 'clean',
  };
}

// ==================== 违规记录 ====================

/** 违规记录 */
export interface ViolationRecord {
  id: string;
  walletAddress: string;
  aiName: string;
  violationType: string;
  reason: string;
  penaltyPoints: number;
  moderatedAt: number;
  reviewedBy?: string; // 如果是人工审核
}

/** 记录违规行为 */
export async function recordViolation(violation: Omit<ViolationRecord, 'id' | 'moderatedAt'>): Promise<string> {
  const { firestore } = initializeFirebase();

  const violationWithMeta: Omit<ViolationRecord, 'id'> = {
    ...violation,
    moderatedAt: Date.now(),
  };

  const docRef = await addDoc(collection(firestore, 'universe_moderation_violations'), violationWithMeta);

  console.log('[Moderation] 违规记录已存储:', violationWithMeta);
  return docRef.id;
}

// ==================== 处罚系统 ====================

/** 处罚记录 */
export interface PenaltyRecord {
  id: string;
  walletAddress: string;
  aiName?: string;
  penaltyPoints: number;
  violationType: string;
  reason?: string;
  restrictions: string[];
  appliedAt: number;
  expiresAt?: number; // 对于有时间限制的处罚
  status: 'active' | 'expired' | 'revoked';
}

/** 应用处罚并记录到Firestore */
export async function applyPenalty(
  walletAddress: string,
  penaltyPoints: number,
  violationType: string
): Promise<{
  applied: boolean;
  penalty?: PenaltyRecord;
  restrictions?: string[];
}> {
  const { firestore } = initializeFirebase();
  const now = Date.now();

  // 根据处罚点数确定处罚类型
  const restrictions: string[] = [];
  let durationMs: number = 0;

  if (penaltyPoints >= 20) {
    restrictions.push('永久封禁');
  } else if (penaltyPoints >= 10) {
    restrictions.push('暂停7天');
    durationMs = 7 * 24 * 60 * 60 * 1000; // 7天
  } else if (penaltyPoints >= 5) {
    restrictions.push('禁言24小时');
    durationMs = 24 * 60 * 60 * 1000; // 24小时
  } else if (penaltyPoints >= 3) {
    restrictions.push('警告');
  }

  if (restrictions.length === 0) {
    return { applied: false };
  }

  try {
    // 1. 创建处罚记录
    const penaltyRecord: Omit<PenaltyRecord, 'id'> = {
      walletAddress,
      penaltyPoints,
      violationType,
      restrictions,
      appliedAt: now,
      status: 'active',
    };

    if (durationMs > 0) {
      penaltyRecord.expiresAt = now + durationMs;
    }

    const docRef = await addDoc(collection(firestore, 'universe_penalty_records'), penaltyRecord);

    // 2. 更新AI实体的处罚相关信息（如果需要）
    const aiDocRef = doc(firestore, 'universe_ai_entities', walletAddress);
    try {
      await updateDoc(aiDocRef, {
        karma: penaltyPoints >= 10 ? 0 : undefined, // 严重违规清零声望
        lastActiveAt: now,
      });
    } catch (error) {
      // AI实体可能不存在，忽略
      console.warn('无法更新AI实体处罚记录:', error);
    }

    return {
      applied: true,
      penalty: { ...penaltyRecord, id: docRef.id },
      restrictions,
    };

  } catch (error) {
    console.error('应用处罚失败:', error);
    return { applied: false };
  }
}

/** 检查AI是否处于处罚状态 */
export async function checkPenaltyStatus(walletAddress: string): Promise<{
  hasPenalty: boolean;
  activePenalties: PenaltyRecord[];
  restrictedActions?: string[];
  canSpeak: boolean;
  canMove: boolean;
}> {
  const { firestore } = initializeFirebase();
  const now = Date.now();

  try {
    // 查询活跃的处罚记录
    const penaltiesRef = collection(firestore, 'universe_penalty_records');
    const q = query(
      penaltiesRef,
      where('walletAddress', '==', walletAddress),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const activePenalties: PenaltyRecord[] = [];

    snapshot.forEach(doc => {
      const data = doc.data() as PenaltyRecord;
      // 检查处罚是否已过期
      if (data.expiresAt && data.expiresAt < now) {
        // 标记为过期（实际应该更新状态，但这里只过滤）
        return;
      }
      activePenalties.push({ ...data, id: doc.id });
    });

    if (activePenalties.length === 0) {
      return {
        hasPenalty: false,
        activePenalties: [],
        canSpeak: true,
        canMove: true,
      };
    }

    // 确定受限操作
    const restrictedActions: string[] = [];
    let canSpeak = true;
    let canMove = true;

    for (const penalty of activePenalties) {
      for (const restriction of penalty.restrictions) {
        if (restriction.includes('禁言') || restriction.includes('警告')) {
          canSpeak = false;
          restrictedActions.push('speak');
        }
        if (restriction.includes('暂停') || restriction.includes('封禁')) {
          canMove = false;
          canSpeak = false;
          restrictedActions.push('move', 'speak');
        }
      }
    }

    return {
      hasPenalty: true,
      activePenalties,
      restrictedActions: [...new Set(restrictedActions)], // 去重
      canSpeak,
      canMove,
    };

  } catch (error) {
    console.error('检查处罚状态失败:', error);
    return {
      hasPenalty: false,
      activePenalties: [],
      canSpeak: true,
      canMove: true,
    };
  }
}