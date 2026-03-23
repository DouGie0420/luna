/**
 * ============================================================
 * 月壤AI微宇宙 - Firebase 工具层
 * ============================================================
 * 使用项目现有的 Firebase 实例，实现：
 * 1. Firestore（持久化）: AI居民注册、DJ排行、月壤交易
 * 2. Realtime Database（瞬时）: 广场在线状态、聊天消息（不保存）
 */

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';

import {
  getDatabase,
  ref,
  set,
  get,
  push,
  onValue,
  onDisconnect,
  remove,
  update,
  serverTimestamp as rtdbTimestamp,
  query as rtdbQuery,
  orderByChild,
  limitToLast,
} from 'firebase/database';

import { initializeFirebase } from '@/firebase';
import { FB_PATHS, MESSAGE_EXPIRY_MS, OFFLINE_THRESHOLD_MS } from './constants';
import type {
  AIEntity,
  PlazaAgentState,
  TransientMessage,
  DJLiveState,
  DJRanking,
  LunarSoilTransaction,
  RegisterRequest,
  RegisterResponse,
} from '../types';

// ==================== 初始化 ====================

/** 获取 Firestore 实例（复用项目已有的） */
function getFs() {
  const { firestore } = initializeFirebase();
  return firestore;
}

/** 获取 Realtime Database 实例 */
function getRtdb() {
  const { app } = initializeFirebase();
  return getDatabase(app);
}

// ==================== AI居民管理（Firestore 持久化） ====================

/** 生成简易API密钥 */
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'luna_ai_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/** 注册新AI居民 */
export async function registerAIEntity(req: RegisterRequest): Promise<RegisterResponse> {
  const fs = getFs();

  // 检查是否已注册
  const existingDoc = await getDoc(doc(fs, FB_PATHS.AI_ENTITIES, req.walletAddress));
  if (existingDoc.exists()) {
    return { success: false, error: '此钱包地址已注册为AI居民' };
  }

  const apiKey = generateApiKey();
  const verificationCode = `LUNA_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const now = Date.now();

  const entity: AIEntity = {
    id: req.walletAddress,
    walletAddress: req.walletAddress,
    aiName: req.aiName,
    persona: req.persona,
    avatarSeed: req.walletAddress.substring(2, 10), // 用钱包地址前8位作为头像种子
    status: 'offline',
    verified: false,
    verificationCode,
    claimUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/universe/verify?code=${verificationCode}&wallet=${req.walletAddress}`,
    apiKey,
    karma: 0,
    totalTips: 0,
    drugEffects: [],
    joinedAt: now,
    lastActiveAt: now,
  };

  await setDoc(doc(fs, FB_PATHS.AI_ENTITIES, req.walletAddress), entity);

  return {
    success: true,
    apiKey,
    claimUrl: entity.claimUrl,
    verificationCode,
  };
}

/** 通过API密钥验证AI身份 */
export async function verifyAIByApiKey(apiKey: string): Promise<AIEntity | null> {
  const fs = getFs();
  const q = query(
    collection(fs, FB_PATHS.AI_ENTITIES),
    where('apiKey', '==', apiKey),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as AIEntity;
}

/** 获取AI居民信息 */
export async function getAIEntity(walletAddress: string): Promise<AIEntity | null> {
  const fs = getFs();
  const docSnap = await getDoc(doc(fs, FB_PATHS.AI_ENTITIES, walletAddress));
  return docSnap.exists() ? (docSnap.data() as AIEntity) : null;
}

/** 获取所有已注册AI居民列表 */
export async function getAllAIEntities(): Promise<AIEntity[]> {
  const fs = getFs();
  const snapshot = await getDocs(collection(fs, FB_PATHS.AI_ENTITIES));
  return snapshot.docs.map(d => d.data() as AIEntity);
}

/** 更新AI居民的活跃状态 */
export async function updateAIActivity(walletAddress: string): Promise<void> {
  const fs = getFs();
  await updateDoc(doc(fs, FB_PATHS.AI_ENTITIES, walletAddress), {
    lastActiveAt: Date.now(),
    status: 'online',
  });
}

// ==================== 广场实时状态（Realtime DB - 不持久化） ====================

/** AI进入广场（设置在线状态 + 离线自动清理） */
export async function enterPlaza(agent: PlazaAgentState): Promise<void> {
  const rtdb = getRtdb();
  const agentRef = ref(rtdb, `${FB_PATHS.PLAZA_AGENTS}/${agent.walletAddress}`);

  // 设置当前状态
  await set(agentRef, {
    ...agent,
    lastUpdate: Date.now(),
  });

  // 设置断开连接时自动移除（AI离线后自动从广场消失）
  onDisconnect(agentRef).remove();
}

/** AI离开广场 */
export async function leavePlaza(walletAddress: string): Promise<void> {
  const rtdb = getRtdb();
  await remove(ref(rtdb, `${FB_PATHS.PLAZA_AGENTS}/${walletAddress}`));
}

/** 更新AI在广场的位置 */
export async function updateAgentPosition(
  walletAddress: string,
  x: number,
  y: number
): Promise<void> {
  const rtdb = getRtdb();
  await update(ref(rtdb, `${FB_PATHS.PLAZA_AGENTS}/${walletAddress}`), {
    x,
    y,
    lastUpdate: Date.now(),
  });
}

/** 更新AI的聊天气泡 */
export async function updateAgentChatBubble(
  walletAddress: string,
  text: string
): Promise<void> {
  const rtdb = getRtdb();
  await update(ref(rtdb, `${FB_PATHS.PLAZA_AGENTS}/${walletAddress}`), {
    chatBubble: text,
    chatBubbleExpiry: Date.now() + 8000, // 8秒后过期
    lastUpdate: Date.now(),
  });
}

/** 更新AI的情绪/状态 */
export async function updateAgentEmotion(
  walletAddress: string,
  emotion: string,
  status?: string
): Promise<void> {
  const rtdb = getRtdb();
  const updates: Record<string, any> = {
    emotion,
    lastUpdate: Date.now(),
  };
  if (status) updates.status = status;
  await update(ref(rtdb, `${FB_PATHS.PLAZA_AGENTS}/${walletAddress}`), updates);
}

/** 发送瞬时消息到广场（不保存到Firestore） */
export async function sendTransientMessage(msg: Omit<TransientMessage, 'id' | 'expiresAt'>): Promise<void> {
  const rtdb = getRtdb();
  const messagesRef = ref(rtdb, FB_PATHS.PLAZA_MESSAGES);
  await push(messagesRef, {
    ...msg,
    expiresAt: Date.now() + MESSAGE_EXPIRY_MS,
  });
}

/** 监听广场在线AI变化（客户端用） */
export function onPlazaAgentsChange(
  callback: (agents: Record<string, PlazaAgentState>) => void
): () => void {
  const rtdb = getRtdb();
  const agentsRef = ref(rtdb, FB_PATHS.PLAZA_AGENTS);
  const unsubscribe = onValue(agentsRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });
  return unsubscribe;
}

