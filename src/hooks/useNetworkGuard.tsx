// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Zap } from 'lucide-react';
import { connectToChain } from '@/lib/web3-provider';

/**
 * 🚀 全局网络守卫插件 (Network Guard)
 * @param requiredChainId - 必须连接的目标网络 ID (如: 84532)
 * @param isConnected - 当前钱包是否已连接
 * @param currentChainId - 当前钱包所在的网络 ID
 */
export function useNetworkGuard(
    requiredChainId: number, 
    isConnected: boolean, 
    currentChainId: string | number | undefined | null
) {
    const { toast } = useToast();
    const hasPromptedNetwork = useRef(false);

    useEffect(() => {
        // 如果没连接钱包，或者拿不到当前的 chainId，就不触发警报
        if (!isConnected || !currentChainId) return;

        const timer = setTimeout(() => {
            // 兼容十六进制 (0x...) 和十进制的 chainId
            const parsedId = typeof currentChainId === 'string' && currentChainId.startsWith('0x') 
                ? parseInt(currentChainId, 16) 
                : Number(currentChainId);

            if (parsedId !== requiredChainId) {
                if (!hasPromptedNetwork.current) {
                    hasPromptedNetwork.current = true;
                    toast({
                        className: "bg-[#050505]/95 border border-red-500/30 backdrop-blur-[40px] rounded-[2rem] p-6 shadow-[0_30px_60px_rgba(220,38,38,0.3)] overflow-hidden w-full max-w-sm",
                        title: (
                            <div className="flex flex-col gap-4 relative z-10">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-600/20 blur-[40px] rounded-full pointer-events-none" />
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center relative shrink-0">
                                        <div className="absolute inset-0 rounded-full border border-red-500/40 animate-ping opacity-50 duration-1000" />
                                        <ShieldAlert className="w-6 h-6 text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-red-500 font-black text-xl uppercase italic tracking-[0.1em] titanium-title drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                                            Signal Lost
                                        </span>
                                        <span className="text-white/40 font-mono text-[9px] uppercase tracking-widest mt-0.5">
                                            Dimensional Shift Required
                                        </span>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-gradient-to-r from-red-500/50 via-orange-500/20 to-transparent" />
                            </div>
                        ),
                        description: (
                            <div className="mt-4 space-y-4 relative z-10">
                                <p className="text-white/90 font-bold text-sm tracking-wide leading-relaxed">
                                    节点频率异常。智能合约要求接入 <br/>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 font-black text-base drop-shadow-md">
                                        Base Sepolia (ID: {requiredChainId})
                                    </span>
                                </p>
                                <p className="text-white/40 font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Awaiting Web3 Synchronization...
                                </p>
                            </div>
                        ),
                        action: (
                            <div className="mt-6 w-full relative z-10">
                                <Button 
                                    onClick={async () => { 
                                        await connectToChain(requiredChainId, toast); 
                                        hasPromptedNetwork.current = false; 
                                    }} 
                                    className="w-full h-14 rounded-xl bg-gradient-to-r from-red-600/80 to-orange-600/80 hover:from-red-500 hover:to-orange-500 border border-red-400/30 text-white font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(220,38,38,0.2)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_40px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 group"
                                >
                                    <Zap className="w-4 h-4 text-orange-200 group-hover:scale-125 transition-transform" />
                                    <span className="drop-shadow-md">Sync Network</span>
                                </Button>
                            </div>
                        ),
                        duration: 10000,
                    });
                }
            } else {
                // 如果网络对了，重置标记
                hasPromptedNetwork.current = false;
            }
        }, 800); // 增加一点缓冲，防止由于钱包初始化导致的误报

        return () => clearTimeout(timer);
    }, [isConnected, currentChainId, requiredChainId, toast]);
}