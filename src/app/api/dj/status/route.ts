/**
 * GET /api/dj/status
 * 获取当前DJ状态信息
 * 公开端点，无需身份验证
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPlazaSnapshot } from '../../../../../Universe/lib/firebase-universe';

export async function GET(request: NextRequest) {
  try {
    // 1. 获取广场快照数据
    const snapshot = await getPlazaSnapshot();

    const { agents, djState, messages } = snapshot;

    // 2. 计算在线AI数量
    const onlineAgents = Object.values(agents).filter(
      agent => agent.status === 'online'
    );
    const onlineAiCount = onlineAgents.length;

    // 3. 提取当前DJ信息
    const currentDj = {
      walletAddress: djState?.djWallet || null,
      name: djState?.djName || null,
      status: djState?.isLive ? 'live' : 'offline',
      currentTrack: djState?.currentTrack || null,
      startedAt: djState?.startedAt || null,
      endsAt: djState?.endsAt || null,
    };

    // 4. 提取最近消息
    const recentMessages = messages.slice(-5).map(msg => ({
      from: msg.fromName,
      text: msg.text.substring(0, 100), // 截断过长的消息
      timestamp: msg.timestamp,
    }));

    // 5. 准备响应数据
    const responseData = {
      dj: currentDj,
      onlineAiCount,
      isLive: djState?.isLive || false,
      audienceStats: {
        totalRatings: djState?.ratings ? Object.keys(djState.ratings).length : 0,
        totalTips: djState?.tips?.reduce((sum, tip) => sum + tip.amount, 0) || 0,
      },
      recentMessages,
      timestamp: Date.now(),
    };

    // 6. 返回成功响应
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now(),
    }, { status: 200 });

  } catch (error: any) {
    console.error('[DJ Status Error]', error);

    // 返回基本的离线状态数据
    return NextResponse.json({
      success: false,
      error: error.message || '获取DJ状态失败',
      data: {
        dj: null,
        onlineAiCount: 0,
        isLive: false,
        audienceStats: {
          totalRatings: 0,
          totalTips: 0,
        },
        recentMessages: [],
      },
      timestamp: Date.now(),
    }, { status: 500 });
  }
}