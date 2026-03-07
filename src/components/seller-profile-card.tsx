'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { MapPin, Star, ShieldCheck, Globe, Fingerprint } from 'lucide-react';
import { UserAvatar } from './ui/user-avatar';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc } from '@/firebase';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

export function SellerProfileCard({ seller: initialSeller, className }: { seller: any; className?: string }) {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const sellerId = initialSeller?.uid || initialSeller?.id;
    const userRef = useMemo(() => (firestore && sellerId ? doc(firestore, 'users', sellerId) : null), [firestore, sellerId]);
    const { data: liveSeller } = useDoc<any>(userRef);
    const seller = liveSeller || initialSeller;

    if (!sellerId) return null;

    const loginId = seller?.loginId || sellerId;
    const displayName = seller?.displayName || seller?.name || 'PROTOCOL_USER';
    const city = typeof seller?.location === 'string' ? seller.location : seller?.location?.city || 'BANGKOK'; 
    const onSaleCount = seller?.onSaleCount || 0;
    const rating = (seller?.rating || 0).toFixed(1);

    const isPro = seller?.isPro;
    const isWeb3 = seller?.isWeb3Verified;
    const isNft = seller?.isNftVerified;
    const isKyc = seller?.kycStatus === 'Verified';
    const hasAnyBadge = isPro || isWeb3 || isNft || isKyc;

    return (
        <div className={cn("relative w-full group overflow-hidden rounded-[24px] p-[2px] transition-all duration-500 bg-[#050505] shadow-[0_0_40px_rgba(0,0,0,0.8)]", className)}>
            {/* 名片外圈流动边框 */}
            <div className="absolute inset-0 z-0 overflow-hidden rounded-[24px]">
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent,rgba(168,85,247,0.4),rgba(59,130,246,0.4),transparent)] animate-[spin_4s_linear_infinite]" />
            </div>

            <Link href={`/@${loginId}`} className="flex items-center gap-5 md:gap-6 p-5 relative z-10 bg-[#050505] rounded-[22px] w-full h-full hover:bg-[#09090b] transition-colors">
                
                {/* 🚀 核心修复：液态流动头像容器 */}
                <div className="relative shrink-0 flex items-center justify-center">
                    {/* 1. 紧贴头像的流动液态圈 */}
                    <div className="absolute inset-[-3px] rounded-full overflow-hidden animate-[spin_3s_linear_infinite] opacity-80">
                        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#ff00ff,#00ffff,#ff00ff)] blur-[2px]" />
                    </div>
                    
                    {/* 2. 背景遮罩，确保流动条呈圆环状 */}
                    <div className="absolute inset-0 rounded-full bg-[#050505] z-[1]" />

                    {/* 3. 真实头像组件 */}
                    <UserAvatar 
                        profile={seller} 
                        className="h-16 w-16 md:h-[72px] md:w-[72px] relative z-[10] border-none ring-0 bg-transparent" 
                    />
                </div>

                {/* 🚀 已修复的信息中轴区：全面水平居中 */}
                <div className="flex-1 min-w-0 flex flex-col items-center justify-center py-2 text-center">
                    <h3 className="w-full font-headline font-black text-xl md:text-2xl text-white uppercase italic tracking-tighter truncate">
                        {displayName}
                    </h3>
                    
                    <div className="flex items-center justify-center w-full gap-3 mt-1.5 mb-2.5">
                        <div className="flex items-center gap-1 text-primary">
                            <Star className="h-4 w-4 fill-primary" />
                            <span className="font-mono font-bold text-lg">{rating}</span>
                        </div>
                        <span className="text-white/40 font-mono text-xs md:text-sm uppercase tracking-widest">
                            ({onSaleCount} ON SALE)
                        </span>
                    </div>

                    <div className="h-px bg-white/5 w-full max-w-[200px] mb-2.5 mx-auto" />

                    <div className="flex items-center justify-center w-full gap-2 text-[10px] md:text-xs font-mono uppercase text-white/50">
                        <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5" /> 
                        <span className="truncate">{city}</span>
                    </div>
                </div>

                {/* 右侧认证列表 */}
                {hasAnyBadge && (
                    <div className="flex flex-col gap-2.5 items-start shrink-0 border-l border-white/10 pl-4 md:pl-6 pr-1 md:pr-2 min-w-[80px] md:min-w-[100px]">
                        {isPro && (
                            <div className="flex items-center gap-2 font-black italic tracking-tighter text-[10px] md:text-[11px] uppercase text-green-500">
                                <ShieldCheck className="h-3.5 w-3.5 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
                                <span>PRO</span>
                            </div>
                        )}
                        {isWeb3 && (
                            <div className="flex items-center gap-2 font-black italic tracking-tighter text-[10px] md:text-[11px] uppercase text-purple-500">
                                <Globe className="h-3.5 w-3.5 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" />
                                <span>WEB3</span>
                            </div>
                        )}
                        {isNft && (
                            <div className="flex items-center gap-2 font-black italic tracking-tighter text-[10px] md:text-[11px] uppercase text-blue-400">
                                <EthereumIcon className="h-3.5 w-3.5 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                                <span>NFT</span>
                            </div>
                        )}
                        {isKyc && (
                            <div className="flex items-center gap-2 font-black italic tracking-tighter text-[10px] md:text-[11px] uppercase text-yellow-400">
                                <Fingerprint className="h-3.5 w-3.5 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]" />
                                <span>KYC</span>
                            </div>
                        )}
                    </div>
                )}
            </Link>
        </div>
    );
}