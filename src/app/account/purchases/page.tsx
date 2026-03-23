// @ts-nocheck
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { query, collection, where, orderBy, doc, getDocs, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Image as ImageIcon, Package, MessageSquare, CheckCircle2, Timer, ChevronRight, Loader2, Clock, Hash, User } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import type { Order, Product, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const PAGE_SIZE = 50;

function PurchaseCard({ order, index }: { order: Order; index: number }) {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const productRef = useMemo(() => (firestore && order.productId ? doc(firestore, 'products', order.productId) : null), [firestore, order.productId]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const sellerRef = useMemo(() => (firestore && order.sellerId ? doc(firestore, 'users', order.sellerId) : null), [firestore, order.sellerId]);
    const { data: seller } = useDoc<UserProfile>(sellerRef);

    const safeStatus = order.status || 'pending';
    const statusKey = `accountPurchases.status.${safeStatus.charAt(0).toLowerCase() + safeStatus.slice(1).replace(/\s/g, '')}`;
    const displayStatus = safeStatus === 'paid' ? "已付款" : (t(statusKey) === statusKey ? safeStatus : t(statusKey));
    const isCompleted = ['completed', 'paid'].includes(safeStatus);
    const productDetailUrl = `/products/${order.productId}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className="group relative rounded-xl border border-white/8 bg-[#0d0715]/90 overflow-hidden hover:border-[#D33A89]/40 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(211,58,137,0.14)] flex flex-col"
        >
            {/* Image — 40% height */}
            <Link href={productDetailUrl} className="relative w-full overflow-hidden block" style={{ paddingBottom: '56%' }}>
                <div className="absolute inset-0">
                    {productLoading ? (
                        <Skeleton className="absolute inset-0 bg-white/5" />
                    ) : product?.images?.[0] ? (
                        <>
                            <Image src={product.images[0]} alt="Product" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0715] via-transparent to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.03] text-white/15">
                            <ImageIcon className="w-8 h-8 mb-1 opacity-30" />
                        </div>
                    )}
                    {/* Status */}
                    <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase backdrop-blur-md ${
                        isCompleted ? 'bg-emerald-500/85 text-white' : 'bg-amber-500/85 text-white'
                    }`}>
                        {isCompleted ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Timer className="w-2.5 h-2.5 animate-pulse" />}
                        {displayStatus}
                    </div>
                </div>
            </Link>

            {/* Info section */}
            <div className="flex flex-col gap-0 flex-1 text-[11px]">
                {/* Product name */}
                <div className="px-3 pt-2.5 pb-1.5">
                    <Link href={productDetailUrl}>
                        <h3 className="font-bold text-white hover:text-[#D33A89] transition-colors line-clamp-2 text-sm leading-snug">
                            {order.productName || 'LUNA ASSET'}
                        </h3>
                    </Link>
                </div>

                {/* Divider */}
                <div className="mx-3 h-px bg-white/6" />

                {/* Order details grid */}
                <div className="px-3 py-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">订单号</div>
                        <div className="font-mono text-white/55 truncate">#{order.id?.slice(-8)}</div>
                    </div>
                    <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">下单时间</div>
                        <div className="font-mono text-white/55">
                            {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MM/dd HH:mm') : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">卖家</div>
                        <div className="flex items-center gap-1">
                            <Avatar className="h-3.5 w-3.5 border border-white/10 shrink-0">
                                <AvatarImage src={seller?.photoURL} />
                                <AvatarFallback className="bg-white/10 text-[7px]">{(seller?.displayName || 'S').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-white/60 truncate">{seller?.displayName || '—'}</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">状态</div>
                        <div className={`truncate font-medium ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>{displayStatus}</div>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-3 h-px bg-white/6" />

                {/* Price + actions */}
                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                    <div>
                        <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">总金额</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-[#D33A89] leading-none drop-shadow-[0_0_8px_rgba(211,58,137,0.4)]">
                                {(order.totalAmount || 0).toLocaleString()}
                            </span>
                            <span className="text-[9px] font-mono text-[#D33A89]/50">USDT</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        <Link href={order.sellerId ? `/messages?to=${order.sellerId}` : '#'}
                            className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/5 border border-white/10 text-white/35 hover:text-[#D33A89] hover:border-[#D33A89]/40 transition-all">
                            <MessageSquare className="h-3.5 w-3.5" />
                        </Link>
                        <Link href={`/account/purchases/${order.id}`}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-[#D33A89] hover:text-white hover:border-[#D33A89] transition-all text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">
                            详情 <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function PurchasesPage() {
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [purchaseOrders, setPurchaseOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchOrders = useCallback(async (isNextPage = false) => {
        if (!user?.uid || !db) return;
        if (isNextPage && !lastVisible) return;
        isNextPage ? setLoadingMore(true) : setLoading(true);
        try {
            let q = query(collection(db, "orders"), where("buyerId", "==", user.uid), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            if (isNextPage && lastVisible) q = query(q, startAfter(lastVisible));
            const snap = await getDocs(q);
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
            setPurchaseOrders(prev => isNextPage ? [...prev, ...orders] : orders);
            setLastVisible(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) { console.error(err); }
        finally { isNextPage ? setLoadingMore(false) : setLoading(false); }
    }, [user?.uid, db, lastVisible]);

    useEffect(() => { if (mounted && user?.uid && db) fetchOrders(); }, [user?.uid, db, mounted]);

    if (!mounted || authLoading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-7 w-7 animate-spin text-[#D33A89]" />
        </div>
    );
    if (!user) return null;

    const totalSpent = purchaseOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    return (
        <div suppressHydrationWarning className="p-4 md:p-5">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#D33A89]/12 border border-[#D33A89]/25 flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-[#D33A89]" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-none">我买到的</h1>
                        <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest mt-0.5">Purchase History</p>
                    </div>
                </div>
                {!loading && purchaseOrders.length > 0 && (
                    <div className="flex gap-3 text-right">
                        <div><div className="text-[9px] text-white/30 uppercase">共</div><div className="text-sm font-black text-white">{purchaseOrders.length} 单</div></div>
                        <div className="w-px bg-white/8" />
                        <div><div className="text-[9px] text-white/30 uppercase">总计</div><div className="text-sm font-black text-[#D33A89]">{totalSpent.toLocaleString()} <span className="text-[9px] opacity-50">U</span></div></div>
                    </div>
                )}
            </motion.div>

            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl bg-white/[0.03]" />)}
                </div>
            )}

            {!loading && purchaseOrders.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-24 text-center border border-dashed border-white/8 rounded-2xl">
                    <Package className="mx-auto h-10 w-10 mb-3 text-white/12" />
                    <p className="text-sm font-bold uppercase tracking-widest text-white/25">暂无购买记录</p>
                </motion.div>
            )}

            {!loading && purchaseOrders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {purchaseOrders.map((order, i) => <PurchaseCard key={`${order.id}-${i}`} order={order} index={i} />)}
                </div>
            )}

            {hasMore && !loading && purchaseOrders.length > 0 && (
                <div className="mt-6 text-center">
                    <Button onClick={() => fetchOrders(true)} disabled={loadingMore} variant="ghost"
                        className="text-white/35 hover:text-[#D33A89] text-[11px] font-bold uppercase tracking-widest border border-white/8 hover:border-[#D33A89]/30 py-4 px-8 rounded-full transition-all">
                        {loadingMore ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : null}加载更多
                    </Button>
                </div>
            )}
        </div>
    );
}
