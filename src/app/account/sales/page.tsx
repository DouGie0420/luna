// @ts-nocheck
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { query, collection, where, orderBy, doc, getDocs, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { DollarSign, Image as ImageIcon, Package, MessageSquare, Clock, CheckCircle2, Timer, ChevronRight, Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import type { Order, Product, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

function SalesOrderCard({ order }: { order: Order }) {
    const { t } = useTranslation();
    const firestore = useFirestore();
    
    const productRef = useMemo(() => (firestore && order.productId ? doc(firestore, 'products', order.productId) : null), [firestore, order.productId]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const buyerRef = useMemo(() => (firestore && order.buyerId ? doc(firestore, 'users', order.buyerId) : null), [firestore, order.buyerId]);
    const { data: buyer } = useDoc<UserProfile>(buyerRef);

    // 🚀 核心修复：高精度格式化，支持 0.0001 ETH 显示
    const formatPrice = (price: any) => {
        return Number(price || 0).toLocaleString('en-US', { 
            maximumFractionDigits: 6 
        });
    };

    const safeStatus = (order.status || 'pending').toLowerCase();
    
    // ✅ 逻辑同步：判断是否已支付
    const isPaidStatus = ['paid', 'shipped', 'completed', 'disputed'].includes(safeStatus);
    
    const statusKey = `accountPurchases.status.${safeStatus.charAt(0).toLowerCase() + safeStatus.slice(1).replace(/\s/g, '')}`;
    const displayStatus = isPaidStatus ? "買家已付款" : (t(statusKey) === statusKey ? safeStatus : t(statusKey));

    const productDetailUrl = `/products/${order.productId}`;

    return (
        <div className="group relative bg-[#130812]/80 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 md:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.05)] hover:border-[#D33A89]/30 hover:shadow-[0_15px_40px_rgba(211,58,137,0.15)] transition-all duration-500 overflow-hidden flex flex-col md:flex-row gap-6 md:gap-8">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#D33A89]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#D33A89]/20 transition-colors" />

            {/* 左側：商品圖片 */}
            <Link href={productDetailUrl} className="w-full md:w-48 h-48 relative bg-black/40 rounded-2xl shrink-0 overflow-hidden border border-white/5 shadow-inner block group/img cursor-pointer">
                {productLoading ? (
                    <Skeleton className="w-full h-full bg-white/5" />
                ) : product?.images?.[0] ? (
                    <Image src={product.images[0]} alt="Product" fill className="object-cover group-hover/img:scale-110 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 font-mono text-[10px] tracking-widest bg-white/[0.02]">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-40" /> NO IMAGE
                    </div>
                )}
            </Link>

            <div className="flex-1 flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-white/5 rounded text-[9px] font-mono text-white/40 tracking-widest uppercase border border-white/10">Order ID</span>
                            <span className="font-mono text-xs text-white/50 tracking-wider truncate max-w-[150px] md:max-w-none">{order.id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Avatar className="h-5 w-5 border border-white/10">
                                <AvatarImage src={buyer?.photoURL} />
                                <AvatarFallback className="bg-white/10 text-[10px]">{(buyer?.displayName || 'B').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] text-white/60 font-mono">Buyer: <span className="text-white/80 font-bold">{buyer?.displayName || order.buyerId?.slice(0, 8) || 'Unknown'}</span></span>
                        </div>
                    </div>
                    
                    {/* ✅ 状态标签根据逻辑变色 */}
                    {isPaidStatus ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-[11px] font-bold shadow-[0_0_10px_rgba(34,197,94,0.1)] uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {displayStatus}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-[11px] font-bold shadow-[0_0_10px_rgba(234,179,8,0.1)] uppercase tracking-wider animate-pulse">
                            <Timer className="w-3.5 h-3.5" /> {displayStatus}
                        </div>
                    )}
                </div>

                <Link href={productDetailUrl} className="block w-fit mb-6">
                    <h3 className="text-xl font-bold text-white leading-snug hover:text-[#D33A89] transition-colors line-clamp-2 cursor-pointer">
                        {order.productName || 'LUNA ASSET'}
                    </h3>
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-auto">
                    <div className="flex gap-8 md:gap-12">
                        <div className="flex flex-col gap-1.5">
                            <span className="flex items-center gap-1.5 text-[11px] text-white/40 uppercase tracking-widest font-semibold"><Clock className="w-3 h-3" /> 下單時間</span>
                            <span className="font-mono text-sm text-white/80">{order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'PROCESSING...'}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] text-white/40 uppercase tracking-widest font-semibold mb-0.5">訂單總額</span>
                            <div className="flex items-baseline gap-1">
                                {/* ✅ 修复：显示高精度数值 */}
                                <span className="font-black text-2xl text-[#D33A89] leading-none drop-shadow-[0_0_15px_rgba(211,58,137,0.4)]">
                                    {formatPrice(order.totalAmount || order.price)}
                                </span>
                                {/* ✅ 修复：根据数据库字段显示单位 */}
                                <span className="font-mono text-[10px] text-[#D33A89]/70">{order.currency || 'ETH'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <Button variant="ghost" size="icon" asChild className="h-11 w-11 shrink-0 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-[#D33A89] hover:border-[#D33A89]/50 hover:bg-[#D33A89]/10 transition-all shadow-[0_5px_15px_rgba(0,0,0,0.3)]">
                            <Link href={order.buyerId ? `/messages?to=${order.buyerId}` : '#'}>
                                <MessageSquare className="h-5 w-5" />
                            </Link>
                        </Button>
                        <Button asChild className="flex-1 md:flex-none h-11 px-8 bg-white/5 hover:bg-[#D33A89] text-white/70 hover:text-white border border-white/10 hover:border-[#D33A89] rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(0,0,0,0.3)] group/btn">
                            <Link href={`/account/sales/${order.id}`}>
                                <span className="text-[12px] font-black uppercase tracking-widest">管理訂單</span>
                                <ChevronRight className="w-4 h-4 text-white/30 group-hover/btn:text-white transition-colors group-hover/btn:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SalesPage() {
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [salesOrders, setSalesOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchOrders = useCallback(async (isNextPage = false) => {
        if (!user?.uid || !db) return;
        if (isNextPage && !lastVisible) return;

        isNextPage ? setLoadingMore(true) : setLoading(true);
        
        try {
            let q = query(
                collection(db, "orders"), 
                where("sellerId", "==", user.uid), 
                orderBy("createdAt", "desc"), 
                limit(PAGE_SIZE)
            );
            
            if (isNextPage && lastVisible) {
                q = query(q, startAfter(lastVisible));
            }
            
            const documentSnapshots = await getDocs(q);
            const orders = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            
            setSalesOrders(prev => isNextPage ? [...prev, ...orders] : orders);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
        } catch (err) { 
            console.error("Sales Protocol Error:", err); 
        } finally { 
            isNextPage ? setLoadingMore(false) : setLoading(false); 
        }
    }, [user?.uid, db, lastVisible]);

    useEffect(() => { 
        if (mounted && user?.uid && db) {
            fetchOrders();
        }
    }, [user?.uid, db, mounted]);

    if (!mounted || authLoading) {
        return <div className="p-20 text-center text-[#D33A89] italic font-black animate-pulse tracking-[0.3em] font-mono text-xs">SYNCHRONIZING REVENUE...</div>;
    }

    if (!user) {
        return <div className="p-32 text-center text-white/30 font-mono text-[10px] uppercase tracking-[0.5em]">Identity verification required</div>;
    }

    return (
        <div suppressHydrationWarning className="p-6 md:p-12 max-w-5xl mx-auto relative z-10">
            <div className="flex items-center gap-5 mb-12">
                <div className="w-14 h-14 rounded-2xl bg-[#D33A89]/10 flex items-center justify-center border border-[#D33A89]/30 shadow-[0_0_25px_rgba(211,58,137,0.2)]">
                    <DollarSign className="h-6 w-6 text-[#D33A89]" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">我賣出的</h1>
                    <p className="text-[10px] text-white/40 font-mono tracking-[0.4em] uppercase mt-1">Revenue Management Protocol</p>
                </div>
            </div>

            {loading && (
                <div className="space-y-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={`skel-${i}`} className="h-56 w-full bg-[#130812]/50 rounded-[2rem] border border-white/5" />)}
                </div>
            )}
            
            {!loading && salesOrders.length === 0 && (
                <div className="py-32 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01] backdrop-blur-sm">
                    <Package className="mx-auto h-16 w-16 mb-6 text-white/20" />
                    <p className="text-lg font-black italic uppercase tracking-widest text-white/40">Revenue Archive Empty</p>
                    <p className="text-[10px] font-mono text-white/20 mt-2 tracking-widest">No sales records found.</p>
                </div>
            )}

            {!loading && salesOrders.length > 0 && (
                <div className="space-y-6">
                    {salesOrders.map((order, index) => (
                        <SalesOrderCard key={`${order.id}-${index}`} order={order} />
                    ))}
                </div>
            )}

            {hasMore && !loading && salesOrders.length > 0 && (
                <div className="mt-16 text-center">
                    <Button 
                        onClick={() => fetchOrders(true)} 
                        disabled={loadingMore} 
                        variant="ghost" 
                        className="text-white/40 hover:text-[#D33A89] tracking-[0.4em] text-[10px] font-black uppercase transition-all border border-transparent hover:border-[#D33A89]/30 py-6 px-10 rounded-full"
                    >
                        {loadingMore ? <Loader2 className="animate-spin mr-3 h-4 w-4" /> : null}
                        Expand Archive (50+)
                    </Button>
                </div>
            )}
        </div>
    );
}