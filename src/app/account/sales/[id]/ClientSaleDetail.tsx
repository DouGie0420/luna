'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
    Package, Truck, CheckCircle2, ShieldCheck,
    Copy, MapPin, MessageSquare, AlertOctagon,
    ChevronLeft, ExternalLink, Timer, Loader2, Info, Send, Sparkles, Handshake,
    Wallet, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Order, Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import dynamic from 'next/dynamic';

// ✅ 聊天组件动态导入（修复 [object Module] 报错）
const ChatWindow = dynamic(
  () => import('@/components/chat/ChatWindow').then((mod) => mod.default || mod),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-64 border border-white/5 rounded-[32px] bg-white/5 animate-pulse">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">Connecting_Protocol_Channel...</p>
      </div>
    ),
  }
);

interface ClientSaleDetailProps {
  id: string;
}

export default function ClientSaleDetail({ id }: ClientSaleDetailProps) {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const orderId = id;
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const orderRef = useMemo(() => (firestore && orderId) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);

    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const buyerRef = useMemo(() => firestore && order?.buyerId ? doc(firestore, 'users', order.buyerId) : null, [firestore, order]);
    const { data: buyer } = useDoc<UserProfile>(buyerRef);

    // 🚀 核心修复：高精度格式化，支持 0.0001 ETH 显示
    const formatPrice = (price: any) => {
        return Number(price || 0).toLocaleString('en-US', { 
            maximumFractionDigits: 6 
        });
    };

    useEffect(() => {
        if (mounted && !authLoading && !user) router.replace('/');
    }, [user, authLoading, router, mounted]);

    const isLoading = !mounted || orderLoading || productLoading || authLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center gap-4 text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Accessing_Sales_Protocol...</p>
            </div>
        );
    }

    if (!order || orderError || (user && order.sellerId !== user.uid)) {
        return (
            <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center gap-6">
                <AlertOctagon className="w-16 h-16 text-red-500 opacity-30" />
                <p className="font-mono text-xs tracking-widest text-white/40 uppercase">Access_Denied</p>
                <Button onClick={() => router.push('/account/sales')} variant="ghost">Return to Sales List</Button>
            </div>
        );
    }

    const status = (order.status || 'pending').toLowerCase();
    
    // ✅ 修复：状态判断逻辑，只要数据库里是 paid，isPaid 就必须为 true
    const isPaid = ['paid', 'shipped', 'completed', 'disputed'].includes(status);
    const isShipped = ['shipped', 'completed'].includes(status);
    const isCompleted = status === 'completed';

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-32 font-sans">
            <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full mix-blend-screen" />
            </div>

            <div className="fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-xl border-b border-white/5">
                <PageHeaderWithBackAndClose />
            </div>

            <main className="container mx-auto max-w-6xl px-4 pt-36 relative z-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
                            <div className="w-3 h-10 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                            Sale Protocol
                        </h1>
                        <p className="text-[11px] font-mono text-white/30 tracking-[0.3em] uppercase mt-3 pl-7">LEDGER_ID: {order.id}</p>
                    </div>
                    {/* ✅ 状态标签：修复 paymentMethod 判断 */}
                    <div className={cn(
                        "flex items-center gap-3 px-5 py-2.5 rounded-full text-[10px] font-black font-mono tracking-widest uppercase border transition-all duration-500",
                        isPaid ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse"
                    )}>
                        {isPaid ? <ShieldCheck className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                        {isPaid ? 'Payment_Verified' : 'Awaiting_Deposit'}
                    </div>
                </div>

                {/* 进度面板 */}
                <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-10">
                        <div className="flex-1 w-full relative px-6">
                            <div className="absolute top-5 left-10 right-10 h-1 bg-white/5 rounded-full" />
                            <div className={cn(
                                "absolute top-5 left-10 h-1 bg-gradient-to-r from-blue-500/50 to-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-1000",
                                isCompleted ? "w-[calc(100%-80px)]" : isShipped ? "w-[66%]" : isPaid ? "w-[33%]" : "w-0"
                            )} />
                            <div className="relative flex justify-between">
                                {[
                                    { step: 1, label: 'Paid', active: isPaid, icon: ShieldCheck },
                                    { step: 2, label: 'Shipped', active: isShipped, icon: Truck },
                                    { step: 3, label: 'Done', active: isCompleted, icon: CheckCircle2 }
                                ].map((s) => (
                                    <div key={s.step} className="flex flex-col items-center gap-4 relative z-10 w-24">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                                            s.active ? "bg-blue-500 border-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-110" : "bg-[#0A0A0A] border-white/10 text-white/30"
                                        )}>
                                            <s.icon className={cn("w-5 h-5", s.active && "animate-pulse")} />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black tracking-widest uppercase",
                                            s.active ? "text-blue-500" : "text-white/30"
                                        )}>{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-full xl:w-1/3 flex flex-col gap-4">
                            <div className="text-center p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm shadow-inner">
                                <p className="text-[10px] font-mono text-white/50 tracking-[0.2em] uppercase mb-2">Protocol_Status</p>
                                <p className="text-sm font-bold text-white uppercase tracking-wider">
                                    {/* ✅ 核心文字状态修复 */}
                                    {isCompleted ? 'Transaction Finalized' : 
                                     isShipped ? 'Artifact Dispatched' : 
                                     isPaid ? 'Payment Verified - Please Ship' : 
                                     'Awaiting Buyer Payment'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* 商品信息卡片 */}
                        <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                            <CardContent className="p-8">
                                <div className="flex flex-col md:flex-row gap-8">
                                    <div className="w-full md:w-48 h-48 rounded-[32px] overflow-hidden border border-white/10 flex-shrink-0 relative">
                                        <Image src={order.productImage || '/placeholder.jpg'} alt="Artifact" fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 space-y-6">
                                        <div>
                                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">{order.productName}</h2>
                                            <p className="text-blue-400 font-mono text-sm tracking-widest uppercase mt-1">Ref_ID: {order.productId}</p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-10 pt-4 border-t border-white/5">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Payout_Value</p>
                                                <p className="text-3xl font-black text-white italic">{formatPrice(order.price)} <span className="text-xs text-blue-400 font-mono ml-1">{order.currency || 'ETH'}</span></p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Gateway</p>
                                                <div className="flex items-center gap-2 text-white/70 font-bold text-sm uppercase tracking-wider">
                                                    <Wallet className="w-4 h-4 text-blue-400" /> {order.paymentMethod?.toUpperCase() || 'ETH'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ✅ 恢复：聊天窗口（之前版本漏掉了） */}
                        <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 shadow-2xl min-h-[450px] overflow-hidden">
                            <div className="flex items-center gap-3 mb-8 pl-4 border-l-2 border-blue-500">
                                <MessageSquare className="w-5 h-5 text-blue-500" />
                                <h3 className="text-sm font-black italic text-white uppercase tracking-[0.2em]">Secure Buyer Communication</h3>
                            </div>
                            <ChatWindow
                                orderId={order.id}
                                sellerId={order.sellerId}
                                buyerId={order.buyerId}
                                productName={order.productName}
                            />
                        </Card>
                    </div>

                    {/* 右侧：买家详情与收货地址 */}
                    <div className="space-y-8">
                        {buyer && (
                            <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 shadow-2xl">
                                <h3 className="text-[10px] font-black italic text-white/30 uppercase tracking-[0.3em] mb-6">Target_Buyer_Node</h3>
                                <div className="flex items-center gap-4">
                                    <Avatar className="w-16 h-16 border-2 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                        <AvatarImage src={buyer.photoURL} />
                                        <AvatarFallback className="bg-blue-600 text-white font-black">{(buyer.displayName || 'B').charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-black italic text-lg text-white">{buyer.displayName}</p>
                                        <p className="text-[10px] font-mono text-white/40">{buyer.email}</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {order.shippingAddress && (
                            <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                    <h3 className="text-xs font-black italic text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Logistics Node
                                    </h3>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Recipient</p>
                                        <p className="text-sm font-bold">{(order.shippingAddress as any).recipientName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Address</p>
                                        <p className="text-xs leading-relaxed text-white/60 italic">
                                            {(order.shippingAddress as any).addressLine1}, {(order.shippingAddress as any).city}, {(order.shippingAddress as any).country}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-[10px] text-white/30 font-mono mb-1">Comm_Link</p>
                                        <p className="text-xs font-bold font-mono">{(order.shippingAddress as any).phone}</p>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </main>

            <style jsx global>{`
                @keyframes shimmer { 100% { transform: translate(100%); } }
            `}</style>
        </div>
    );
}