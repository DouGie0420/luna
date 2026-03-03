'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
    Package, Truck, CheckCircle2, ShieldCheck,
    Copy, MapPin, MessageSquare, AlertOctagon,
    ChevronLeft, ExternalLink, Timer, Loader2, Info, Send, Sparkles, Handshake
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

// Web3 imports
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import dynamic from 'next/dynamic';

// Lazy load chat component
const ChatWindow = dynamic(() => import('@/components/chat/ChatWindow'), {
  ssr: false,
  loading: () => (
    <Card className="mt-8 bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-6 shadow-2xl">
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-white/60 text-sm">加载聊天组件...</p>
      </div>
    </Card>
  ),
});

const REQUIRED_CHAIN_ID = 8453;

interface ClientPurchaseDetailProps {
  id: string;
}

export default function ClientPurchaseDetail({ id }: ClientPurchaseDetailProps) {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const orderId = id;

    const [mounted, setMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Web3 Hooks
    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
    const { isInteracting: isEscrowInteracting, interactionError: escrowInteractionError, confirmDelivery } = useEscrowContract();

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

    // Handle network mismatch
    useEffect(() => {
        if (isConnected && chainId !== REQUIRED_CHAIN_ID && mounted) {
            toast({
                variant: "destructive",
                title: "CHAIN_MISMATCH",
                description: `请切换到 Base 主网 (Chain ID: ${REQUIRED_CHAIN_ID}) 以执行交易。`,
                action: (
                    <Button
                        onClick={() => connectToChain(REQUIRED_CHAIN_ID, toast)}
                        className="bg-primary hover:bg-primary-dark text-white"
                    >
                        切换网络
                    </Button>
                )
            });
        }
    }, [isConnected, chainId, toast, mounted]);


    const handleConfirmReceipt = async () => {
        if (!firestore || !user || !order || isProcessing) return;

        if (!isConnected || !address) {
            toast({ variant: "destructive", title: "钱包未连接", description: "请先连接您的 Web3 钱包。" });
            return;
        }

        if (chainId !== REQUIRED_CHAIN_ID) {
            toast({ variant: "destructive", title: "网络错误", description: `请切换到 Base 主网 (Chain ID: ${REQUIRED_CHAIN_ID})。` });
            await connectToChain(REQUIRED_CHAIN_ID, toast);
            return;
        }

        if (!order.escrowOrderId) {
            toast({ variant: "destructive", title: "订单协议ID缺失", description: "无法执行链上操作，订单缺乏合约ID。" });
            return;
        }

        setIsProcessing(true);
        toast({ title: "结算协议执行中", description: "正在发起链上确认收货交易..." });

        try {
            const confirmTxHash = await confirmDelivery(order.escrowOrderId);

            if (!confirmTxHash) {
                throw new Error(escrowInteractionError || "链上确认收货失败，请检查 Gas 或余额。");
            }

            await updateDoc(doc(firestore, 'orders', order.id), {
                status: 'Completed',
                completedAt: serverTimestamp(),
                confirmDeliveryTxHash: confirmTxHash,
            });

            toast({ title: "成功", description: "交易已结算。正在进入评价协议..." });

            router.push(`/account/purchases/${orderId}/review`);

        } catch (e: any) {
            console.error("结算失败:", e);
            toast({ variant: 'destructive', title: '协议执行失败', description: e.message || "交易中断" });
        } finally { setIsProcessing(false); }
    };

    const isLoading = !mounted || orderLoading || productLoading || authLoading || isEscrowInteracting;
    if (isLoading) return <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-primary"><Loader2 className="w-10 h-10 animate-spin" /><p className="font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Decrypting Escrow Data...</p></div>;
    if (!order || orderError || order.buyerId !== user?.uid) return <div className="h-[80vh] flex flex-col items-center justify-center gap-6"><AlertOctagon className="w-16 h-16 text-red-500 opacity-30" /><p className="font-mono text-xs tracking-widest text-white/40 uppercase">Unauthorized Protocol Access</p><Button onClick={() => router.push('/account/purchases')} variant="ghost">Return to Index</Button></div>;

    const status = (order.status || 'pending').toLowerCase();
    const isPaid = status === 'paid' || status === 'shipped' || status === 'completed' || status === 'disputed';
    const isShipped = status === 'shipped' || status === 'completed' || status === 'disputed';
    const isCompleted = status === 'completed';
    const isDisputed = status === 'disputed';

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
                                    { step: 1, label: 'Secured', active: isPaid, icon: ShieldCheck },
                                    { step: 2, label: 'Shipped', active: isShipped, icon: Truck },
                                    { step: 3, label: 'Completed', active: isCompleted, icon: CheckCircle2 }
                                ].map((s) => (
                                    <div key={s.step} className="flex flex-col items-center gap-4 relative z-10 w-24">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                                            s.active ? "bg-primary border-primary text-white shadow-[0_0_20px_rgba(211,58,137,0.4)] scale-110" : "bg-[#0A0A0A] border-white/10 text-white/30"
                                        )}>
                                            <s.icon className={cn("w-5 h-5", s.active && "animate-pulse")} />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black tracking-widest uppercase",
                                            s.active ? "text-primary drop-shadow-[0_0_8px_rgba(211,58,137,0.5)]" : "text-white/30"
                                        )}>{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="w-full xl:w-1/3 flex flex-col gap-4">
                            {isShipped && !isCompleted && !isDisputed ? (
                                <Button
                                    onClick={handleConfirmReceipt}
                                    disabled={isProcessing}
                                    className="w-full py-8 bg-primary hover:bg-primary/80 text-white rounded-3xl font-black text-lg tracking-widest uppercase shadow-[0_10px_40px_-10px_rgba(211,58,137,0.5)] transition-all hover:scale-[1.02] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <Handshake className="w-6 h-6 mr-3" />}
                                    {isProcessing ? 'Executing...' : 'Confirm Receipt'}
                                </Button>
                            ) : (
                                <div className="text-center p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                                    <p className="text-[10px] font-mono text-white/50 tracking-[0.2em] uppercase mb-2">Protocol_Status</p>
                                    <p className="text-sm font-bold text-white uppercase tracking-wider">
                                        {isCompleted ? 'Transaction Finalized' : isDisputed ? 'In Dispute Resolution' : 'Awaiting Seller Action'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Chat component */}
                <Card className="mt-8 bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-6 shadow-2xl">
                  <ChatWindow
                    orderId={order.id}
                    sellerId={order.sellerId}
                    buyerId={order.buyerId}
                    productName={product?.name}
                  />
                </Card>

            </main>
        </div>
    );
}
