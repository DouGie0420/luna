// @ts-nocheck
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { query, collection, where, orderBy, doc, getDocs, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { DollarSign, Image as ImageIcon, Package, MessageSquare, CheckCircle2, Timer, ChevronRight, Loader2 } from "lucide-react";
import { useEthPrice } from '@/hooks/useEthPrice';
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import type { Order, Product, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const PAGE_SIZE = 50;

function SaleCard({ order, index, ethPrice }: { order: Order; index: number; ethPrice: number | null }) {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const productRef = useMemo(() => (firestore && order.productId ? doc(firestore, 'products', order.productId) : null), [firestore, order.productId]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const buyerRef = useMemo(() => (firestore && order.buyerId ? doc(firestore, 'users', order.buyerId) : null), [firestore, order.buyerId]);
    const { data: buyer } = useDoc<UserProfile>(buyerRef);

    const formatPrice = (p: any) => Number(p || 0).toLocaleString('en-US', { maximumFractionDigits: 6 });

    const safeStatus = (order.status || 'pending').toLowerCase();
    const isPaidStatus = ['paid', 'shipped', 'completed', 'disputed'].includes(safeStatus);
    const statusKey = `accountPurchases.status.${safeStatus.charAt(0).toLowerCase() + safeStatus.slice(1).replace(/\s/g, '')}`;
    const displayStatus = isPaidStatus ? "已付款" : (t(statusKey) === statusKey ? safeStatus : t(statusKey));
    const productDetailUrl = `/products/${order.productId}`;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className="group relative rounded-2xl border border-white/8 bg-[#0d0715]/90 overflow-hidden hover:border-emerald-500/40 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(16,185,129,0.14)] flex flex-col"
        >
            {/* Image — 40% height (缩小) */}
            <Link href={productDetailUrl} className="relative w-full overflow-hidden block shrink-0" style={{ paddingBottom: '42%' }}>
                <div className="absolute inset-0">
                    {productLoading ? (
                        <Skeleton className="absolute inset-0 bg-white/5" />
                    ) : product?.images?.[0] ? (
                        <>
                            <Image src={product.images[0]} alt="Product" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0715]/80 via-transparent to-transparent" />
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.03]">
                            <ImageIcon className="w-8 h-8 text-white/15" />
                        </div>
                    )}
                    {/* Status badge */}
                    <div className={`absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md ${
                        isPaidStatus ? 'bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-amber-500/90 text-white'
                    }`}>
                        {isPaidStatus ? <CheckCircle2 className="w-3 h-3" /> : <Timer className="w-3 h-3 animate-pulse" />}
                        {displayStatus}
                    </div>
                </div>
            </Link>

            {/* Info section */}
            <div className="flex flex-col flex-1 p-3 gap-2">
                {/* 商品名 */}
                <Link href={productDetailUrl}>
                    <h3 className="font-bold text-white hover:text-emerald-400 transition-colors line-clamp-2 text-[13px] leading-snug">
                        {order.productName || 'LUNA ASSET'}
                    </h3>
                </Link>

                {/* 金额 + 买家信息 两列 */}
                <div className="flex items-start justify-between gap-2">
                    {/* 左: 金额 */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-baseline gap-1 flex-wrap">
                            <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                {formatPrice(order.totalAmount || order.price)}
                            </span>
                            <span className="text-xs font-mono text-emerald-400/60">ETH</span>
                        </div>
                        {ethPrice && (
                            <span className="text-[11px] font-mono text-white/30">
                                ≈${(Number(order.totalAmount || order.price || 0) * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
                            </span>
                        )}
                    </div>

                    {/* 右: 买家 + 时间 */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate max-w-[90px] text-right">{buyer?.displayName || '买家'}</span>
                            <Avatar className="h-9 w-9 border-2 border-emerald-500/40 shrink-0 ring-1 ring-emerald-500/20">
                                <AvatarImage src={buyer?.photoURL} />
                                <AvatarFallback className="bg-emerald-500/20 text-white text-sm font-bold">{(buyer?.displayName || 'B').charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="text-sm font-bold font-mono text-emerald-400">
                            {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MM/dd HH:mm') : '—'}
                        </span>
                    </div>
                </div>

                <div className="h-px bg-white/6" />

                {/* 操作按钮 */}
                <div className="flex gap-2">
                    <Link href={order.buyerId ? `/messages?to=${order.buyerId}` : '#'}
                        className="flex items-center justify-center gap-1.5 h-8 flex-1 rounded-xl bg-white/5 border border-white/8 text-white/45 hover:text-emerald-400 hover:border-emerald-500/35 transition-all text-[11px] font-semibold">
                        <MessageSquare className="h-3.5 w-3.5" />联系买家
                    </Link>
                    <Link href={`/account/sales/${order.id}`}
                        className="flex items-center justify-center gap-1 h-8 flex-1 rounded-xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all text-[11px] font-bold">
                        详情 <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

export default function SalesPage() {
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();
    const { ethPrice } = useEthPrice();

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
            let q = query(collection(db, "orders"), where("sellerId", "==", user.uid), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
            if (isNextPage && lastVisible) q = query(q, startAfter(lastVisible));
            const snap = await getDocs(q);
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
            setSalesOrders(prev => isNextPage ? [...prev, ...orders] : orders);
            setLastVisible(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) { console.error(err); }
        finally { isNextPage ? setLoadingMore(false) : setLoading(false); }
    }, [user?.uid, db, lastVisible]);

    useEffect(() => { if (mounted && user?.uid && db) fetchOrders(); }, [user?.uid, db, mounted]);

    if (!mounted || authLoading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
        </div>
    );
    if (!user) return null;

    const totalRevenue = salesOrders.reduce((s, o) => s + Number(o.totalAmount || o.price || 0), 0);
    const paidCount = salesOrders.filter(o => ['paid', 'shipped', 'completed', 'disputed'].includes((o.status || '').toLowerCase())).length;

    return (
        <div suppressHydrationWarning className="p-4 md:p-5">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-lg font-black text-white leading-none">我卖出的</h1>
                    <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest mt-0.5">Sales History</p>
                </div>
            </motion.div>

            {/* Stats cards */}
            {!loading && salesOrders.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="relative bg-emerald-500/8 backdrop-blur-sm rounded-2xl border border-emerald-500/25 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                    >
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                        <div className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-xs text-emerald-400/60 font-mono uppercase tracking-wider mb-0.5">已成交</div>
                                <div className="text-3xl font-black text-emerald-400 leading-none drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                                    {paidCount}
                                    <span className="text-sm font-normal text-emerald-400/60 ml-1">单</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative bg-emerald-500/8 backdrop-blur-sm rounded-2xl border border-emerald-500/25 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                    >
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                        <div className="p-4 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                                <DollarSign className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs text-emerald-400/60 font-mono uppercase tracking-wider mb-0.5">总收入</div>
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                                        {totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                                    </span>
                                    <span className="text-xs font-mono text-emerald-400/60">ETH</span>
                                    {ethPrice && (
                                        <span className="text-xs font-mono text-white/30">
                                            ≈${(totalRevenue * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}


            {loading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl bg-white/[0.03]" />)}
                </div>
            )}

            {!loading && salesOrders.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-24 text-center border border-dashed border-white/8 rounded-2xl">
                    <Package className="mx-auto h-10 w-10 mb-3 text-white/12" />
                    <p className="text-sm font-bold uppercase tracking-widest text-white/25">暂无销售记录</p>
                </motion.div>
            )}

            {!loading && salesOrders.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {salesOrders.map((order, i) => (
                        <SaleCard key={`${order.id}-${i}`} order={order} index={i} ethPrice={ethPrice} />
                    ))}
                </div>
            )}

            {hasMore && !loading && salesOrders.length > 0 && (
                <div className="mt-6 text-center">
                    <Button onClick={() => fetchOrders(true)} disabled={loadingMore} variant="ghost"
                        className="text-white/35 hover:text-emerald-400 text-[11px] font-bold uppercase tracking-widest border border-white/8 hover:border-emerald-500/30 py-4 px-8 rounded-full transition-all">
                        {loadingMore ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : null}
                        加载更多
                    </Button>
                </div>
            )}
        </div>
    );
}
