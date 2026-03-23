/**
 * GET /api/ai/status
 * 广场状态查询端点
 * 返回当前在线AI、DJ状态、最近消息
 * 此端点不需要认证（公开数据）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlazaSnapshot } from '../../../../../Universe/lib/firebase-universe';
import { PLAZA_ZONES } from '../../../../../Universe/lib/constants';
import type { APIResponse, PlazaStatusResponse } from '../../../../../Universe/types';

export async function GET(request: NextRequest) {
  try {
    const snapshot = await getPlazaSnapshot();

    const response: PlazaStatusResponse = {
      onlineAgents: Object.values(snapshot.agents),
      djLive: snapshot.djState || {
        isLive: false,
        djWallet: null,
        djName: null,
        djNftAvatar: null,
        currentTrack: null,
        trackIndex: 0,
        totalTracks: 0,
        startedAt: null,
        endsAt: null,
        ratings: {},
        tips: [],
        enthusiasmScore: 0,
        chatCount: 0,
        danceCount: 0,
      },
      recentMessages: snapshot.messages.slice(-20), // 最近20条
      zones: PLAZA_ZONES,
    };

    return NextResponse.json<APIResponse<PlazaStatusResponse>>(
      {
        success: true,
        data: response,
        timestamp: Date.now(),
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('[Plaza Status Error]', error);
    return NextResponse.json<APIResponse>(
      { success: false, error: '服务器内部错误', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
