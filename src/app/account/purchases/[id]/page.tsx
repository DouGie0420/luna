'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
    Package, Truck, CheckCircle2, ShieldCheck, 
    Copy, MapPin, MessageSquare, AlertOctagon, 
    ChevronLeft, ExternalLink, Timer, Loader2, Info, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Order, Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// ✅ Web3 依賴
import { ethers } from 'ethers';
import { escrowContractAddress, escrowContractABI } from '@/lib/web3/config';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';

export default function PurchaseOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 🚀 确保无论文件夹叫 [id] 还是 [orderId] 都能正常工作
    const orderId = (params.id || params.orderId) as string;

    const [mounted, setMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const orderRef = useMemo(() => (firestore && orderId) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);
    
    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);
    
    const sellerRef = useMemo(() => firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null, [firestore, order]);
    const { data: seller } = useDoc<UserProfile>(sellerRef);

    useEffect(() => { 
        if (mounted && !authLoading && !user) router.replace('/'); 
    }, [user, authLoading, router, mounted]);

    const handleConfirmReceipt = async () => {
        if (!firestore || !order || isProcessing) return;
        setIsProcessing(true);
        toast({ title: "Settlement Protocol", description: "正在發起鏈上資金釋放協議..." });

        try {
            if (!window.ethereum) throw new Error("未偵測到 Web3 錢包環境");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const escrowContract = new ethers.Contract(escrowContractAddress, escrowContractABI, signer);
            
            const numericId = order.numericOrderId || order.numericId;
            const confirmTx = await escrowContract.confirmReceipt(numericId);
            
            toast({ title: "Transaction Pending", description: "等待區塊鏈打包確認..." });
            await confirmTx.wait();

            await updateDoc(doc(firestore, 'orders', order.id), { 
                status: 'Completed', 
                completedAt: serverTimestamp() 
            });
            
            toast({ title: "Success", description: "交易已結算。正在進入評價協議..." });
            
            // ✅ 正确的跳转语法
            router.push(`/account/purchases/${orderId}/review`);

        } catch (e: any) { 
            console.error("結算失敗:", e);
            toast({ variant: 'destructive', title: '協議執行失敗', description: e.reason || e.message || "交易中斷" }); 
        } finally { setIsProcessing(false); }
    };

    const isLoading = !mounted || orderLoading || productLoading || authLoading;
    if (isLoading) return <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-primary"><Loader2 className="w-10 h-10 animate-spin" /><p className="font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Decrypting Escrow Data...</p></div>;
    if (!order || orderError || order.buyerId !== user?.uid) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><AlertOctagon className="w-16 h-16 text-red-500 opacity-30" /><p className="font-mono text-xs tracking-widest text-white/40 uppercase">Unauthorized Protocol Access</p><Button onClick={() => router.push('/account/purchases')} variant="ghost">Return to Index</Button></div>;

    const status = (order.status || 'pending').toLowerCase();
    const isPaid = status === 'paid' || status === 'shipped' || status === 'completed';
    const isShipped = status === 'shipped' || status === 'completed';
    const isCompleted = status === 'completed';

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-32 font-sans">
            <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-screen" />
            </div>
            <PageHeaderWithBackAndClose />
            <main className="container mx-auto max-w-6xl px-4 pt-36 relative z-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
                            <div className="w-3 h-10 bg-primary rounded-full shadow-[0_0_20px_rgba(211,58,137,0.6)]" />
                            Purchase Order
                        </h1>
                        <p className="text-[11px] font-mono text-white/30 tracking-[0.3em] uppercase mt-3 pl-7">Protocol_ID: {order.id}</p>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-lime-500/10 border border-lime-500/20 rounded-full text-lime-400 text-[10px] font-black font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(132,204,22,0.1)]">
                        <ShieldCheck className="w-4 h-4 animate-pulse" /> Escrow_Secured
                    </div>
                </div>

                <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-10">
                        <div className="flex-1 w-full relative px-6">
                            <div className="absolute top-5 left-10 right-10 h-1 bg-white/5 rounded-full" />
                            <div className={cn(
                                "absolute top-5 left-10 h-1 bg-gradient-to-r from-primary/50 to-primary rounded-full shadow-[0_0_15px_rgba(211,58,137,0.8)] transition-all duration-1000",
                                isCompleted ? "w-full" : isShipped ? "w-2/3" : isPaid ? "w-1/3" : "w-0"
                            )} />
                            <div className="relative flex justify-between">
                                {[
                                    { title: 'Ordered', icon: Package, done: true },
                                    { title: 'Escrowed', icon: ShieldCheck, done: isPaid },
                                    { title: 'Shipped', icon: Truck, done: isShipped },
                                    { title: 'Settled', icon: CheckCircle2, done: isCompleted }
                                ].map((step, idx) => (
                                    <div key={idx} className="flex flex-col items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                                            step.done ? "bg-primary border-primary text-black shadow-[0_0_20px_rgba(211,58,137,0.4)]" : "bg-[#0a0a0a] border-white/10 text-white/20"
                                        )}><step.icon className="w-5 h-5" /></div>
                                        <span className={cn("text-[9px] font-black tracking-[0.2em] uppercase", step.done ? "text-primary" : "text-white/20")}>{step.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0 xl:pl-10 border-t xl:border-t-0 xl:border-l border-white/5 pt-8 xl:pt-0">
                            {status === 'shipped' ? (
                                <Button onClick={handleConfirmReceipt} disabled={isProcessing} className="w-full h-16 bg-primary hover:bg-primary/80 text-black font-black uppercase tracking-widest rounded-3xl shadow-[0_0_30px_rgba(211,58,137,0.5)] transition-all hover:scale-[1.02] active:scale-95">
                                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirm_Receipt"}
                                </Button>
                            ) : isCompleted ? (
                                <Button onClick={() => router.push(`/account/purchases/${orderId}/review`)} className="w-full h-16 bg-white/5 border border-primary/30 text-primary font-black uppercase tracking-widest rounded-3xl hover:bg-primary/10 transition-all">
                                    <Sparkles className="w-5 h-5 mr-3" /> Leave_Verdict
                                </Button>
                            ) : (
                                <div className="w-full h-16 flex items-center justify-center bg-white/5 border border-white/5 text-white/20 font-black uppercase tracking-widest rounded-3xl">Awaiting_Dispatch</div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        <Card className="bg-white/[0.02] border border-white/10 rounded-[40px] p-8 flex flex-col md:flex-row gap-10 shadow-xl overflow-hidden group">
                            <Link href={`/products/${order.productId}`} className="w-full md:w-56 aspect-square relative rounded-[32px] overflow-hidden border border-white/5 shrink-0">
                                {product?.images?.[0] ? (
                                    <Image src={product.images[0]} alt="Asset" fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                                ) : (
                                    <div className="w-full h-full bg-black flex items-center justify-center text-white/10 font-mono text-xs uppercase">No_Asset_Preview</div>
                                )}
                            </Link>
                            <div className="flex-1 flex flex-col justify-between py-2">
                                <div>
                                    <h3 className="text-3xl font-black italic tracking-tight text-white mb-4 uppercase">{order.productName}</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-primary italic drop-shadow-[0_0_10px_rgba(211,58,137,0.3)]">{order.totalAmount.toLocaleString()}</span>
                                        <span className="text-xs font-mono text-white/40 uppercase tracking-widest">USDT / Asset_Value</span>
                                    </div>
                                </div>
                                <Button variant="outline" asChild className="w-fit mt-8 border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl px-6">
                                    <Link href={`/products/${order.productId}`}>ORIGINAL_NODE_PAGE</Link>
                                </Button>
                            </div>
                        </Card>

                        <Card className="bg-black/40 border border-white/5 rounded-[40px] p-8 space-y-8 shadow-inner">
                            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                                <Truck className="w-4 h-4" /> Logistics_Transmission_Data
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-5">
                                    <p className="text-[9px] text-white/20 uppercase font-mono tracking-widest border-b border-white/5 pb-2">Shipping_Endpoint</p>
                                    <div className="flex gap-5">
                                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20"><MapPin className="w-5 h-5 text-primary" /></div>
                                        <div className="text-sm text-white/70 leading-relaxed font-medium">
                                            <p className="font-black text-white uppercase tracking-tight text-base mb-1">{order.shippingAddress?.recipientName}</p>
                                            <p className="opacity-60">{order.shippingAddress?.phone}</p>
                                            <p className="mt-2 opacity-60 italic">{order.shippingAddress?.addressLine1}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <p className="text-[9px] text-white/20 uppercase font-mono tracking-widest border-b border-white/5 pb-2">Real_Time_Tracking</p>
                                    {isShipped ? (
                                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex justify-between items-center group/track">
                                            <div>
                                                <p className="text-[9px] font-mono text-white/30 uppercase mb-2 tracking-widest">{order.shippingProvider || 'Universal_Carrier'}</p>
                                                <p className="text-lg font-mono text-white tracking-widest font-bold group-hover/track:text-primary transition-colors">{order.trackingNumber}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(order.trackingNumber || ''); toast({ title: "COPIED" }); }} className="text-white/20 hover:text-primary rounded-full"><Copy className="w-4 h-4" /></Button>
                                        </div>
                                    ) : (
                                        <div className="h-28 flex items-center justify-center border border-dashed border-white/5 rounded-[32px] text-white/10 font-mono text-[10px] uppercase tracking-[0.3em] bg-white/[0.01]">Awaiting_Data_Packet</div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-8">
                        <Card className="bg-gradient-to-b from-[#0a0a0a] to-[#020202] border border-white/10 rounded-[40px] p-8 shadow-2xl relative group">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 mb-8 border-b border-white/5 pb-4">Merchant_Profile</h4>
                            <div className="flex items-center gap-5 mb-10">
                                <Avatar className="w-16 h-16 border-2 border-white/10"><AvatarImage src={seller?.photoURL} /><AvatarFallback className="bg-primary/10 text-primary font-black">S</AvatarFallback></Avatar>
                                <div className="overflow-hidden">
                                    <h5 className="text-xl font-black text-white truncate uppercase italic tracking-tighter">{seller?.displayName || 'Auth_Seller'}</h5>
                                    <p className="text-[9px] font-mono text-white/20 mt-1 truncate uppercase tracking-widest">{seller?.loginId ? `@NODE_${seller.loginId}` : 'ENCRYPTED_ID'}</p>
                                </div>
                            </div>
                            <Button asChild className="w-full h-14 bg-white/5 hover:bg-primary text-white hover:text-black border border-white/10 rounded-2xl transition-all font-black uppercase text-xs tracking-[0.2em]">
                                <Link href={`/messages?to=${order.sellerId}`}><MessageSquare className="w-4 h-4 mr-2" /> Start_Transmission</Link>
                            </Button>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}