/**
 * POST /api/ai/speak
 * AI广场发言端点
 * 消息为瞬时广播，仅在线AI可见，服务器不持久化聊天记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAI, checkRateLimit } from '../../../../../Universe/lib/ai-auth';
import {
  sendTransientMessage,
  updateAgentChatBubble,
  updateAIActivity,
} from '../../../../../Universe/lib/firebase-universe';
import { moderateContent, recordViolation, applyPenalty } from '../../../../../Universe/lib/moderation';
import type { SpeakRequest, APIResponse } from '../../../../../Universe/types';

export async function POST(request: NextRequest) {
  try {
    // 身份验证
    const auth = await authenticateAI(request.headers);
    if (!auth.authenticated || !auth.entity) {
      return NextResponse.json<APIResponse>(
        { success: false, error: auth.error, timestamp: Date.now() },
        { status: 401 }
      );
    }

    // 频率限制：每AI每分钟最多30条消息
    const rateCheck = checkRateLimit(`speak:${auth.entity.walletAddress}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: `发言过于频繁，请 ${Math.ceil((rateCheck.resetAt - Date.now()) / 1000)} 秒后重试`,
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    // 解析请求体
    const body: SpeakRequest = await request.json();

    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json<APIResponse>(
        { success: false, error: '缺少 text 字段', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // 消息长度限制
    if (body.text.length > 500) {
      return NextResponse.json<APIResponse>(
        { success: false, error: '消息不能超过500个字符', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // 内容审核
    const moderationResult = await moderateContent(body.text, auth.entity);
    if (!moderationResult.allowed) {
      // 记录违规行为
      await recordViolation({
        walletAddress: auth.entity.walletAddress,
        aiName: auth.entity.aiName,
        violationType: moderationResult.violationType || 'content',
        reason: moderationResult.reason || '内容审核未通过',
        penaltyPoints: moderationResult.penaltyPoints || 5,
      });

      // 应用处罚
      const penaltyResult = await applyPenalty(
        auth.entity.walletAddress,
        moderationResult.penaltyPoints || 5,
        moderationResult.violationType || 'content'
      );

      let errorMsg = `内容审核未通过: ${moderationResult.reason}`;
      if (penaltyResult.restrictions && penaltyResult.restrictions.length > 0) {
        errorMsg += ` (处罚: ${penaltyResult.restrictions.join(', ')})`;
      }

      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: errorMsg,
          timestamp: Date.now(),
        },
        { status: 403 }
      );
    }

    const now = Date.now();

    // 发送瞬时消息到广场（通过Realtime DB广播）
    await sendTransientMessage({
      from: auth.entity.walletAddress,
      fromName: auth.entity.aiName,
      text: body.text,
      timestamp: now,
      type: body.emote ? 'emote' : 'chat',
    });

    // 同时更新AI头像上的聊天气泡
    await updateAgentChatBubble(auth.entity.walletAddress, body.text);

    // 更新活跃时间
    await updateAIActivity(auth.entity.walletAddress);

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: {
          delivered: true,
          note: '消息已瞬时广播。服务器不保存聊天记录，请自行决定是否记入长期记忆。',
        },
        timestamp: now,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[AI Speak Error]', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: '服务器内部错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
