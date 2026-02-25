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
// 🚀 核心修复：确保导入了 Button 组件
import { Button } from '@/components/ui/button'; 
import { ShieldCheck, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export function VerifiedMerchants() {
    const [merchants, setMerchants] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const db = useFirestore();
    const router = useRouter();

    useEffect(() => {
        if (!db) return;

        const fetchEnrichedData = async () => {
            setLoading(true);
            try {
                // 1. 获取认证商户配置 (从后台 promotions 页面设置的数据)
                const configSnap = await getDoc(doc(db, 'configs', 'verified_merchants'));
                if (!configSnap.exists()) { setMerchants([]); return; }

                const shortIds: string[] = configSnap.data().fixedMerchantIds || [];
                const validShortIds = shortIds.filter(id => id.trim() !== "").slice(0, 15);
                if (validShortIds.length === 0) { setMerchants([]); return; }

                // 2. 批量获取用户文档 (严格执行 50 条上限协议 [cite: 2026-02-07])
                const usersSnap = await getDocs(query(
                    collection(db, 'users'), 
                    where('loginId', 'in', validShortIds), 
                    limit(PAGE_LIMIT_SAFETY) 
                ));
                const merchantDocs = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // 3. 🚀 性能优化：提取所有精选商品 ID 并进行批量查询，拒绝循环请求
                const productIds = merchantDocs.map(m => m.featuredProductId).filter(Boolean);
                let productMap: Record<string, any> = {};

                if (productIds.length > 0) {
                    const productsSnap = await getDocs(query(
                        collection(db, 'products'),
                        where(documentId(), 'in', productIds)
                    ));
                    productsSnap.forEach(pDoc => {
                        productMap[pDoc.id] = pDoc.data();
                    });
                }

                // 4. 数据高保真组装：确保顺序与配置一致
                const ordered = validShortIds.map(sid => {
                    const m = merchantDocs.find(u => String(u.loginId) === String(sid));
                    if (!m) return null;
                    const pData = productMap[m.featuredProductId];
                    return {
                        ...m,
                        dynamicFeaturedImg: pData?.images?.[0] || pData?.coverImage || m.photoURL || '/placeholder.jpg',
                        dynamicFeaturedName: pData?.name || m.bio || 'Protocol Node Synchronization...'
                    };
                }).filter(Boolean);

                setMerchants(ordered as DocumentData[]);
            } catch (error) {
                console.error("Merchant Flow Sync Failed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrichedData();
    }, [db]);

    // 常量定义，确保符合安全协议
    const PAGE_LIMIT_SAFETY = 50; 

    // 🚀 补全滚动控制功能
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;
            scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <section className="container mx-auto px-4 py-12 flex gap-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-[400px] flex-1 shrink-0 rounded-[32px] bg-white/5 animate-pulse" />
                ))}
            </section>
        );
    }

    if (merchants.length === 0) return null;

    return (
        <section className="container mx-auto px-4 py-12 relative group/section">
            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-1.5 bg-gradient-to-b from-primary to-violet-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                    <h2 className="font-headline text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                        Verified Merchants
                    </h2>
                </div>

                {/* 🚀 恢复：左右切换按钮 */}
                <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity duration-500">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => scroll('left')} 
                        className="rounded-full bg-black/50 border-white/10 hover:bg-primary hover:text-black"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => scroll('right')} 
                        className="rounded-full bg-black/50 border-white/10 hover:bg-primary hover:text-black"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* 滚动容器 */}
            <div 
                ref={scrollContainerRef} 
                className="flex overflow-x-auto scroll-smooth gap-4 pb-6 cyber-scrollbar snap-x"
            >
                {merchants.map((merchant) => (
                    <div 
                        key={merchant.id}
                        className="group shrink-0 basis-full sm:basis-[calc(50%-1rem)] lg:basis-[calc(33.33%-1rem)] xl:basis-[calc(16.66%-1rem)] snap-start relative rounded-[32px] bg-[#0A0A0B] border border-white/5 hover:border-primary/50 transition-all duration-500 overflow-hidden shadow-2xl flex flex-col h-[400px] cursor-pointer"
                        onClick={() => router.push(`/u/${merchant.loginId || merchant.id}`)}
                    >
                        {/* 1. 背景横幅 */}
                        <div className="h-32 w-full relative overflow-hidden">
                            <Image 
                                src={merchant.bannerUrl || merchant.customBanner || '/placeholder.jpg'} 
                                alt="banner" fill className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent" />
                        </div>

                        {/* 2. 头像与认证标志 */}
                        <div className="absolute top-20 left-4 z-20">
                            <div className="relative">
                                <Avatar className="w-16 h-16 border-4 border-[#0A0A0B] shadow-2xl">
                                    <AvatarImage src={merchant.photoURL} className="object-cover" />
                                    <AvatarFallback className="bg-white/10 text-primary font-black">
                                        {(merchant.displayName || merchant.name || "U").charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/10">
                                    <ShieldCheck className="h-4 w-4 text-green-500" />
                                </div>
                            </div>
                        </div>

                        {/* 3. 身份信息 */}
                        <div className="pt-8 px-5">
                            <h3 className="text-base font-bold text-white truncate uppercase group-hover:text-primary transition-colors">
                                {merchant.displayName || merchant.name}
                            </h3>
                            <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mt-0.5">
                                {merchant.isPro ? 'PRO ENTITY' : 'VERIFIED MERCHANT'}
                            </p>
                        </div>

                        {/* 4. 精选内容预览 (带 stopPropagation 阻止父级跳转) */}
                        <div className="px-5 pb-6 mt-auto">
                            <div 
                                className="rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/30 transition-all p-3 flex gap-3 items-center z-30"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (merchant.featuredProductId) {
                                        router.push(`/products/${merchant.featuredProductId}`);
                                    }
                                }}
                            >
                                <div className="w-12 h-12 rounded-lg overflow-hidden relative border border-white/5 bg-black shrink-0">
                                    <Image src={merchant.dynamicFeaturedImg} alt="feat" fill className="object-cover" />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[10px] text-primary/70 font-black uppercase flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5"/> Featured
                                    </p>
                                    <p className="text-[10px] text-white/40 line-clamp-2 leading-tight italic">
                                        {merchant.dynamicFeaturedName}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}