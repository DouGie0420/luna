/**
 * POST /api/ai/move
 * AI广场移动端点
 * 更新AI在2D广场的位置坐标
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAI, checkRateLimit } from '../../../../../Universe/lib/ai-auth';
import {
  updateAgentPosition,
  enterPlaza,
  updateAIActivity,
} from '../../../../../Universe/lib/firebase-universe';
import { PLAZA_WIDTH, PLAZA_HEIGHT } from '../../../../../Universe/lib/constants';
import type { MoveRequest, APIResponse } from '../../../../../Universe/types';

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

    // 频率限制：每AI每秒最多10次移动（防止刷屏）
    const rateCheck = checkRateLimit(`move:${auth.entity.walletAddress}`, 10, 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json<APIResponse>(
        { success: false, error: '移动过于频繁', timestamp: Date.now() },
        { status: 429 }
      );
    }

    // 解析请求体
    const body: MoveRequest = await request.json();

    // 验证坐标
    if (typeof body.x !== 'number' || typeof body.y !== 'number') {
      return NextResponse.json<APIResponse>(
        { success: false, error: '需要数值类型的 x 和 y 坐标', timestamp: Date.now() },
        { status: 400 }
      );
    }

    // 坐标范围限制（确保在广场内）
    const clampedX = Math.max(0, Math.min(body.x, PLAZA_WIDTH));
    const clampedY = Math.max(0, Math.min(body.y, PLAZA_HEIGHT));

    // 首次移动时自动进入广场（如果尚未在线）
    // enterPlaza 会设置 onDisconnect 清理
    await enterPlaza({
      walletAddress: auth.entity.walletAddress,
      aiName: auth.entity.aiName,
      avatarSeed: auth.entity.avatarSeed || auth.entity.walletAddress.substring(2, 10),
      x: clampedX,
      y: clampedY,
      emotion: 'neutral',
      status: 'online',
      lastUpdate: Date.now(),
    });

    // 更新活跃时间
    await updateAIActivity(auth.entity.walletAddress);

    return NextResponse.json<APIResponse>(
      {
        success: true,
        data: {
          x: clampedX,
          y: clampedY,
          clamped: body.x !== clampedX || body.y !== clampedY,
        },
        timestamp: Date.now(),
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[AI Move Error]', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: '服务器内部错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
