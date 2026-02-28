'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    query, 
    where, 
    limit, 
    documentId, 
    type DocumentData 
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button'; 
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function VerifiedMerchants() {
    const [merchants, setMerchants] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const db = useFirestore();
    const router = useRouter();

    // 🛡️ 严格执行 50 条上限协议 [cite: 2026-02-07]
    const PAGE_LIMIT_SAFETY = 50; 

    useEffect(() => {
        if (!db) return;

        const fetchEnrichedData = async () => {
            setLoading(true);
            try {
                const configSnap = await getDoc(doc(db, 'configs', 'verified_merchants'));
                if (!configSnap.exists()) { setMerchants([]); return; }

                const shortIds: string[] = configSnap.data().fixedMerchantIds || [];
                const validShortIds = shortIds.filter(id => id.trim() !== "").slice(0, 15);
                if (validShortIds.length === 0) { setMerchants([]); return; }

                const usersSnap = await getDocs(query(
                    collection(db, 'users'), 
                    where('loginId', 'in', validShortIds), 
                    limit(PAGE_LIMIT_SAFETY) 
                ));
                const merchantDocs = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                const productIds = merchantDocs.map(m => m.featuredProductId).filter(Boolean);
                let productMap: Record<string, any> = {};

                if (productIds.length > 0) {
                    try {
                        const productsSnap = await getDocs(query(
                            collection(db, 'products'),
                            where(documentId(), 'in', productIds)
                        ));
                        productsSnap.forEach(pDoc => {
                            productMap[pDoc.id] = pDoc.data();
                        });
                    } catch (e) {
                        console.warn("Assets flow offline.");
                    }
                }

                const ordered = validShortIds.map(sid => {
                    const m = merchantDocs.find(u => String(u.loginId) === String(sid));
                    if (!m) return null;
                    const pData = productMap[m.featuredProductId];
                    
                    return {
                        ...m,
                        dynamicFeaturedImg: pData?.images?.[0] || m.photoURL || m.bannerUrl || '/placeholder.jpg',
                        dynamicFeaturedName: pData?.name || m.bio || 'Node established...'
                    };
                }).filter(Boolean);

                setMerchants(ordered as DocumentData[]);
            } catch (error) {
                console.error("Critical: Sync failed", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrichedData();
    }, [db]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <section className="container mx-auto px-4 py-20 flex gap-6 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-[360px] flex-1 shrink-0 rounded-[40px] bg-white/[0.02] flex items-center justify-center border border-white/5">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ))}
            </section>
        );
    }

    if (merchants.length === 0) return null;

    return (
        <section className="container mx-auto px-4 py-16 relative group/master">
            <div className="flex items-center gap-4 mb-10 px-8 md:px-10">
                <div className="h-8 w-1.5 bg-primary rounded-full shadow-[0_0_20px_#ec4899] animate-pulse" />
                <h2 className="font-headline text-xl md:text-3xl font-black italic uppercase tracking-[0.35em] text-white/80">Verified Merchants</h2>
            </div>

            <div className="relative w-full">
                <button onClick={() => scroll('left')} className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-[60] h-14 w-14 flex items-center justify-center rounded-full bg-black/40 border border-primary/30 text-primary opacity-0 group-hover/master:opacity-100 transition-all duration-700 backdrop-blur-2xl hover:scale-110 shadow-[0_0_25px_rgba(236,72,153,0.3)] group/btn overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-purple-500/20 animate-liquid-flow pointer-events-none" />
                    <ChevronLeft className="w-6 h-6 relative z-10 group-hover/btn:-translate-x-1 transition-transform" />
                </button>

                <button onClick={() => scroll('right')} className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-[60] h-14 w-14 flex items-center justify-center rounded-full bg-black/40 border border-primary/30 text-primary opacity-0 group-hover/master:opacity-100 transition-all duration-700 backdrop-blur-2xl hover:scale-110 shadow-[0_0_25px_rgba(236,72,153,0.3)] group/btn overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tl from-primary/20 via-transparent to-purple-500/20 animate-liquid-flow pointer-events-none" />
                    <ChevronRight className="w-6 h-6 relative z-10 group-hover/btn:scale-110 transition-transform" />
                </button>

                <div ref={scrollContainerRef} className="flex overflow-x-auto scroll-smooth gap-6 px-8 md:px-10 pb-16 no-scrollbar snap-x snap-mandatory relative z-10">
                    {merchants.map((merchant) => (
                        <div 
                            key={merchant.id}
                            className={cn(
                                "group shrink-0 basis-[85%] sm:basis-[calc(45%-1rem)] md:basis-[calc(33%-1rem)] lg:basis-[calc(25%-1rem)] xl:basis-[calc(20%-1rem)] snap-start relative rounded-[40px] border-2 border-white/5 transition-all duration-1000 flex flex-col h-[360px] cursor-pointer bg-[#020203] shadow-xl",
                                "hover:border-primary/40 hover:-translate-y-3 hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)] isolate overflow-hidden"
                            )}
                            style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)', isolation: 'isolate' }}
                            onClick={() => router.push(`/u/${merchant.loginId || merchant.id}`)}
                        >
                            <div className="absolute inset-0 z-0 opacity-80 pointer-events-none">
                                <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,#ec4899,#06b6d4,#eab308,#8b5cf6,#ec4899)] opacity-20 blur-[100px] animate-ultra-spin" />
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-[40px]" />
                            </div>

                            <div className="h-28 w-full relative overflow-hidden z-10 shrink-0 border-b border-white/5">
                                <Image src={merchant.bannerUrl || merchant.customBanner || '/placeholder.jpg'} alt="banner" fill className="object-cover opacity-100 group-hover:scale-110 transition-transform duration-[3s]" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-transparent to-transparent opacity-60" />
                            </div>

                            {/* 头像靠左：保持原有不对称设计 */}
                            <div className="absolute top-16 left-6 z-30">
                                <div className="relative h-20 w-20 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-primary to-cyan-400 animate-hue-rotate blur-[2px] shadow-[0_0_20px_rgba(236,72,153,0.3)]" />
                                    <div className="relative h-[68px] w-[68px] rounded-full bg-black ring-[6px] ring-black overflow-hidden z-10">
                                        <Avatar className="w-full h-full">
                                            <AvatarImage src={merchant.photoURL || merchant.avatarUrl} className="object-cover" style={{ filter: 'none !important' as any }} />
                                            <AvatarFallback className="bg-black text-white/20 uppercase text-xl font-black">{(merchant.displayName || merchant.name || "U").charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0 bg-yellow-400 text-black px-1.5 py-0.5 rounded-sm font-black text-[8px] uppercase shadow-[0_0_10px_#eab308] z-20 border border-black/50 tracking-tighter">
                                        PRO
                                    </div>
                                </div>
                            </div>

                            {/* 文本靠左：商户名字和勋章保持在左侧 */}
                            <div className="pt-12 px-6 relative z-20 flex flex-col items-start text-left w-full">
                                <h3 className="font-headline text-xl md:text-2xl font-black italic tracking-tighter bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] group-hover:text-primary transition-colors duration-500 truncate w-full">
                                    {merchant.displayName || merchant.name}
                                </h3>

                                <div className="flex flex-wrap gap-1 mt-2 min-h-[1.5rem] justify-start">
                                    {merchant.medals?.map((medal: any, idx: number) => (
                                        <div key={idx} className="h-5 w-5 rounded-md bg-white/5 border border-white/10 p-0.5 flex items-center justify-center backdrop-blur-md hover:bg-white/10 transition-all">
                                            <Image src={typeof medal === 'string' ? medal : (medal.icon || '/medals/default.png')} alt="medal" width={14} height={14} className="object-contain animate-pulse-subtle" />
                                        </div>
                                    ))}
                                </div>

                                {/* 按钮水平居中 */}
                                <div className="mt-2 flex w-full justify-center">
                                    <Badge className="bg-primary/10 border border-primary/40 text-primary text-[8px] font-black uppercase px-4 py-1.5 tracking-[0.2em] shadow-[0_0_10px_rgba(236,72,153,0.15)]">
                                        {merchant.isPro ? 'ELITE_ENTITY' : 'VERIFIED_NODE'}
                                    </Badge>
                                </div>
                            </div>

                            {/* 🚀 底部 Feature 区域究极放大版 */}
                            <div className="px-4 pb-4 mt-auto relative z-20">
                                <div 
                                    className="rounded-[28px] border border-white/10 bg-black/60 backdrop-blur-3xl hover:bg-black/90 hover:border-primary/50 transition-all p-3 flex gap-4 items-center group/feat shadow-2xl"
                                    onClick={(e) => { e.stopPropagation(); if (merchant.featuredProductId) router.push(`/products/${merchant.featuredProductId}`); }}
                                >
                                    {/* 🚀 图片史诗级放大: w-20 h-20 (80px) */}
                                    <div className="w-20 h-20 rounded-[20px] overflow-hidden relative border border-white/10 shrink-0 bg-black group-hover/feat:scale-105 transition-transform shadow-lg">
                                        <Image src={merchant.dynamicFeaturedImg} alt="feat" fill className="object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="overflow-hidden flex-1 text-left flex flex-col justify-center">
                                        {/* 🚀 提示文字和星星同步放大 */}
                                        <p className="text-[11px] text-primary font-black uppercase flex items-center gap-1.5 tracking-[0.2em] mb-1.5">
                                            <Sparkles className="w-4 h-4 animate-pulse"/> 
                                            FEATURED
                                        </p>
                                        {/* 🚀 商品名称字体放大到 text-sm */}
                                        <p className="text-sm text-white/90 font-bold line-clamp-2 leading-snug uppercase group-hover:text-white transition-colors">
                                            {merchant.dynamicFeaturedName}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes ultra-spin { from { transform: rotate(0deg) scale(1); } to { transform: rotate(360deg) scale(1.5); } }
                .animate-ultra-spin { animation: ultra-spin 25s linear infinite; }
                @keyframes hue-rotate { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
                .animate-hue-rotate { animation: hue-rotate 6s linear infinite; }
                @keyframes liquid-flow { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(10%, -10%) scale(1.1); } 100% { transform: translate(0, 0) scale(1); } }
                .animate-liquid-flow { animation: liquid-flow 10s infinite ease-in-out; }
                @keyframes pulse-subtle { 0%, 100% { opacity: 0.8; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
                .animate-pulse-subtle { animation: pulse-subtle 3s infinite ease-in-out; }
                .font-headline { font-family: 'Playfair Display', serif; }
            `}</style>
        </section>
    );
}