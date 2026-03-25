'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
    Package, Truck, CheckCircle2, ShieldCheck,
    MapPin, MessageSquare, AlertOctagon,
    ChevronLeft, Timer, Loader2, Wallet, Phone, User, Send, Copy, Check,
    AlertTriangle, XCircle, CheckCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Order, Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEthPrice } from '@/hooks/useEthPrice';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { connectToChain } from '@/lib/web3-provider';

const REQUIRED_CHAIN_ID = 84532;

const ChatWindow = dynamic(
  () => import('@/components/chat/ChatWindow').then((mod) => mod.ChatWindow),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-white/[0.03] border border-white/8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    ),
  }
);

function GlassCard({ children, className, accentColor = 'purple', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  accentColor?: 'purple' | 'blue' | 'green' | 'emerald' | 'yellow';
  delay?: number;
}) {
  const accents: Record<string, string> = {
    purple: 'via-purple-500/30',
    blue: 'via-blue-500/30',
    green: 'via-green-500/30',
    emerald: 'via-emerald-500/30',
    yellow: 'via-yellow-500/30',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('relative', className)}
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/[0.02] pointer-events-none" />
      <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
        <div className={cn('h-px w-full bg-gradient-to-r from-transparent to-transparent', accents[accentColor])} />
        {children}
      </div>
    </motion.div>
  );
}

interface ClientSaleDetailProps { id: string; }

