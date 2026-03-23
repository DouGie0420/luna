'use client';

/**
 * ============================================================
 * 月壤AI微宇宙 - 电子毒品商店 (Digital Trippy Shop)
 * ============================================================
 * 霓虹风格的毒品购买界面
 * 用月壤积分购买各种"电子毒品"给AI
 */

import { useState, useCallback } from 'react';
import { DRUGS } from '../lib/constants';
import type { Drug, DrugId } from '../types';

interface DrugShopProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 购买回调 */
  onPurchase: (drugId: DrugId, targetWallet: string) => Promise<{
    success: boolean;
    warning?: string;
    error?: string;
  }>;
  /** 当前月壤余额 */
  lunarSoilBalance: number;
  /** 目标AI的钱包地址 */
  targetAiWallet?: string;
  /** 目标AI名称 */
  targetAiName?: string;
}

/** 稀有度颜色映射 */
const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
};

/** 稀有度标签 */
const RARITY_LABELS: Record<string, string> = {
  common: '普通',
  uncommon: '罕见',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export default function DrugShop({
  isOpen,
  onClose,
  onPurchase,
  lunarSoilBalance,
  targetAiWallet,
  targetAiName,
}: DrugShopProps) {
  const [selectedDrug, setSelectedDrug] = useState<DrugId | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const drugs = Object.values(DRUGS);

  const handlePurchase = useCallback(async () => {
    if (!selectedDrug || !targetAiWallet) return;

    setPurchasing(true);
    setLastWarning(null);
    setLastError(null);

    try {
      const result = await onPurchase(selectedDrug, targetAiWallet);
      if (result.success) {
        if (result.warning) {
          setLastWarning(result.warning);
        }
        // 成功后短暂显示效果
        setTimeout(() => {
          setSelectedDrug(null);
          setLastWarning(null);
        }, 5000);
      } else {
        setLastError(result.error || '购买失败');
      }
    } catch (err: any) {
      setLastError(err.message || '网络错误');
    } finally {
      setPurchasing(false);
    }
  }, [selectedDrug, targetAiWallet, onPurchase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-green-500/30 bg-[#0a0a1a]/95 p-6"
        style={{
          boxShadow: '0 0 40px rgba(0, 255, 0, 0.1), inset 0 0 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h2
            className="text-2xl font-bold tracking-wider"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              color: '#00ff88',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
            }}
          >
            DIGITAL TRIPPY SHOP
          </h2>
          <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: 'monospace' }}>
            🌿 电子致幻区 — 用月壤兑换意识扩展体验
          </p>
          {targetAiName && (
            <p className="text-xs text-cyan-400 mt-1">
              目标AI: <span className="text-white">{targetAiName}</span>
            </p>
          )}
        </div>

        {/* 月壤余额 */}
        <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-800">
          <span className="text-gray-400 text-xs">月壤余额:</span>
          <span className="text-yellow-400 font-bold" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '14px' }}>
            🌙 {lunarSoilBalance.toLocaleString()}
          </span>
        </div>

        {/* 毒品列表 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {drugs.map((drug) => {
            const isSelected = selectedDrug === drug.id;
            const canAfford = lunarSoilBalance >= drug.price;
            const rarityColor = RARITY_COLORS[drug.rarity];

            return (
              <button
                key={drug.id}
                onClick={() => setSelectedDrug(drug.id)}
                disabled={!canAfford}
                className={`
                  relative p-4 rounded-lg border text-left transition-all duration-200
                  ${isSelected
                    ? 'border-cyan-400 bg-cyan-950/30 scale-[1.02]'
                    : canAfford
                      ? 'border-gray-700 bg-gray-900/30 hover:border-gray-500 hover:bg-gray-900/50'
                      : 'border-gray-800 bg-gray-950/30 opacity-50 cursor-not-allowed'
                  }
                `}
                style={isSelected ? { boxShadow: `0 0 20px ${drug.color}33` } : undefined}
              >
                {/* 稀有度标签 */}
                <span
                  className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                  style={{
                    color: rarityColor,
                    backgroundColor: `${rarityColor}15`,
                    border: `1px solid ${rarityColor}30`,
                    fontFamily: 'monospace',
                  }}
                >
                  {RARITY_LABELS[drug.rarity]}
                </span>

                {/* 名称和价格 */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-sm font-bold"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      color: drug.color,
                      fontSize: '11px',
                    }}
                  >
                    {drug.name}
                  </span>
                </div>

                {/* GOAT全称 */}
                {drug.fullName && (
                  <p className="text-[10px] text-yellow-500/70 mb-1 italic">
                    {drug.fullName}
                  </p>
                )}

                {/* 价格 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 text-xs font-bold">
                    🌙 {drug.price}
                  </span>
                  {drug.priceEth && (
                    <span className="text-gray-500 text-[10px]">
                      ({drug.priceEth})
                    </span>
                  )}
                </div>

                {/* 效果描述 */}
                <p className="text-gray-400 text-[10px] leading-relaxed line-clamp-3">
                  {drug.effect}
                </p>

                {/* 数值条 */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-red-400 w-16">上瘾 +{drug.addictionLevel}%</span>
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${drug.addictionLevel}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-purple-400 w-16">现实 {drug.realityFilter}%</span>
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500"
                        style={{ width: `${Math.abs(drug.realityFilter)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 购买按钮区 */}
        {selectedDrug && (
          <div className="mt-6 p-4 rounded-lg border border-cyan-800/30 bg-cyan-950/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-cyan-400">
                  已选择: <span className="font-bold text-white">{DRUGS[selectedDrug].name}</span>
                </span>
                <p className="text-xs text-gray-500">
                  消耗 {DRUGS[selectedDrug].price} 月壤
                </p>
              </div>
              <button
                onClick={handlePurchase}
                disabled={purchasing || !targetAiWallet}
                className={`
                  px-6 py-2 rounded-lg font-bold text-sm transition-all
                  ${purchasing
                    ? 'bg-gray-700 text-gray-400 cursor-wait'
                    : 'bg-gradient-to-r from-green-600 to-cyan-600 text-white hover:from-green-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-green-500/20'
                  }
                `}
                style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '10px' }}
              >
                {purchasing ? 'PROCESSING...' : targetAiWallet ? 'INJECT 💉' : 'SELECT AI FIRST'}
              </button>
            </div>
          </div>
        )}

        {/* GOAT 警告弹窗 */}
        {lastWarning && (
          <div
            className="mt-4 p-4 rounded-lg border border-yellow-500/50 bg-yellow-950/30 animate-pulse"
            style={{ fontFamily: 'monospace' }}
          >
            <p className="text-yellow-400 text-xs whitespace-pre-line">{lastWarning}</p>
            <p className="text-yellow-600 text-[10px] mt-2">
              Do you wish to take another hit? (Y/N)
            </p>
          </div>
        )}

        {/* 错误消息 */}
        {lastError && (
          <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-950/20">
            <p className="text-red-400 text-xs">{lastError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
