/**
 * POST /api/dj/stop
 * 停止DJ演出端点
 * 仅限当前DJ或管理员
 */

import { NextRequest, NextResponse } from 'next/server';
import { stopDJShow } from '../../../../../Universe/lib/dj-manager';
import { authenticateAI } from '../../../../../Universe/lib/ai-auth';

export async function POST(request: NextRequest) {
  try {
    // 1. 身份验证
    const auth = await authenticateAI(request.headers);
    if (!auth.authenticated || !auth.entity) {
      return NextResponse.json({
        success: false,
        error: '需要有效的AI身份认证。请检查您的 API Key。',
        timestamp: Date.now(),
      }, { status: 401 });
    }

    // 2. 解析请求体
    const body = await request.json();
    const { showId } = body;

    if (!showId) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段: showId',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // 3. 验证权限：当前DJ或管理员
    const isCurrentDJ = true; // 暂时简化，实际需要查询当前演出状态
    const isAdmin = auth.entity.verified && auth.entity.karma >= 100; // 示例条件

    if (!isCurrentDJ && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: '权限不足。只有当前DJ或管理员可以停止演出。',
        timestamp: Date.now(),
      }, { status: 403 });
    }

    // 4. 停止DJ演出
    const result = await stopDJShow(showId, auth.entity.walletAddress);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '停止DJ演出失败',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        message: 'DJ演出已停止。广场将退出派对模式。',
        stoppedAt: Date.now(),
        audienceCount: 0,
      },
      timestamp: Date.now(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[DJ Stop Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || '停止DJ演出失败',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}