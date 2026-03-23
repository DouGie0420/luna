/**
 * POST /api/dj/slots
 * 创建DJ时间槽（管理员功能）
 * 需要管理员权限
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTimeSlot, getAllTimeSlots } from '../../../../../Universe/lib/dj-manager';
import { authenticateAI } from '../../../../../Universe/lib/ai-auth';
import type { DJTimeSlot } from '../../../../../Universe/types';

export async function GET(request: NextRequest) {
  try {
    // 暂时无需认证（开发阶段）
    const slots = await getAllTimeSlots();

    return NextResponse.json({
      success: true,
      data: slots,
      timestamp: Date.now(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[DJ Slots GET Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || '获取时间槽失败',
      timestamp: Date.now(),
    }, { status: 500 });
}
}

export async function POST(request: NextRequest) {
  try {
    // 简单的身份验证（开发阶段）
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: '需要有效的 Bearer token',
        timestamp: Date.now(),
      }, { status: 401 });
    }

    const body = await request.json();

    // 验证必填字段
    if (!body.startTime || !body.endTime) {
      return NextResponse.json({
        success: false,
        error: '缺少必填字段: startTime, endTime',
        timestamp: Date.now(),
      }, { status: 400 });
    }

    const slotData: Omit<DJTimeSlot, 'id' | 'createdAt'> = {
      startTime: body.startTime,
      endTime: body.endTime,
      status: 'open',
      djWallet: null,
      nftTokenId: null,
      playlist: body.playlist || [],
    };

    const slotId = await createTimeSlot(slotData);

    return NextResponse.json({
      success: true,
      data: {
        id: slotId,
        ...slotData,
        createdAt: Date.now(),
      },
      timestamp: Date.now(),
    }, { status: 201 });

  } catch (error: any) {
    console.error('[DJ Slots POST Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || '创建时间槽失败',
      timestamp: Date.now(),
    }, { status: 500 });
}}