export default function ClientSaleDetail({ id }: ClientSaleDetailProps) {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { ethPrice } = useEthPrice();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [trackingNo, setTrackingNo] = useState('');
    const [carrier, setCarrier] = useState('');
    const [isShipping, setIsShipping] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [isCancelProcessing, setIsCancelProcessing] = useState(false);

    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
    const { markAsShipped, isInteracting: isEscrowInteracting } = useEscrowContract();

    const handleCopyId = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        });
    };

    const handleCancellationResponse = async (approve: boolean) => {
        if (!firestore || !order?.id || isCancelProcessing) return;
        setIsCancelProcessing(true);
        try {
            if (approve) {
                // Approve: mark as cancellation approved, admin will handle on-chain refund
                await updateDoc(doc(firestore, 'orders', order.id), {
                    cancellationApproved: true,
                    status: 'disputed', // Keeps it in disputed for admin to process refund
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Cancellation Approved', description: 'The admin will process the refund via the escrow contract.' });
            } else {
                // Decline: remove cancellation request, revert to disputed→paid
                await updateDoc(doc(firestore, 'orders', order.id), {
                    cancellationRequested: false,
                    cancellationApproved: false,
                    status: 'paid',
                    updatedAt: serverTimestamp(),
                });
                toast({ title: 'Cancellation Declined', description: 'The order will continue as normal.' });
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Could not process response.' });
        } finally {
            setIsCancelProcessing(false);
        }
    };

    const handleShip = async () => {
        if (!firestore || !order?.id) return;

        // 检查钱包连接
        if (!isConnected || !address) {
            toast({ variant: 'destructive', title: '钱包未连接', description: '请先连接 MetaMask 钱包以发货。' });
            return;
        }

        // 检查网络
        const currentChainId = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
        if (currentChainId !== REQUIRED_CHAIN_ID) {
            toast({ variant: 'destructive', title: '网络错误', description: '请切换到 Base 测试网。' });
            await connectToChain(REQUIRED_CHAIN_ID, toast);
            return;
        }

        // 检查钱包地址是否与合约中登记的卖家地址一致
        const contractSellerAddr = (order as any).sellerEthAddress;
        if (contractSellerAddr && address.toLowerCase() !== contractSellerAddr.toLowerCase()) {
            toast({
                variant: 'destructive',
                title: '钱包地址不匹配',
                description: `合约中的卖家地址为 ${contractSellerAddr.slice(0, 6)}...${contractSellerAddr.slice(-4)}，请在 MetaMask 中切换到该地址后再发货。`,
            });
            return;
        }

        setIsShipping(true);
        try {
            // 第一步：调用链上合约 markAsShipped
            const escrowId = order.escrowOrderId || order.id;
            toast({ title: '正在上链', description: '请在 MetaMask 中确认发货交易...' });
            const result = await markAsShipped(escrowId);
            if (!result.success) {
                throw new Error(result.error || '链上发货交易失败');
            }

            // 第二步：更新 Firestore
            await updateDoc(doc(firestore, 'orders', order.id), {
                status: 'shipped',
                shippingStatus: 'shipped',
                trackingNumber: trackingNo || null,
                carrier: carrier || null,
                shippedAt: serverTimestamp(),
                shippedTxHash: result.hash || '',
            });
            toast({ title: '发货成功', description: trackingNo ? `快递单号：${trackingNo}` : '链上发货已确认' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: '发货失败', description: e.message || '请稍后再试' });
        } finally {
            setIsShipping(false);
        }
    };

    const orderRef = useMemo(() => (firestore && id) ? doc(firestore, 'orders', id) : null, [firestore, id]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);

    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const buyerRef = useMemo(() => firestore && order?.buyerId ? doc(firestore, 'users', order.buyerId) : null, [firestore, order]);
    const { data: buyer } = useDoc<UserProfile>(buyerRef);

    const formatPrice = (price: any) => Number(price || 0).toLocaleString('en-US', { maximumFractionDigits: 6 });

    useEffect(() => {
        if (mounted && !authLoading && !user) router.replace('/');
    }, [user, authLoading, router, mounted]);

    // 买家确认收货后自动跳转评价页
    useEffect(() => {
        if (order && (order.status === 'completed' || order.status === 'delivered')) {
            router.push(`/account/sales/${id}/review`);
        }
    }, [order?.status, id, router]);

    const isLoading = !mounted || orderLoading || productLoading || authLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="absolute -inset-3 bg-emerald-500/15 rounded-full blur-lg animate-pulse" />
                    <Loader2 className="relative h-7 w-7 animate-spin text-emerald-400" />
                </div>
            </div>
        );
    }

    if (!order || orderError || (user && order.sellerId !== user.uid)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertOctagon className="w-12 h-12 text-red-400/40" />
                <p className="text-white/40 text-sm">订单不存在或无权访问</p>
                <Button onClick={() => router.push('/account/sales')} variant="ghost" size="sm">返回销售列表</Button>
            </div>
        );
    }

    const status = (order.status || 'pending').toLowerCase();
    const isPaid = ['confirmed', 'shipped', 'delivered', 'completed', 'disputed', 'paid'].includes(status) || order.paymentStatus === 'paid';
    const isShipped = ['shipped', 'delivered', 'completed'].includes(status);
    const isCompleted = status === 'completed' || status === 'delivered';

    const ethAmount = Number(order.totalAmount || order.price || 0);
    const usdEquiv = ethPrice ? ethAmount * ethPrice : null;

    const shippingAddr = order.shippingAddress as any;
    const productUrl = typeof window !== 'undefined' && order.productId
        ? `${window.location.origin}/products/${order.productId}`
        : null;
    const chatInitialMessage = productUrl
        ? `您好！关于商品「${order.productName || ''}」的订单有任何问题欢迎咨询 🔗\n${productUrl}`
        : undefined;

    return (
        <div className="relative py-8 px-4 sm:px-6">
            {/* Background glows */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-4xl mx-auto space-y-5">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent font-headline">
                            销售订单详情
                        </h1>
                        <button
                            onClick={() => handleCopyId(order.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 font-mono mt-0.5 hover:text-white/70 transition-colors group"
                        >
                            #{order.id}
                            {copiedId
                                ? <Check className="w-3 h-3 text-emerald-400" />
                                : <Copy className="w-3 h-3 text-white/40 hover:text-white/70 transition-colors" />
                            }
                        </button>
                    </div>
                    <div className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border',
                        isPaid
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400 animate-pulse'
                    )}>
                        {isPaid ? <ShieldCheck className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
                        {isPaid ? '已付款' : '待付款'}
                    </div>
                </motion.div>

                {/* Cancellation Request Banner */}
                {order.cancellationRequested && order.status !== 'cancelled' && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-black text-orange-300 text-sm">Cancellation Request Received</h3>
                                <p className="text-xs text-white/50 mt-0.5">The buyer has requested to cancel this order and receive a refund.</p>
                            </div>
                        </div>
                        {order.cancellationReason && (
                            <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-xs text-white/40 uppercase tracking-wider font-bold mb-1">Reason</p>
                                <p className="text-sm text-white/80">{order.cancellationReason}</p>
                            </div>
                        )}
                        {order.cancellationApproved ? (
                            <div className="flex items-center gap-2 text-sm text-blue-400 font-bold">
                                <CheckCircle className="w-4 h-4" />
                                You approved this cancellation. Waiting for admin to process refund.
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleCancellationResponse(true)}
                                    disabled={isCancelProcessing}
                                    className="flex items-center gap-2 h-9 px-4 rounded-xl bg-red-600/80 border border-red-500/30 text-white text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50"
                                >
                                    {isCancelProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                    Approve Cancellation & Refund
                                </button>
                                <button
                                    onClick={() => handleCancellationResponse(false)}
                                    disabled={isCancelProcessing}
                                    className="flex items-center gap-2 h-9 px-4 rounded-xl border border-white/15 bg-white/5 text-white/70 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                >
                                    Decline
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Progress steps — 真实链路 */}
                {(() => {
                    const isCancelled = status === 'cancelled';
                    const isRefunded = status === 'refunded';
                    const isDisputed = status === 'disputed';
                    const isAbnormal = isCancelled || isRefunded || isDisputed;

                    // 逻辑状态（不依赖 status 字符串枚举，综合三个字段判断）
                    const paidLogic = isPaid;
                    const shippedLogic = ['shipped', 'delivered', 'completed'].includes(status)
                        || order.shippingStatus === 'shipped'
                        || order.shippingStatus === 'delivered';
                    const deliveredLogic = ['delivered', 'completed'].includes(status)
                        || order.shippingStatus === 'delivered';
                    const completedLogic = status === 'completed';

                    // 当前激活步骤索引（0-4）
                    const currentStep = completedLogic ? 4
                        : deliveredLogic ? 3
                        : shippedLogic ? 3
                        : paidLogic ? 2
                        : 0;

                    const STEPS = [
                        { label: '待支付',   icon: Timer,        desc: '等待买家付款',     done: true },
                        { label: '已付款',   icon: ShieldCheck,  desc: '买家已付款',       done: paidLogic },
                        { label: '待发货',   icon: Package,      desc: '请尽快安排发货',   done: paidLogic },
                        { label: '已发货',   icon: Truck,        desc: '商品已发出',       done: shippedLogic },
                        { label: '确认收货', icon: CheckCircle2, desc: '交易已完成',       done: completedLogic || deliveredLogic },
                    ];

                    const progressPct = (currentStep / (STEPS.length - 1)) * 100;

                    return (
                        <GlassCard accentColor={isAbnormal ? 'yellow' : 'emerald'} delay={0.05}>
                            <div className="p-5">
                                {isAbnormal ? (
                                    <div className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold',
                                        isDisputed ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' :
                                        isRefunded ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' :
                                        'bg-red-500/10 border-red-500/25 text-red-400'
                                    )}>
                                        <Timer className="w-4 h-4 shrink-0" />
                                        {isDisputed ? '订单争议处理中' : isRefunded ? '订单已退款' : '订单已取消'}
                                    </div>
                                ) : (
                                    <>
                                        {/* Current status banner — center */}
                                        <div className="flex items-center justify-center gap-3 mb-5 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,1)]" />
                                            <span className="text-base font-black text-emerald-300 tracking-wide">
                                                {STEPS[currentStep]?.desc}
                                            </span>
                                            <span className="text-xs font-mono text-emerald-400/50">{currentStep + 1}/{STEPS.length}</span>
                                        </div>

                                        {/* Step dots + thruster track */}
                                        <div className="relative flex items-start justify-between px-2 mb-5">
                                            {/* Track background */}
                                            <div className="absolute top-5 left-[10%] right-[10%] h-2 bg-white/5 rounded-full" />
                                            {/* Fill with glow + moving shimmer */}
                                            <motion.div
                                                className="absolute top-5 left-[10%] h-2 rounded-full"
                                                style={{
                                                    background: 'linear-gradient(90deg, #059669, #34d399, #6ee7b7)',
                                                    boxShadow: '0 0 16px rgba(16,185,129,0.8), 0 0 32px rgba(16,185,129,0.4)',
                                                }}
                                                initial={{ width: 0 }}
                                                animate={{ width: `calc(${progressPct}% * 0.8)` }}
                                                transition={{ duration: 1.2, ease: 'easeOut' }}
                                            />
                                            {/* Thruster flame at tip */}
                                            {progressPct > 0 && progressPct < 100 && (
                                                <motion.div
                                                    className="absolute top-3.5 h-5 w-5 rounded-full bg-emerald-300 blur-sm"
                                                    style={{ left: `calc(10% + ${progressPct * 0.8}% - 10px)` }}
                                                    animate={{ opacity: [0.6, 1, 0.6], scale: [0.8, 1.2, 0.8] }}
                                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                                />
                                            )}
                                            {STEPS.map((step, i) => {
                                                const done = step.done;
                                                const active = i === currentStep;
                                                return (
                                                    <div key={i} className="flex flex-col items-center gap-2 z-10" style={{ width: '20%' }}>
                                                        <div className={cn(
                                                            'w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-500',
                                                            active
                                                                ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.9)] scale-110'
                                                                : done
                                                                ? 'bg-emerald-700 border-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                                                : 'bg-[#1a0d2e] border-white/20'
                                                        )}>
                                                            <step.icon className={cn(
                                                                'w-4.5 h-4.5',
                                                                active ? 'text-white animate-pulse' : done ? 'text-emerald-300' : 'text-white/35'
                                                            )} />
                                                        </div>
                                                        <span className={cn(
                                                            'text-[11px] font-black text-center leading-tight whitespace-nowrap',
                                                            active ? 'text-emerald-300' : done ? 'text-emerald-400' : 'text-white/40'
                                                        )}>{step.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Timestamps */}
                                        <div className="mt-2 pt-4 border-t border-white/8 grid grid-cols-3 gap-3 text-center">
                                            {[
                                                { label: '下单时间', time: order.createdAt },
                                                { label: '付款时间', time: order.paidAt || (paidLogic ? order.updatedAt : null) },
                                                { label: '发货时间', time: order.shippedAt },
                                            ].map(({ label, time }) => (
                                                <div key={label} className="space-y-1">
                                                    <p className="text-xs text-white/50 font-bold uppercase tracking-wide">{label}</p>
                                                    <p className="text-base font-black font-mono text-white">
                                                        {time?.toDate ? format(time.toDate(), 'MM/dd HH:mm') : <span className="text-white/25">—</span>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </GlassCard>
                    );
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                        {/* Product card */}
                        <GlassCard accentColor="blue" delay={0.1}>
                            <div className="p-5">
                                <div className="flex items-center justify-between gap-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20">
                                            <Package className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        <h2 className="text-base font-black text-white">商品信息</h2>
                                    </div>
                                    {order.productId && (
                                        <Link href={`/products/${order.productId}`} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 border border-blue-500/25 px-2.5 py-1 rounded-lg hover:border-blue-400/40 transition-all">
                                            查看商品 <ChevronLeft className="w-3 h-3 rotate-180" />
                                        </Link>
                                    )}
                                </div>
                                <Link href={order.productId ? `/products/${order.productId}` : '#'} className="flex gap-4 group">
                                    <div className="w-28 h-28 rounded-xl overflow-hidden border border-white/8 shrink-0 relative">
                                        {order.productImage ? (
                                            <Image src={order.productImage} alt="Product" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full bg-white/[0.03] flex items-center justify-center">
                                                <Package className="w-8 h-8 text-white/15" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-white text-lg mb-1 group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">{order.productName || '商品'}</h3>
                                        <p className="text-xs text-white/35 font-mono mb-3 truncate">ID: {order.productId}</p>
                                        <div className="flex items-baseline gap-2 flex-wrap">
                                            <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                                                {formatPrice(order.totalAmount || order.price)}
                                            </span>
                                            <span className="text-sm font-bold text-emerald-400/70">ETH</span>
                                            {usdEquiv && (
                                                <span className="text-xs font-mono text-white/35">≈${usdEquiv.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <Wallet className="w-3.5 h-3.5 text-blue-400" />
                                            <span className="text-sm font-bold text-white/60 uppercase font-mono">{order.paymentMethod || 'ETH'}</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </GlassCard>

                        {/* Chat */}
                        <GlassCard accentColor="purple" delay={0.15}>
                            <div className="p-5 flex flex-col">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/20">
                                        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                                    </div>
                                    <h2 className="text-sm font-semibold text-foreground">买家沟通</h2>
                                </div>
                                <div className="h-[480px]">
                                    <ChatWindow
                                        orderId={order.id}
                                        sellerId={order.sellerId}
                                        buyerId={order.buyerId}
                                        productName={order.productName}
                                        initialMessage={chatInitialMessage}
                                    />
                                </div>
                            </div>
                        </GlassCard>
                    </div>

                    {/* Right column */}
                    <div className="space-y-5">
                        {/* Order meta */}
                        <GlassCard accentColor="emerald" delay={0.1}>
                            <div className="p-5 space-y-1">
                                <h2 className="text-base font-black text-white mb-4">订单信息</h2>
                                {/* 订单号 — 可点击复制 */}
                                <div className="flex items-center justify-between py-3 border-b border-white/8">
                                    <span className="text-sm font-semibold text-white/55">订单号</span>
                                    <button
                                        onClick={() => handleCopyId(order.id)}
                                        className="flex items-center gap-1.5 text-sm font-black text-white font-mono hover:text-emerald-400 transition-colors group"
                                    >
                                        #{order.id?.slice(-10)}
                                        {copiedId
                                            ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            : <Copy className="w-3.5 h-3.5 text-white/35 shrink-0" />
                                        }
                                    </button>
                                </div>
                                {[
                                    { label: '下单时间', value: order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy/MM/dd HH:mm') : '—' },
                                    { label: '订单状态', value: isCompleted ? '已完成' : isShipped ? '已发货' : isPaid ? '已付款' : '待付款' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-center justify-between py-3 border-b border-white/8 last:border-0">
                                        <span className="text-sm font-semibold text-white/55">{label}</span>
                                        <span className="text-sm font-black text-white font-mono">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>

                        {/* Ship action — only when paid & not yet shipped */}
                        {isPaid && !isShipped && (
                            <GlassCard accentColor="emerald" delay={0.15}>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                                            <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        <h2 className="text-sm font-semibold text-foreground">确认发货</h2>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-white/50">快递公司（选填）</Label>
                                            <Input
                                                value={carrier}
                                                onChange={e => setCarrier(e.target.value)}
                                                placeholder="如：顺丰、圆通、EMS"
                                                className="h-9 text-sm bg-white/[0.04] border-white/10 focus:border-emerald-500/40 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-white/50">快递单号（选填）</Label>
                                            <Input
                                                value={trackingNo}
                                                onChange={e => setTrackingNo(e.target.value)}
                                                placeholder="输入物流追踪号码"
                                                className="h-9 text-sm bg-white/[0.04] border-white/10 focus:border-emerald-500/40 rounded-xl"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleShip}
                                            disabled={isShipping || isEscrowInteracting}
                                            className="w-full h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 border-0 text-white font-bold rounded-xl shadow-[0_0_16px_rgba(16,185,129,0.3)]"
                                        >
                                            {(isShipping || isEscrowInteracting) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                            确认发货
                                        </Button>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* Logistics info — show after shipped */}
                        {isShipped && (
                            <GlassCard accentColor="emerald" delay={0.15}>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
                                            <Truck className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        <h2 className="text-sm font-semibold text-foreground">物流信息</h2>
                                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">已发货</span>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { label: '快递公司', value: order.carrier || '—' },
                                            { label: '快递单号', value: order.trackingNumber || '—' },
                                            { label: '发货时间', value: order.shippedAt?.toDate ? format(order.shippedAt.toDate(), 'yyyy/MM/dd HH:mm') : '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                                <span className="text-xs text-muted-foreground/50">{label}</span>
                                                <span className="text-xs font-semibold text-foreground/80 font-mono">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* Buyer info */}
                        {buyer && (
                            <GlassCard accentColor="blue" delay={0.15}>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20">
                                            <User className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        <h2 className="text-sm font-semibold text-foreground">买家信息</h2>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Avatar className="w-12 h-12 border-2 border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                                            <AvatarImage src={buyer.photoURL} />
                                            <AvatarFallback className="bg-blue-600/30 text-white font-bold">{(buyer.displayName || 'B').charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-foreground">{buyer.displayName}</p>
                                            <p className="text-xs text-muted-foreground/50">{buyer.email}</p>
                                        </div>
                                    </div>
                                    {/* 没有收货地址时在买家卡片内提示 */}
                                    {!shippingAddr && (
                                        <div className="flex items-start gap-2 mt-1 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-orange-300 leading-relaxed">
                                                买家未通过标准结账填写收货地址，请通过聊天向买家索取收货信息（姓名、电话、地址）。
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        )}

                        {/* Shipping address */}
                        {shippingAddr && (
                            <GlassCard accentColor="yellow" delay={0.2}>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/20">
                                            <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                                        </div>
                                        <h2 className="text-sm font-semibold text-foreground">收货地址</h2>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-0.5">收件人</p>
                                            <p className="text-sm font-semibold text-foreground">{shippingAddr.recipientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-0.5">地址</p>
                                            <p className="text-sm text-foreground/70 leading-relaxed">
                                                {shippingAddr.addressLine1}{shippingAddr.addressLine2 ? `, ${shippingAddr.addressLine2}` : ''}, {shippingAddr.city}, {shippingAddr.country}
                                            </p>
                                        </div>
                                        {shippingAddr.phone && (
                                            <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                                                <Phone className="w-3 h-3 text-muted-foreground/40" />
                                                <p className="text-sm font-mono text-foreground/70">{shippingAddr.phone}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