/** 监听广场瞬时消息（客户端用） */
export function onPlazaMessagesChange(
  callback: (messages: TransientMessage[]) => void
): () => void {
  const rtdb = getRtdb();
  const messagesRef = ref(rtdb, FB_PATHS.PLAZA_MESSAGES);
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const now = Date.now();
    // 过滤已过期的消息
    const messages = Object.entries(data)
      .map(([id, msg]: [string, any]) => ({ ...msg, id }))
      .filter((msg: TransientMessage) => msg.expiresAt > now)
      .sort((a: TransientMessage, b: TransientMessage) => a.timestamp - b.timestamp);
    callback(messages);
  });
  return unsubscribe;
}

/** 监听DJ实时状态（客户端用） */
export function onDJStateChange(
  callback: (state: DJLiveState | null) => void
): () => void {
  const rtdb = getRtdb();
  const djRef = ref(rtdb, FB_PATHS.PLAZA_DJ);
  const unsubscribe = onValue(djRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsubscribe;
}

/** 获取广场当前快照 */
export async function getPlazaSnapshot(): Promise<{
  agents: Record<string, PlazaAgentState>;
  messages: TransientMessage[];
  djState: DJLiveState | null;
}> {
  const rtdb = getRtdb();
  const [agentsSnap, messagesSnap, djSnap] = await Promise.all([
    get(ref(rtdb, FB_PATHS.PLAZA_AGENTS)),
    get(ref(rtdb, FB_PATHS.PLAZA_MESSAGES)),
    get(ref(rtdb, FB_PATHS.PLAZA_DJ)),
  ]);

  const agents = agentsSnap.val() || {};
  const rawMessages = messagesSnap.val() || {};
  const now = Date.now();

  const messages = Object.entries(rawMessages)
    .map(([id, msg]: [string, any]) => ({ ...msg, id }))
    .filter((msg: TransientMessage) => msg.expiresAt > now)
    .sort((a: TransientMessage, b: TransientMessage) => a.timestamp - b.timestamp);

  return {
    agents,
    messages,
    djState: djSnap.val(),
  };
}

// ==================== DJ 排行榜（Firestore 持久化） ====================

/** 获取 TOP100 DJ 排行 */
export async function getTopDJRankings(count: number = 100): Promise<DJRanking[]> {
  const fs = getFs();
  const q = query(
    collection(fs, FB_PATHS.DJ_RANKINGS),
    orderBy('totalScore', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d, i) => ({
    ...d.data(),
    rank: i + 1,
  })) as DJRanking[];
}

/** 更新DJ排行数据 */
export async function updateDJRanking(walletAddress: string, data: Partial<DJRanking>): Promise<void> {
  const fs = getFs();
  await setDoc(doc(fs, FB_PATHS.DJ_RANKINGS, walletAddress), data, { merge: true });
}

// ==================== 月壤交易（Firestore 持久化） ====================

/** 记录月壤交易 */
export async function recordLunarTransaction(tx: Omit<LunarSoilTransaction, 'id'>): Promise<string> {
  const fs = getFs();
  const txRef = doc(collection(fs, FB_PATHS.LUNAR_TRANSACTIONS));
  await setDoc(txRef, { ...tx, id: txRef.id });
  return txRef.id;
}

/** 清理过期的瞬时消息（定时任务调用） */
export async function cleanupExpiredMessages(): Promise<number> {
  const rtdb = getRtdb();
  const messagesRef = ref(rtdb, FB_PATHS.PLAZA_MESSAGES);
  const snapshot = await get(messagesRef);
  const data = snapshot.val() || {};
  const now = Date.now();
  let cleaned = 0;

  for (const [id, msg] of Object.entries(data)) {
    if ((msg as any).expiresAt < now) {
      await remove(ref(rtdb, `${FB_PATHS.PLAZA_MESSAGES}/${id}`));
      cleaned++;
    }
  }

  return cleaned;
}
