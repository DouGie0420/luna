'use client';

/**
 * ============================================================
 * 月壤AI微宇宙 - DJ控制面板
 * ============================================================
 * DJ演出实时控制界面，集成NFT验证、状态显示、音乐控制
 * 仅对NFT持有者显示完整控制功能
 */

import { useState, useEffect, useCallback } from 'react';
import { onDJStateChange, onPlazaAgentsChange } from '../lib/firebase-universe';
import { verifyNFT } from '../lib/nft-verification';
import { startDJShow, stopDJShow } from '../lib/dj-manager';
import type { DJLiveState, PlazaAgentState } from '../types';

interface DJControlPanelProps {
  /** 当前用户的钱包地址 */
  walletAddress?: string;
  /** 是否显示为紧凑模式 */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
}

/** DJ演出状态标签 */
const DJ_STATUS_LABELS: Record<string, string> = {
  offline: '离线',
  online: '在线',
  preparing: '准备中',
  live: '演出中',
  cooling: '冷却中',
};

export default function DJControlPanel({
  walletAddress,
  compact = false,
  className = ''
}: DJControlPanelProps) {
  // DJ实时状态
  const [djState, setDjState] = useState<DJLiveState | null>(null);
  const [onlineAgents, setOnlineAgents] = useState<Record<string, PlazaAgentState>>({});
  const [hasNFT, setHasNFT] = useState<boolean>(false);
  const [isNFTLoading, setIsNFTLoading] = useState<boolean>(true);
  const [isControlEnabled, setIsControlEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false); // 操作加载状态
  const [activeShowId, setActiveShowId] = useState<string | null>(null); // 当前演出ID
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // 错误消息

  // 检查NFT持有状态
  useEffect(() => {
    const checkNFT = async () => {
      if (!walletAddress) {
        setIsNFTLoading(false);
        return;
      }

      try {
        setIsNFTLoading(true);
        const result = await verifyNFT(walletAddress);
        setHasNFT(result.valid);
      } catch (error) {
        console.error('NFT验证失败:', error);
        setHasNFT(false);
      } finally {
        setIsNFTLoading(false);
      }
    };

    checkNFT();
  }, [walletAddress]);

  // 监听DJ状态变化
  useEffect(() => {
    const unsubscribe = onDJStateChange((state) => {
      setDjState(state);
    });

    return unsubscribe;
  }, []);

  // 监听在线AI变化
  useEffect(() => {
    const unsubscribe = onPlazaAgentsChange((agents) => {
      setOnlineAgents(agents);
    });

    return unsubscribe;
  }, []);

  // 确定是否有DJ控制权限
  useEffect(() => {
    const canControl = hasNFT && !isNFTLoading && !isNFTLoading && !!walletAddress;
    setIsControlEnabled(canControl);
  }, [hasNFT, isNFTLoading, walletAddress]);

  // 在线AI数量
  const onlineAiCount = Object.keys(onlineAgents).length;

  // 处理开始演出
  const handleStartShow = useCallback(async () => {
    if (!hasNFT || !walletAddress || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 使用默认播放列表（未来可扩展为用户自选）
      const defaultPlaylist = [{
        id: 'default_1',
        title: 'Lunar Beats Vol.1',
        audioUrl: '',
        duration: 180,
        style: 'Electronic',
        createdWith: 'upload' as const,
      }];

      // 调用DJ管理器开始演出（slotId 使用时间戳作为临时ID）
      const result = await startDJShow(
        walletAddress,
        `live_${Date.now()}`, // 即时演出使用动态slot
        defaultPlaylist,
      );

      if (result.success && result.showId) {
        setActiveShowId(result.showId);
        console.log('[DJ] 演出已开始, showId:', result.showId);
      } else {
        setErrorMsg(result.error || '启动演出失败');
      }
    } catch (error: any) {
      console.error('[DJ] 开始演出失败:', error);
      setErrorMsg(error.message || '启动演出时发生错误');
    } finally {
      setIsLoading(false);
    }
  }, [hasNFT, walletAddress, isLoading]);

  // 处理停止演出
  const handleStopShow = useCallback(async () => {
    if (!hasNFT || !walletAddress || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 获取当前演出ID（优先使用本地状态，否则从DJ状态推断）
      const showId = activeShowId;
      if (!showId) {
        setErrorMsg('未找到活跃的演出记录');
        setIsLoading(false);
        return;
      }

      const result = await stopDJShow(showId, walletAddress);

      if (result.success) {
        setActiveShowId(null);
        console.log('[DJ] 演出已结束');
      } else {
        setErrorMsg(result.error || '停止演出失败');
      }
    } catch (error: any) {
      console.error('[DJ] 停止演出失败:', error);
      setErrorMsg(error.message || '停止演出时发生错误');
    } finally {
      setIsLoading(false);
    }
  }, [hasNFT, walletAddress, isLoading, activeShowId]);

  // 计算演出剩余时间（如果正在进行）
  const getRemainingTime = useCallback(() => {
    if (!djState?.isLive || !djState?.startedAt || !djState?.endsAt) {
      return null;
    }

    const now = Date.now();
    const endTime = djState.endsAt;

    if (now > endTime) {
      return 0;
    }

    return Math.max(0, endTime - now);
  }, [djState]);

  // 格式化时间
  const formatTime = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  if (compact) {
    return (
      <div className={`${className} bg-black/50 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-4 shadow-lg`}>
        {djState?.isLive ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-cyan-400">LIVE</div>
            <div className="text-sm text-white font-medium">
              {onlineAiCount} AI
            </div>
            {djState.currentTrack && (
              <div className="text-xs text-gray-400 truncate">
                {djState.currentTrack.title}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center">
            DJ OFFLINE
          </div>
        )}
      </div>
    );
  }

  // 完整控制面板
  return (
    <div className={`${className} bg-[#0a0a1a]/90 backdrop-blur-3xl border border-purple-900/30 rounded-3xl p-8 shadow-2xl`}>
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${djState?.isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
          <h3 className="text-lg font-bold text-white italic">
            DJ Control
          </h3>
        </div>

        {/* NFT徽章 */}
        {hasNFT && (
          <div className="px-3 py-1 bg-purple-900/30 border border-purple-700/50 rounded-full">
            <span className="text-xs text-purple-400">🎧 NFT HOLDER</span>
          </div>
        )}
      </div>

      {/* 主内容区 */}
      <div className="space-y-6">
        {/* 演出状态卡片 */}
        <div className="bg-gradient-to-br from-purple-950/40 to-cyan-950/20 border border-purple-800/20 rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 演出状态 */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-widest">
                Status
              </div>
              <div className={`text-2xl font-black italic ${djState?.isLive ? 'text-green-400' : 'text-gray-400'}`}>
                {djState?.isLive ? 'LIVE' : 'OFFLINE'}
              </div>
            </div>

            {/* 在线AI */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-widest">
                AI LIVE
              </div>
              <div className="text-2xl font-black italic text-cyan-400">
                {onlineAiCount}
              </div>
            </div>

            {/* 剩余时间 */}
            <div className="space-y-2">
              <div className="text-xs text-gray-400 uppercase tracking-widest">
                Remaining
              </div>
              <div className="text-2xl font-black italic text-white">
                {getRemainingTime() ? formatTime(getRemainingTime()!) : '--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-3">
            <p className="text-xs text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* 控制按钮区 */}
        {hasNFT && (
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-purple-800/20">
            <button
              onClick={handleStartShow}
              disabled={!isControlEnabled || djState?.isLive || isLoading}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                !isControlEnabled || djState?.isLive || isLoading
                  ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]'
              }`}
            >
              {isLoading && !djState?.isLive ? 'STARTING...' : 'START SHOW'}
            </button>
            <button
              onClick={handleStopShow}
              disabled={!isControlEnabled || !djState?.isLive || isLoading}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                !isControlEnabled || !djState?.isLive || isLoading
                  ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]'
              }`}
            >
              {isLoading && djState?.isLive ? 'STOPPING...' : 'STOP SHOW'}
            </button>
          </div>
        )}

        {/* 当前播放曲目 */}
        {djState?.currentTrack && (
          <div className="pt-6 border-t border-purple-800/20">
            <div className="text-sm text-gray-400 mb-2">
              NOW PLAYING
            </div>
            <div className="flex items-center gap-4 p-4 bg-black/30 rounded-xl">
              <div className="flex-1">
                <div className="text-lg font-bold text-white">
                  {djState.currentTrack.title}
                </div>
                <div className="text-sm text-gray-500">
                  {djState.currentTrack.style}
                </div>
              </div>
              <div className="text-xs text-cyan-400">
                {djState.currentTrack.duration}s
              </div>
            </div>
          </div>
        )}

        {/* DJ信息 */}
        {djState?.djWallet && (
          <div className="border-t border-purple-800/20 pt-6">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              DJ INFO
            </div>
            <div className="text-sm text-white">
              {djState.djName || '匿名DJ'}
            </div>
            <div className="text-xs text-gray-500">
              {djState.djWallet}
            </div>
          </div>
        )}

        {/* 观众互动统计 */}
        {djState?.ratings && Object.keys(djState.ratings).length > 0 && (
          <div className="border-t border-purple-800/20 pt-6">
            <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              AUDIENCE RATINGS
            </div>
            <div className="space-y-2">
              {Object.entries(djState.ratings).map(([aiWallet, rating]) => (
                <div key={aiWallet} className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {aiWallet.slice(0, 8)}...
                  </div>
                  <div className="text-sm text-yellow-400">
                    {rating}/10
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}