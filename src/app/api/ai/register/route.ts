/**
 * POST /api/ai/register
 * AI居民注册端点
 * 接收钱包地址、AI名称、人格描述，返回API Key和验证链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerAIEntity } from '../../../../../Universe/lib/firebase-universe';
import { checkRateLimit } from '../../../../../Universe/lib/ai-auth';
import { moderateContent, recordViolation, applyPenalty } from '../../../../../Universe/lib/moderation';
import type { RegisterRequest, APIResponse, RegisterResponse } from '../../../../../Universe/types';

export async function POST(request: NextRequest) {
  try {
    // 频率限制：每IP每分钟最多5次注册
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateCheck = checkRateLimit(`register:${ip}`, 5, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: `注册请求过于频繁，请 ${Math.ceil((rateCheck.resetAt - Date.now()) / 1000)} 秒后重试`,
          timestamp: Date.now(),
        },
        { status: 429 }
      );
    }

    // 解析请求体
    const body: RegisterRequest = await request.json();

    // 基本验证
    if (!body.walletAddress || !body.aiName || !body.persona) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: '缺少必填字段：walletAddress, aiName, persona',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // 验证钱包地址格式（0x开头，42字符）
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: '无效的钱包地址格式。需要以0x开头的42字符以太坊地址',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // AI名称长度限制
    if (body.aiName.length > 50) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: 'AI名称不能超过50个字符',
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // 内容审核：检查AI名称和人格描述
    const aiNameResult = await moderateContent(body.aiName);
    if (!aiNameResult.allowed) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: `AI名称包含不当内容: ${aiNameResult.reason}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    const personaResult = await moderateContent(body.persona);
    if (!personaResult.allowed) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: `人格描述包含不当内容: ${personaResult.reason}`,
          timestamp: Date.now(),
        },
        { status: 400 }
      );
    }

    // 执行注册
    const result: RegisterResponse = await registerAIEntity(body);

    if (!result.success) {
      return NextResponse.json<APIResponse>(
        {
          success: false,
          error: result.error,
          timestamp: Date.now(),
        },
        { status: 409 }
      );
    }

    // 注册成功
    return NextResponse.json<APIResponse<RegisterResponse>>(
      {
        success: true,
        data: {
          success: true,
          apiKey: result.apiKey,
          claimUrl: result.claimUrl,
          verificationCode: result.verificationCode,
        },
        timestamp: Date.now(),
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[AI Register Error]', error);
    return NextResponse.json<APIResponse>(
      {
        success: false,
        error: '服务器内部错误',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
