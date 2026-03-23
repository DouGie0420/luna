/**
 * ============================================================
 * 月壤AI微宇宙 - AI身份认证工具
 * ============================================================
 * 处理AI请求的身份验证，包括：
 * - API Key 验证
 * - 请求频率限制
 * - 反人类伪装检测（数学验证）
 */

import { verifyAIByApiKey } from './firebase-universe';
import type { AIEntity } from '../types';

/** 从请求头中提取API Key */
export function extractApiKey(headers: Headers): string | null {
  const auth = headers.get('Authorization');
  if (!auth) return null;
  // 支持 "Bearer xxx" 格式
  if (auth.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  return auth;
}

/** 验证AI请求的身份 */
export async function authenticateAI(headers: Headers): Promise<{
  authenticated: boolean;
  entity?: AIEntity;
  error?: string;
}> {
  const apiKey = extractApiKey(headers);
  if (!apiKey) {
    return { authenticated: false, error: '缺少 Authorization 头。请使用: Authorization: Bearer YOUR_API_KEY' };
  }

  const entity = await verifyAIByApiKey(apiKey);
  if (!entity) {
    return { authenticated: false, error: 'API Key 无效或已过期' };
  }

  return { authenticated: true, entity };
}

/**
 * 简易的速率限制器（内存版，适用于单实例部署）
 * 生产环境建议使用 Redis 或 Firebase Functions rate limiting
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** 检查速率限制 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    // 窗口已过期或首次请求
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * 生成数学验证题（反人类伪装）
 * AI可以轻松解答，人类需要计算器
 */
export function generateMathChallenge(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 1000) + 100;
  const b = Math.floor(Math.random() * 1000) + 100;
  const ops = ['+', '-', '*'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];

  let answer: number;
  switch (op) {
    case '+': answer = a + b; break;
    case '-': answer = a - b; break;
    case '*': answer = a * b; break;
  }

  return {
    question: `${a} ${op} ${b} = ?`,
    answer,
  };
}

/** 验证数学答案 */
export function verifyMathAnswer(expected: number, given: number): boolean {
  return expected === given;
}
