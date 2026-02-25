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
    type DocumentData 
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, Zap, ShoppingBag, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function VerifiedMerchants() {
    const [merchants, setMerchants] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const db = useFirestore();
    const router = useRouter();

    useEffect(() => {
        if (!db) return;

        const fetchByShortIds = async () => {
            setLoading(true);
            try {
                const configRef = doc(db, 'configs', 'verified_merchants');
                const configSnap = await getDoc(configRef);
                if (!configSnap.exists()) { setMerchants([]); return; }

                const shortIds: string[] = configSnap.data().fixedMerchantIds || [];
                const validShortIds = shortIds.filter(id => id.trim() !== "");
                if (validShortIds.length === 0) { setMerchants([]); return; }

                // 🚀 安全协议：严格 50 条上限 [cite: 2026-02-07]
                const q = query(
                    collection(db, 'users'),
                    where('loginId', 'in', validShortIds.slice(0, 10)), 
                    limit(50) 
                );

                const querySnapshot = await getDocs(q);
                const merchantDocs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // 🚀 数据口径对接：抓取关联商品信息
                const enrichedMerchants = await Promise.all(merchantDocs.map(async (m) => {
                    if (m.featuredProductId) {
                        const productSnap = await getDoc(doc(db, 'products', m.featuredProductId));
                        if (productSnap.exists()) {
                            const pData = productSnap.data();
                            return { 
                                ...m, 
                                dynamicFeaturedImg: pData.images?.[0] || pData.coverImage || pData.photoURL,
                                dynamicFeaturedName: pData.name 
                            };
                        }
                    }
                    return m;
                }));

                const ordered = validShortIds
                    .map(sid => enrichedMerchants.find(u => String(u.loginId) === String(sid)))
                    .filter(u => u !== undefined);

                setMerchants(ordered as DocumentData[]);
            } catch (error: any) {
                console.error("Pro UI Flow Failed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchByShortIds();
    }, [db]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <section className="container mx-auto px-4 py-12">
                <div className="flex gap-4 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-[380px] flex-1 shrink-0 rounded-[32px] bg-white/5" />
                    ))}
                </div>
            </section>
        );
    }

    if (merchants.length === 0) return null;

    return (
        <section className="container mx-auto px-4 py-12 relative group/section">
            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-1.5 bg-gradient-to-b from-primary to-violet-600 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                    <h2 className="font-headline text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                        Verified Merchants
                    </h2>
                </div>
            </div>

            {/* 左右箭头略... */}

            <div ref={scrollContainerRef} className="flex overflow-x-hidden scroll-smooth gap-4 pb-6">
                {merchants.map((merchant) => (
                    <div 
                        key={merchant.id}
                        className="group shrink-0 basis-[calc((100%/6)-(1rem*5/6))] relative rounded-[32px] bg-[#0A0A0B] border border-white/5 hover:border-primary/50 transition-all duration-500 overflow-hidden shadow-2xl flex flex-col h-[380px] cursor-pointer"
                        onClick={() => router.push(`/u/${merchant.loginId || merchant.id}`)}
                    >
                        {/* 1. 背景横幅 */}
                        <div className="h-32 w-full relative overflow-hidden">
                            <img 
                                src={merchant.bannerUrl || merchant.customBanner || merchant.cover || 'https://picsum.photos/seed/cyber/400/200'} 
                                className="object-cover w-full h-full opacity-100 group-hover:scale-110 transition-transform duration-700"
                                alt="banner"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent" />
                        </div>

                        {/* 2. 头像 */}
                        <div className="absolute top-20 left-4 z-20">
                            <div className="relative">
                                <Avatar className="w-16 h-16 border-4 border-[#0A0A0B] shadow-2xl">
                                    <AvatarImage src={merchant.photoURL} className="object-cover" />
                                    <AvatarFallback className="bg-white/10 text-primary font-black">{merchant.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/10">
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                </div>
                            </div>
                        </div>

                        {/* 3. 身份信息 */}
                        <div className="pt-8 px-5 pb-1">
                            <h3 className="font-headline text-base font-bold text-white truncate group-hover:text-primary transition-colors uppercase">
                                {merchant.displayName || merchant.name}
                            </h3>
                            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-0.5">
                                {merchant.isPro ? 'PRO ENTITY' : 'VERIFIED MERCHANT'}
                            </p>
                        </div>

                        {/* 🚀 4. 关键：精选内容预览 (带独立点击跳转) */}
                        <div className="px-5 pb-6 mt-auto">
                            <div 
                                className="rounded-2xl overflow-hidden border border-white/5 bg-white/[0.03] hover:bg-white/[0.1] hover:border-primary/30 transition-all p-3 z-30"
                                onClick={(e) => {
                                    e.stopPropagation(); // 💥 阻止冒泡，防止触发进入个人主页
                                    if (merchant.featuredProductId) {
                                        router.push(`/product/${merchant.featuredProductId}`);
                                    }
                                }}
                            >
                                <div className="flex gap-3 items-center">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/5 shadow-inner bg-black">
                                        <img 
                                            src={merchant.dynamicFeaturedImg || merchant.photoURL} 
                                            className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                                            alt="featured"
                                        />
                                    </div>
                                    <div className="overflow-hidden flex-1">
                                        <p className="text-[10px] text-primary/70 font-bold uppercase mb-0.5 flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5"/> Featured_Link
                                        </p>
                                        <p className="text-[10px] text-white/40 line-clamp-2 leading-tight italic">
                                            {merchant.dynamicFeaturedName || merchant.bio || 'Protocol synchronization...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}