/**
 * POST /api/dj/reserve
 * 预约DJ时间槽
 * 需要NFT验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { reserveTimeSlot } from '../../../../../Universe/lib/dj-manager';
import { authenticateAI } from '../../../../../Universe/lib/ai-auth';

export async function POST(request: NextRequest) {
  try {
    // 验证AI身份（获取钱包地址）
    const auth = await authenticateAI(request.headers);
    if (!auth.authenticated || !auth.entity) {
      return NextResponse.json({
        success: false,
        error: auth.error || 'AI身份验证失败',
        timestamp: Date.now(),
      }, { status: 401 });
    }

    const body = await request.json();
    const { slotId } = body;

    if (!slotId) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段: slotId',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    const result = await reserveTimeSlot(slotId, auth.entity.walletAddress);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        timestamp: Date.now(),
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        slotId,
        djWallet: auth.entity.walletAddress,
        reservedAt: Date.now(),
        success: true,
      },
      timestamp: Date.now(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[DJ Reserve Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || '预约时间槽失败',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}