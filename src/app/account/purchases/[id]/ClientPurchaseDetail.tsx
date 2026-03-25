'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
    Package, Truck, CheckCircle2, ShieldCheck,
    Copy, MapPin, MessageSquare, AlertOctagon,
    ChevronLeft, ExternalLink, Timer, Loader2, Info, Send, Sparkles, Handshake,
    Wallet, CreditCard, Globe, Cpu, Hash, Activity, CreditCard as PayIcon,
    XCircle, AlertTriangle
} from 'lucide-react';
import {
    Dialog as CancelDialog,
    DialogContent as CancelDialogContent,
    DialogHeader as CancelDialogHeader,
    DialogTitle as CancelDialogTitle,
    DialogDescription as CancelDialogDescription,
    DialogFooter as CancelDialogFooter,
} from '@/components/ui/dialog';
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
import { Card, CardContent } from '@/components/ui/card';
import { MapComponent } from '@/components/map';
import { APIProvider } from '@vis.gl/react-google-maps';
import dynamic from 'next/dynamic';

// ✅ 绝杀修复 1：针对你源码中的 export function ChatWindow 的绝对正确加载方式！
const ChatWindow = dynamic(
    () => import('@/components/chat/ChatWindow').then((mod) => mod.ChatWindow),
    {
        ssr: false,
        loading: () => (
            <Card className="mt-8 bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-6 shadow-2xl">
                <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-white/60 text-sm font-mono tracking-widest uppercase animate-pulse">
                        Establishing Secure Link...
                    </p>
                </div>
            </Card>
        ),
    }
);

// ✅ 设置为 Base Sepolia 测试网 ID (84532)
const REQUIRED_CHAIN_ID = 84532; 

interface ClientPurchaseDetailProps {
    id: string;
}

