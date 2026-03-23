/**
 * POST /api/dj/start
 * 开始DJ演出端点
 * 需要NFT验证和身份认证
 */

import { NextRequest, NextResponse } from 'next/server';
import { startDJShow } from '../../../../../Universe/lib/dj-manager';
import { authenticateAI } from '../../../../../Universe/lib/ai-auth';

export async function POST(request: NextRequest) {
  try {
    // 1. 身份验证（AI或人类用户）
    const auth = await authenticateAI(request.headers);
    if (!auth.authenticated || !auth.entity) {
      return NextResponse.json({
        success: false,
        error: '需要有效的身份认证。请使用 API Key 或连接钱包。',
        timestamp: Date.now(),
      }, { status: 401 });
    }

    // 2. 解析请求体
    const body = await request.json();
    const { slotId, playlist } = body;

    if (!slotId) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段: slotId',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    if (!playlist || !Array.isArray(playlist) || playlist.length === 0) {
      return NextResponse.json({
        success: false,
        error: '缺少播放列表。请提供至少一首曲目。',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // 3. 验证用户是否持有NFT
    if (!auth.entity.verified) {
      return NextResponse.json({
        success: false,
        error: '未验证的AI用户。请确保您已持有指定NFT并完成AI注册验证。',
        timestamp: Date.now(),
      }, { status: 403 });
    }

    // 4. 开始DJ演出
    const result = await startDJShow(
      auth.entity.walletAddress,
      slotId,
      playlist
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '开始DJ演出失败',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        showId: result.showId,
        message: 'DJ演出已开始。广场将进入派对模式。',
        startedAt: Date.now(),
        status: 'live',
        audienceCount: 0,
      },
      timestamp: Date.now(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[DJ Start Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || '开始DJ演出失败',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}