'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
    Package, Truck, CheckCircle2, ShieldCheck, 
    Copy, MapPin, MessageSquare, AlertOctagon, 
    ChevronLeft, ExternalLink, Timer, Loader2, Info, Send, Sparkles
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

export default function SalesOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const orderId = params.id as string || params.orderId as string;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // 獲取數據
    const orderRef = useMemo(() => (firestore && orderId && user?.uid) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId, user?.uid]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);
    
    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);
    
    // 賣家頁面抓取的是「買家 (Buyer)」的資料
    const buyerRef = useMemo(() => firestore && order?.buyerId ? doc(firestore, 'users', order.buyerId) : null, [firestore, order]);
    const { data: buyer } = useDoc<UserProfile>(buyerRef);

    // 發貨表單狀態
    const [carrier, setCarrier] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => { 
        if (mounted && !authLoading && !user) router.replace('/'); 
    }, [user, authLoading, router, mounted]);

    // ✅ 發貨邏輯：狀態變更後輸入框會消失
    const handleShipOrder = async () => {
        if (!firestore || !order) return;
        if (!carrier.trim() || !trackingNumber.trim()) {
            toast({ title: 'Protocol Rejected', description: '請填寫物流資訊。', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);
        try {
            await updateDoc(doc(firestore, 'orders', order.id), { 
                status: 'Shipped', 
                shippingProvider: carrier,
                trackingNumber: trackingNumber,
                shippedAt: serverTimestamp() 
            });
            toast({ title: "指令已下達", description: "物流資訊已同步至買家端。" });
        } catch (e: any) { 
            toast({ variant: 'destructive', title: '系統錯誤' }); 
        } finally { 
            setIsProcessing(false); 
        }
    };

    const isLoading = !mounted || orderLoading || productLoading || authLoading;
    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-[#D33A89]">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing Revenue Protocol...</p>
            </div>
        );
    }
    
    if (!order || orderError || order.sellerId !== user?.uid) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-6 text-white/20 uppercase font-mono text-xs tracking-widest">
                Access Denied
            </div>
        );
    }

    const status = (order.status || 'pending').toLowerCase();
    const isPaid = status === 'paid' || status === 'shipped' || status === 'completed';
    const isShipped = status === 'shipped' || status === 'completed';
    const isCompleted = status === 'completed';

    return (
        <div className="w-full max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <Button variant="ghost" onClick={() => router.push('/account/sales')} className="mb-4 text-white/40 hover:text-primary -ml-4 h-8 px-4 rounded-xl transition-all">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 我賣出的
                    </Button>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
                        <div className="w-3 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(211,58,137,0.5)]" />
                        Sales Management
                    </h1>
                    <p className="text-[11px] font-mono text-white/40 tracking-[0.3em] uppercase mt-2">ID: {order.id}</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold font-mono">
                    <ShieldCheck className="w-4 h-4" /> 資金受合約保護
                </div>
            </div>

            {/* 2. Timeline & Action Area */}
            <div className="bg-[#130812]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-8">
                    <div className="flex-1 w-full relative px-4">
                        <div className="absolute top-5 left-8 right-8 h-1 bg-white/5 rounded-full" />
                        <div className={cn(
                            "absolute top-5 left-8 h-1 bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-[0_0_10px_rgba(211,58,137,0.8)] transition-all duration-1000",
                            isCompleted ? "w-full" : isShipped ? "w-2/3" : isPaid ? "w-1/3" : "w-0"
                        )} />
                        <div className="relative flex justify-between">
                            {['買家下單', 'USDT 鎖倉', '已發貨', '資金結算'].map((step, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-3">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500", (idx === 0 || (idx === 1 && isPaid) || (idx === 2 && isShipped) || (idx === 3 && isCompleted)) ? "bg-primary border-primary text-black" : "bg-[#130812] border-white/10 text-white/30")}>
                                        {idx === 0 && <Package className="w-4 h-4" />}
                                        {idx === 1 && <ShieldCheck className="w-4 h-4" />}
                                        {idx === 2 && <Truck className="w-4 h-4" />}
                                        {idx === 3 && <CheckCircle2 className="w-4 h-4" />}
                                    </div>
                                    <span className={cn("text-[10px] font-bold tracking-widest", (idx === 0 || (idx === 1 && isPaid) || (idx === 2 && isShipped) || (idx === 3 && isCompleted)) ? "text-primary" : "text-white/30")}>{step}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 🚨 核心動態操作區 */}
                    <div className="w-full xl:w-80 flex flex-col gap-3 shrink-0 xl:ml-8 border-t xl:border-t-0 xl:border-l border-white/10 pt-6 xl:pt-0 xl:pl-8">
                        {status === 'paid' ? (
                            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-500">
                                <Input placeholder="物流公司" value={carrier} onChange={(e) => setCarrier(e.target.value)} className="bg-white/5 border-white/10 h-10 rounded-xl focus-visible:ring-primary" />
                                <Input placeholder="運單號碼" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="bg-white/5 border-white/10 h-10 rounded-xl focus-visible:ring-primary font-mono" />
                                <Button onClick={handleShipOrder} disabled={isProcessing} className="w-full h-12 bg-primary text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all shadow-[0_0_20px_rgba(211,58,137,0.3)]">
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} 立即發貨
                                </Button>
                            </div>
                        ) : isCompleted ? (
                            <Button 
                                onClick={() => router.push(`/account/sales/${order.id}/review`)}
                                className="w-full h-14 bg-white/5 border border-primary/50 text-primary font-black uppercase tracking-widest rounded-2xl hover:bg-primary/10 transition-all group"
                            >
                                <Sparkles className="w-5 h-5 mr-2 animate-pulse" /> 給予買家評價
                            </Button>
                        ) : isShipped ? (
                            <Button disabled className="w-full h-14 bg-white/5 text-primary border border-white/5 font-black uppercase tracking-widest rounded-2xl">
                                等待買家確認收貨
                            </Button>
                        ) : (
                            <Button disabled className="w-full h-14 bg-white/5 text-white/20 font-black uppercase tracking-widest rounded-2xl">
                                待買家付款
                            </Button>
                        )}
                        <p className="text-[9px] font-mono text-white/30 text-center uppercase tracking-widest">
                            {isCompleted ? "Protocol Finalized" : "Escrow Active"}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Detail Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    {/* 商品快照 */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 flex flex-col sm:flex-row gap-8">
                        <div className="w-full sm:w-48 aspect-square relative rounded-2xl overflow-hidden border border-white/5 shrink-0">
                            {product?.images?.[0] && <Image src={product.images[0]} alt="Product" fill className="object-cover" />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-2">
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">{order.productName}</h3>
                                <p className="text-3xl font-black text-primary italic">{(order.totalAmount || 0).toLocaleString()} <span className="text-xs font-mono opacity-40">USDT</span></p>
                            </div>
                            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono">Sold to: {buyer?.displayName || 'Protocol User'}</p>
                        </div>
                    </div>

                    {/* 收貨人信息 */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 space-y-6 shadow-inner">
                        <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                            <MapPin className="w-4 h-4" /> Buyer Destination
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="text-sm text-white/80 leading-relaxed space-y-1 font-mono">
                                <p className="font-bold text-white text-base mb-2 font-sans">{order.shippingAddress?.recipientName} · {order.shippingAddress?.phone}</p>
                                <p className="opacity-60">{order.shippingAddress?.addressLine1}</p>
                                <p className="opacity-60">{order.shippingAddress?.city}, {order.shippingAddress?.country}</p>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Network Tracking</p>
                                {isShipped ? (
                                    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex justify-between items-center group">
                                        <p className="text-base font-mono text-white tracking-widest">{order.trackingNumber}</p>
                                        <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(order.trackingNumber || ''); toast({ description: "ID Copied" }); }} className="text-white/20 hover:text-primary">
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="h-20 flex items-center justify-center border border-dashed border-white/5 rounded-2xl text-white/10 text-[10px] uppercase font-mono">Awaiting Shipping Input</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 買家信息 */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-b from-[#130812] to-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-1000"><MessageSquare className="w-32 h-32 text-primary" /></div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-8">Asset Buyer</h4>
                        <div className="flex items-center gap-5 mb-8">
                            <Avatar className="w-16 h-16 border-2 border-primary/20">
                                <AvatarImage src={buyer?.photoURL} />
                                <AvatarFallback className="bg-primary/10 text-primary font-black">{(buyer?.displayName || 'B').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                                <h5 className="text-xl font-bold text-white truncate">{buyer?.displayName || 'Buyer'}</h5>
                                <p className="text-[10px] font-mono text-white/30 truncate">{buyer?.email || 'Encrypted ID'}</p>
                            </div>
                        </div>
                        <Button asChild className="w-full h-12 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 rounded-xl transition-all font-black uppercase text-xs tracking-widest">
                            <Link href={`/messages?to=${order.buyerId}`}>Secure Chat</Link>
                        </Button>
                    </div>

                    <div className="bg-black/60 border border-white/5 rounded-[2rem] p-6 font-mono text-[10px] text-white/30 space-y-4">
                        <div className="flex justify-between items-center text-white/50 font-bold uppercase pb-2 border-b border-white/5">
                            <span>Contract Monitor</span>
                            <ShieldCheck className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex justify-between"><span>Payment Method</span><span className="text-primary">USDT (Escrow)</span></div>
                        <div className="flex justify-between"><span>Settlement</span><span className={cn("px-2 py-0.5 rounded font-black", isCompleted ? "bg-green-500/10 text-green-400" : "bg-primary/10 text-primary")}>{isCompleted ? 'FINALIZED' : 'LOCKED'}</span></div>
                        <div className="pt-2 border-t border-white/5 flex justify-between">
                            <span>Order Timestamp</span>
                            <span>{order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy.MM.dd') : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}