export default function ClientPurchaseDetail({ id }: ClientPurchaseDetailProps) {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 🌟 这是绝对可靠的订单 ID（来自页面 URL 路由）
    const orderId = id;
    
    const [mounted, setMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Web3 Hooks
    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
    const { isInteracting: isEscrowInteracting, interactionError: escrowInteractionError, confirmDelivery } = useEscrowContract();

    useEffect(() => { 
        setMounted(true); 
    }, []);

    const orderRef = useMemo(() => (firestore && orderId) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);

    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const sellerRef = useMemo(() => firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null, [firestore, order]);
    const { data: seller } = useDoc<UserProfile>(sellerRef);

    useEffect(() => {
        if (mounted && !authLoading && !user) {
            router.replace('/');
        }
    }, [user, authLoading, router, mounted]);

    // 🚀 高精度 ETH 格式化
    const formatPrice = (price: any) => {
        return Number(price || 0).toLocaleString('en-US', { 
            maximumFractionDigits: 6 
        });
    };

    // 🚀 防死循环网络检测逻辑
    const hasPromptedNetwork = useRef(false);
    useEffect(() => {
        if (!mounted || !isConnected || chainId == null) return;

        let currentId: number;
        if (typeof chainId === 'bigint') {
            currentId = Number(chainId);
        } else if (typeof chainId === 'string') {
            currentId = chainId.startsWith('0x') ? parseInt(chainId, 16) : parseInt(chainId, 10);
        } else {
            currentId = Number(chainId);
        }

        if (currentId !== REQUIRED_CHAIN_ID) {
            if (!hasPromptedNetwork.current) {
                hasPromptedNetwork.current = true;
                toast({
                    variant: "destructive",
                    title: "NETWORK_MISMATCH",
                    description: `检测到环境异常。请切换到 Base Sepolia (ID: ${REQUIRED_CHAIN_ID})。`,
                    action: (
                        <Button
                            onClick={async () => {
                                await connectToChain(REQUIRED_CHAIN_ID, toast);
                                hasPromptedNetwork.current = false;
                            }}
                            className="bg-primary hover:bg-primary-dark text-white font-black italic text-[10px] px-6 py-2 rounded-full shadow-[0_0_15px_rgba(211,58,137,0.4)]"
                        >
                            切换到测试网
                        </Button>
                    ),
                    duration: 8000,
                });
            }
        } else {
            hasPromptedNetwork.current = false;
        }
    }, [isConnected, chainId, mounted, toast]);

    const handleConfirmReceipt = async () => {
        if (!firestore || !user || !order || isProcessing) return;

        if (!isConnected || !address) {
            toast({ variant: "destructive", title: "钱包未连接", description: "请先连接您的 Web3 钱包。" });
            return;
        }

        const currentChainId = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
        if (currentChainId !== REQUIRED_CHAIN_ID) {
            toast({ variant: "destructive", title: "网络错误", description: `请切换到 Base 测试网。` });
            await connectToChain(REQUIRED_CHAIN_ID, toast);
            return;
        }

        // fallback to order.id for orders paid via /checkout/[id] (which locks with order.id)
        const escrowId = order.escrowOrderId || orderId;
        if (!escrowId) {
            toast({ variant: "destructive", title: "订单协议ID缺失", description: "无法执行链上操作，订单缺乏合约ID。" });
            return;
        }

        setIsProcessing(true);
        toast({ title: "结算协议执行中", description: "正在发起链上确认收货交易..." });

        try {
            const result = await confirmDelivery(escrowId);

            if (!result.success) {
                throw new Error(result.error || escrowInteractionError || "链上确认收货失败，请检查 Gas 或余额。");
            }

            await updateDoc(doc(firestore, 'orders', orderId), {
                status: 'completed',
                completedAt: serverTimestamp(),
                confirmDeliveryTxHash: result.hash || '',
            });

            // 确保商品已下架（补救所有未在付款时下架的情况）
            if (order.productId) {
                await updateDoc(doc(firestore, 'products', order.productId), { status: 'sold' });
            }

            toast({ title: "成功", description: "交易已结算。正在进入评价协议..." });
            router.push(`/account/purchases/${orderId}/review`);

        } catch (e: any) {
            console.error("结算失败:", e);
            toast({ variant: 'destructive', title: '协议执行失败', description: e.message || "交易中断" });
        } finally { setIsProcessing(false); }
    };

    const handleRequestCancellation = async () => {
        if (!firestore || !user || !order || isCancelling) return;
        if (!cancelReason.trim()) {
            toast({ variant: 'destructive', title: 'Please enter a reason', description: 'A cancellation reason is required.' });
            return;
        }
        setIsCancelling(true);
        try {
            const isPaid = ['paid', 'shipped', 'completed', 'disputed', 'confirmed'].includes((order.status || '').toLowerCase());
            const updateData: Record<string, any> = {
                cancellationRequested: true,
                cancellationReason: cancelReason.trim(),
                cancellationRequestedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            if (!isPaid) {
                // Unpaid — cancel immediately
                updateData.status = 'cancelled';
                updateData.cancellationRequested = false;
            } else {
                // Paid — escalate to dispute for admin/seller review
                updateData.status = 'disputed';
            }
            await updateDoc(doc(firestore, 'orders', orderId), updateData);
            toast({
                title: isPaid ? 'Cancellation Request Submitted' : 'Order Cancelled',
                description: isPaid
                    ? 'Your request has been sent to the seller. The admin will review and process your refund.'
                    : 'Your order has been cancelled successfully.',
            });
            setIsCancelDialogOpen(false);
            setCancelReason('');
            if (!isPaid) router.push('/account/purchases');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Failed', description: e.message || 'Could not submit cancellation.' });
        } finally {
            setIsCancelling(false);
        }
    };

    const isLoading = !mounted || orderLoading || productLoading || authLoading || isEscrowInteracting;
    
    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Decrypting Escrow Data...</p>
            </div>
        );
    }
    
    if (!order || orderError || (user && order.buyerId !== user.uid)) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-6">
                <AlertOctagon className="w-16 h-16 text-red-500 opacity-30" />
                <p className="font-mono text-xs tracking-widest text-white/40 uppercase">Unauthorized Protocol Access</p>
                <Button onClick={() => router.push('/account/purchases')} variant="ghost">Return to Index</Button>
            </div>
        );
    }

    const status = (order.status || 'pending').toLowerCase();
    const isPendingPayment = status === 'pending_payment';
    const isPaid = ['paid', 'shipped', 'completed', 'disputed'].includes(status);
    const isShipped = ['shipped', 'completed', 'disputed'].includes(status);
    const isCompleted = status === 'completed';
    const isDisputed = status === 'disputed';

    const canCancel = !['completed', 'cancelled', 'refunded'].includes(status) && !order.cancellationRequested;

    return (
        <>
        {/* Cancel Order Dialog */}
        <CancelDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
            <CancelDialogContent>
                <CancelDialogHeader>
                    <CancelDialogTitle>Cancel Booking / Order</CancelDialogTitle>
                    <CancelDialogDescription>
                        {['paid', 'shipped', 'confirmed', 'disputed'].includes(status)
                            ? 'Since payment has been made, your cancellation request will be reviewed. The refund will be processed via the escrow smart contract after admin approval.'
                            : 'Your unpaid order will be cancelled immediately.'}
                    </CancelDialogDescription>
                </CancelDialogHeader>
                <div className="space-y-3 py-2">
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-white/70">
                            <p className="font-bold text-orange-300 mb-1">Order: {orderId.slice(0, 12)}...</p>
                            <p>{order.productName}</p>
                            <p className="font-mono text-xs mt-1 text-white/40">{order.totalAmount ?? order.price} {order.currency || 'ETH'}</p>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">Cancellation Reason *</label>
                        <textarea
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="Please describe why you need to cancel (e.g. travel plans changed, conflict with dates, etc.)"
                            className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/60 transition-all resize-none"
                            rows={3}
                            maxLength={500}
                        />
                        <p className="text-xs text-white/25 text-right font-mono mt-1">{cancelReason.length}/500</p>
                    </div>
                </div>
                <CancelDialogFooter>
                    <button onClick={() => setIsCancelDialogOpen(false)} className="h-10 px-5 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all">
                        Keep Order
                    </button>
                    <button
                        onClick={handleRequestCancellation}
                        disabled={isCancelling || !cancelReason.trim()}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-red-600/80 border border-red-500/30 text-white text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                    >
                        {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Confirm Cancellation
                    </button>
                </CancelDialogFooter>
            </CancelDialogContent>
        </CancelDialog>

        <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-32 font-sans selection:bg-primary/30">
            {/* 🌊 复杂的背景氛围层 */}
            <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-overlay" />
            </div>

            <div className="fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
                <PageHeaderWithBackAndClose />
            </div>

            <main className="container mx-auto max-w-6xl px-4 pt-36 relative z-10 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                
                {/* 状态标头区块 */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-3 h-12 bg-primary rounded-full shadow-[0_0_25px_rgba(211,58,137,0.7)] animate-pulse" />
                            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase leading-none">
                                Purchase Protocol
                            </h1>
                        </div>
                        <p className="text-[11px] font-mono text-white/30 tracking-[0.4em] uppercase mt-3 pl-8">
                            ORD_NODE_SYNC: {orderId}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 px-6 py-3 bg-lime-500/10 border border-lime-500/20 rounded-full text-lime-400 text-[11px] font-black font-mono tracking-widest uppercase shadow-[0_0_20px_rgba(132,204,22,0.15)] backdrop-blur-sm">
                        <ShieldCheck className="w-5 h-5 animate-pulse" /> Escrow_Secured_V3.5
                    </div>
                </div>

                {/* ✅ 进度显示看板 */}
                <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[48px] p-10 md:p-14 shadow-2xl relative overflow-hidden group border-t-white/10">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000" />
                    
                    <div className="relative z-10 flex flex-col xl:flex-row items-center justify-between gap-12">
                        
                        <div className="flex-1 w-full relative px-8">
                            {/* 轨道背景 */}
                            <div className="absolute top-6 left-12 right-12 h-1.5 bg-white/5 rounded-full" />
                            {/* 活动轨道 */}
                            <div className={cn(
                                "absolute top-6 left-12 h-1.5 bg-gradient-to-r from-primary/60 via-primary to-[#FF69B4] rounded-full shadow-[0_0_20px_rgba(211,58,137,0.8)] transition-all duration-[1500ms] ease-out",
                                isCompleted ? "w-[calc(100%-96px)]" : isShipped ? "w-[66%]" : isPaid ? "w-[33%]" : "w-0"
                            )} />
                            
                            {/* 节点渲染 */}
                            <div className="relative flex justify-between">
                                {[
                                    { step: 1, label: 'Secured', active: isPaid, icon: ShieldCheck },
                                    { step: 2, label: 'Shipped', active: isShipped, icon: Truck },
                                    { step: 3, label: 'Completed', active: isCompleted, icon: CheckCircle2 }
                                ].map((s) => (
                                    <div key={s.step} className="flex flex-col items-center gap-6 relative z-10 w-28 group/step">
                                        <div className={cn(
                                            "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700",
                                            s.active ? "bg-primary border-primary text-white scale-110 shadow-[0_0_30px_rgba(211,58,137,0.5)]" : "bg-[#0A0A0A] border-white/10 text-white/20 group-hover/step:border-white/30"
                                        )}>
                                            <s.icon className={cn("w-6 h-6", s.active && "animate-pulse")} />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black tracking-[0.2em] uppercase transition-all",
                                            s.active ? "text-primary drop-shadow-[0_0_10px_rgba(211,58,137,0.6)]" : "text-white/30"
                                        )}>
                                            {s.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 动态按钮/操作区 */}
                        <div className="w-full xl:w-1/3 flex flex-col gap-5">
                            {/* 🚀 绝杀修复 2：使用绝对可靠的 orderId 进行路由跳转！ */}
                            {isPendingPayment ? (
                                <Button
                                    onClick={() => router.push(`/checkout/${orderId}`)}
                                    className="relative w-full h-[90px] bg-black/40 border border-primary/40 hover:border-primary text-white rounded-[2rem] font-black text-lg tracking-[0.2em] uppercase overflow-hidden group/pay transition-all duration-500 hover:shadow-[0_0_40px_rgba(211,58,137,0.3)] hover:-translate-y-1"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 opacity-0 group-hover/pay:opacity-100 transition-opacity duration-500" />
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent translate-x-[-100%] group-hover/pay:animate-[shimmer_2s_infinite]" />
                                    <div className="relative z-10 flex items-center justify-center gap-5">
                                        <div className="p-3 bg-primary/20 rounded-full group-hover/pay:scale-110 transition-transform duration-500">
                                            <PayIcon className="w-6 h-6 text-primary drop-shadow-[0_0_10px_rgba(211,58,137,0.8)]" />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-white tracking-[0.3em] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">COMPLETE PAYMENT</span>
                                            <span className="text-[9px] font-mono text-primary/70 tracking-widest normal-case italic mt-1">Jump to Checkout Protocol</span>
                                        </div>
                                    </div>
                                </Button>
                            ) : isShipped && !isCompleted ? (
                                <Button
                                    onClick={handleConfirmReceipt}
                                    disabled={isProcessing}
                                    className="w-full py-10 bg-primary hover:bg-primary/80 text-white rounded-[2rem] font-black text-xl tracking-[0.2em] uppercase shadow-[0_15px_50px_-10px_rgba(211,58,137,0.6)] transition-all"
                                >
                                    <Handshake className="w-7 h-7 mr-3" /> 
                                    {isProcessing ? 'Executing...' : 'Finalize Receipt'}
                                </Button>
                            ) : (
                                <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md shadow-inner group-hover:border-white/20 transition-all">
                                    <div className="flex items-center justify-center gap-3 mb-2 opacity-50">
                                        <Activity className="w-3 h-3 text-primary animate-pulse" />
                                        <p className="text-[10px] font-mono text-white tracking-[0.3em] uppercase">Node_Status</p>
                                    </div>
                                    <p className="text-lg font-black text-white uppercase tracking-wider italic">
                                        {isCompleted ? 'Transaction Finalized' : isDisputed ? 'In Resolution' : (isPaid ? 'Package In Transit' : 'Awaiting Settlement')}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* 核心详情网格区 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                    <div className="lg:col-span-2 space-y-12">
                        
                        {/* 商品详细展示 */}
                        <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[48px] overflow-hidden shadow-2xl relative group border-b-primary/10">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                            <CardContent className="p-12">
                                <div className="flex flex-col md:flex-row gap-12">
                                    <div className="w-full md:w-64 h-64 rounded-[40px] overflow-hidden border border-white/10 flex-shrink-0 relative shadow-2xl group-hover:border-primary/30 transition-all duration-700">
                                        <Image 
                                            src={order.productImage || '/placeholder.jpg'} 
                                            alt="Artifact" 
                                            fill 
                                            className="object-cover group-hover:scale-110 transition-transform duration-[2000ms]" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    </div>
                                    <div className="flex-1 space-y-8 flex flex-col justify-center">
                                        <div className="space-y-4">
                                            <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-[1.1]">
                                                {order.productName}
                                            </h2>
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary font-mono text-[9px] font-black tracking-widest uppercase">
                                                    Artifact ID
                                                </span>
                                                <p className="text-white/40 font-mono text-xs tracking-[0.2em]">{order.productId}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 pt-10 border-t border-white/5">
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-mono font-black">
                                                    Execution_Price
                                                </p>
                                                <p className="text-5xl font-black text-white italic drop-shadow-[0_0_25px_rgba(211,58,137,0.4)]">
                                                    {formatPrice(order.price)} 
                                                    <span className="text-xs text-primary font-mono ml-1 uppercase">{order.currency || 'ETH'}</span>
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-mono font-black">
                                                    Settlement_Node
                                                </p>
                                                <div className="flex items-center gap-4 text-white/70 font-black text-[11px] uppercase tracking-widest">
                                                    <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(211,58,137,0.1)]">
                                                        <Wallet className="w-5 h-5 text-primary" />
                                                    </div> 
                                                    {order.paymentMethod?.toUpperCase().replace('BASE ETH', 'ETH').replace('BASE_ETH_L2', 'ETH') || 'ETH'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 🚀 链上交易清单 (Transaction Manifest) */}
                        {isPaid && (
                            <Card className="bg-[#080808]/95 backdrop-blur-3xl border border-primary/20 rounded-[48px] p-12 shadow-3xl space-y-10 relative overflow-hidden group animate-in zoom-in-95 duration-700">
                                <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
                                
                                <div className="flex items-center gap-5 border-l-4 border-primary pl-8">
                                    <Globe className="w-7 h-7 text-primary animate-spin-slow" />
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-black italic text-white uppercase tracking-[0.3em]">
                                            Transaction Manifest
                                        </h3>
                                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.4em] leading-none italic">
                                            Gateway: Base_Sepolia_L2_Protocol_Active
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 font-mono text-[10px] uppercase tracking-[0.4em] relative z-10">
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                            <span className="text-white/30 flex items-center gap-3 font-bold">
                                                <Timer className="w-4 h-4" /> Block_Time
                                            </span>
                                            <span className="text-white/90 font-black italic text-right">
                                                {order.paidAt?.toDate ? format(order.paidAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'SYNCING_LEDGER...'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                            <span className="text-white/30 flex items-center gap-3 font-bold">
                                                <ShieldCheck className="w-4 h-4" /> Finality
                                            </span>
                                            <span className="text-lime-400 font-black tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                                                Immutable_L2_Lock
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                            <span className="text-white/30 flex items-center gap-3 font-bold">
                                                <Cpu className="w-4 h-4" /> Protocol_Fee
                                            </span>
                                            <span className="text-white/60 font-black italic">
                                                {order.gasUsed ? (parseInt(order.gasUsed) * 0.000000001).toFixed(6) : '0.000185'} ETH
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <span className="text-white/30 block font-bold tracking-[0.6em] pl-1">
                                                Protocol_Hash
                                            </span>
                                            <div className="flex items-center gap-4 bg-white/5 p-5 rounded-[2rem] border border-white/10 group/hash transition-all hover:bg-white/[0.08] hover:border-primary/30">
                                                <span className="text-blue-400 font-black truncate flex-1 tracking-tighter text-xs">
                                                    {order.txHash || '0x4f8e...a2c1_PENDING'}
                                                </span>
                                                {order.txHash && (
                                                    <a 
                                                        href={`https://sepolia.basescan.org/tx/${order.txHash}`} 
                                                        target="_blank" 
                                                        className="p-3 bg-white/5 rounded-xl hover:text-primary hover:bg-primary/10 transition-all"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-5 bg-primary/5 border border-primary/10 rounded-[2rem] flex items-center gap-5 shadow-inner">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                                <Timer className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-white/40 uppercase font-black tracking-[0.2em] mb-1 leading-none">
                                                    Resource_Lock_Expires_In
                                                </p>
                                                <p className="text-sm font-black text-primary italic tracking-widest">
                                                    21:45 MIN_REMAINING
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* ✅ 聊天窗口板块 */}
                        <Card className="bg-[#080808]/90 backdrop-blur-3xl border-white/5 rounded-[48px] p-12 shadow-3xl min-h-[550px] overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="flex items-center gap-5 mb-10 pl-8 border-l-4 border-primary">
                                    <MessageSquare className="w-7 h-7 text-primary" />
                                    <h3 className="text-xl font-black italic text-white uppercase tracking-[0.3em]">
                                        Secure Provider Channel
                                    </h3>
                                </div>
                                <ChatWindow
                                    orderId={orderId}
                                    sellerId={order?.sellerId || ''}
                                    buyerId={order?.buyerId || ''}
                                    productName={product?.name || order?.productName}
                                />
                            </div>
                        </Card>
                    </div>

                    {/* 右侧导航与边栏区 */}
                    <div className="space-y-12">

                        {/* ✅ 结算完成凭证 */}
                        {isCompleted && (
                            <Card className="bg-[#080808]/80 backdrop-blur-3xl border-green-500/20 rounded-[48px] overflow-hidden shadow-2xl">
                                <div className="p-8 border-b border-green-500/10 flex items-center justify-between bg-green-500/[0.03]">
                                    <h3 className="text-xs font-black italic text-green-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5" /> Settlement Complete
                                    </h3>
                                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                                </div>
                                <div className="p-8 space-y-5">
                                    {[
                                        { label: 'Payment TX', value: order.txHash },
                                        { label: 'Confirm TX', value: (order as any).confirmDeliveryTxHash },
                                    ].map(({ label, value }) => value ? (
                                        <div key={label}>
                                            <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-black mb-1">{label}</p>
                                            <a
                                                href={`https://sepolia.basescan.org/tx/${value}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                                            >
                                                {value.slice(0, 10)}...{value.slice(-6)}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    ) : null)}
                                    {(order as any).completedAt && (
                                        <div className="pt-4 border-t border-white/5">
                                            <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-black mb-1">Settled At</p>
                                            <p className="text-sm font-black text-green-400">
                                                {(order as any).completedAt?.toDate ? format((order as any).completedAt.toDate(), 'yyyy/MM/dd HH:mm') : '—'}
                                            </p>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-black">Your Review</p>
                                        {(order as any).review ? (
                                            <div className="flex items-center gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <span key={i} className={`text-sm ${i < ((order as any).review?.rating || 0) ? 'text-yellow-400' : 'text-white/15'}`}>★</span>
                                                ))}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => router.push(`/account/purchases/${orderId}/review`)}
                                                className="text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg hover:border-purple-400/50 transition-all"
                                            >
                                                去评价 →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* 地理位置节点 */}
                        {order.shippingAddress && (
                            <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[48px] overflow-hidden shadow-2xl group transition-all hover:border-cyan-500/30 border-t-white/5">
                                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                    <h3 className="text-xs font-black italic text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                        <MapPin className="w-5 h-5 animate-bounce" /> Destination Node
                                    </h3>
                                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                                </div>
                                <div className="h-[280px] relative">
                                    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                                        <MapComponent center={{ lat: 13.7563, lng: 100.5018 }} zoom={14} readOnly />
                                    </APIProvider>
                                    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(0,0,0,1)]" />
                                </div>
                                <div className="p-10 space-y-8 bg-white/[0.01]">
                                    <div className="space-y-2">
                                        <p className="text-[11px] text-white/30 uppercase tracking-[0.5em] font-mono font-black">Authorized_Recipient</p>
                                        <p className="text-xl font-black italic text-white">
                                            { (order.shippingAddress as any).recipientName }
                                        </p>
                                    </div>
                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                        <p className="text-[11px] text-white/30 uppercase tracking-[0.5em] font-mono font-black">Geographic_Index</p>
                                        <p className="text-xs leading-relaxed text-white/60 font-medium italic tracking-wide">
                                            { (order.shippingAddress as any).addressLine1 }, { (order.shippingAddress as any).city }
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        
                        {/* 资金托管说明 */}
                        <div className="p-10 bg-green-500/5 border border-green-500/10 rounded-[40px] space-y-6 shadow-[0_0_40px_rgba(34,197,94,0.06)] relative overflow-hidden group/escrow">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[60px] rounded-full pointer-events-none" />
                            <div className="flex items-center gap-4 text-green-400 relative z-10">
                                <ShieldCheck className="w-6 h-6 group-hover/escrow:rotate-12 transition-transform" />
                                <span className="font-black text-[11px] uppercase tracking-[0.4em]">Asset_Escrow_Node_Active</span>
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed font-mono font-bold uppercase italic relative z-10">
                                Artifact assets remain securely locked within the decentralized Base protocol. Release sequence initiates only upon verified receipt by the destination node.
                            </p>
                        </div>
                        
                        {/* 纠纷支持 / 取消订单 */}
                        <div className="p-8 border border-white/5 rounded-[40px] bg-white/[0.01] flex flex-col gap-4">
                            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest text-center">Protocol_Support_Channel</p>
                            <Button variant="outline" className="border-white/10 text-white/40 hover:text-white hover:border-white/30 rounded-2xl font-black text-[10px] uppercase tracking-widest h-12">
                                <Hash className="w-3 h-3 mr-2" /> Dispute_Resolution
                            </Button>
                            {/* Cancel Order Button */}
                            {canCancel && (
                                <button
                                    onClick={() => setIsCancelDialogOpen(true)}
                                    className="flex items-center justify-center gap-2 h-12 rounded-2xl border border-red-500/25 bg-red-500/8 text-red-400 hover:bg-red-500/15 hover:border-red-500/40 transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    <XCircle className="w-4 h-4" /> Cancel_Booking
                                </button>
                            )}
                            {order.cancellationRequested && (
                                <div className="flex items-center gap-2 p-3 rounded-2xl border border-orange-500/25 bg-orange-500/8 text-orange-400 text-[10px] font-bold uppercase tracking-widest">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    Cancellation_Pending_Review
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* 🌊 全局样式注入 */}
            <style jsx global>{`
                @keyframes shimmer { 100% { transform: translate(100%); } }
                .animate-spin-slow { animation: spin 15s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(211,58,137,0.2); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(211,58,137,0.4); }
            `}</style>
        </div>
        </>
    );
}