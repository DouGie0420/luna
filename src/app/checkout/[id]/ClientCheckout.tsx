'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
    ShieldCheck, AlertOctagon, ChevronLeft, Loader2, Wallet,
    CreditCard, Globe, Cpu, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { Order, Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

// Web3 imports
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Card, CardContent } from '@/components/ui/card';

// ✅ 静态引入聊天组件
import { ChatWindow } from '@/components/chat/ChatWindow';

const REQUIRED_CHAIN_ID = 84532; 

interface ClientCheckoutProps {
    id: string;
}

export default function ClientCheckout({ id }: ClientCheckoutProps) {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const orderId = id;
    const [mounted, setMounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Web3 Hooks
    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
    const { lockFunds, isInteracting: isEscrowInteracting, interactionError } = useEscrowContract();

    useEffect(() => { setMounted(true); }, []);

    const orderRef = useMemo(() => (firestore && orderId) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);

    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product } = useDoc<Product>(productRef);

    // 🚀 获取卖家资料，以便在 order.sellerEthAddress 缺失时作为替补方案
    const sellerRef = useMemo(() => firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null, [firestore, order]);
    const { data: seller } = useDoc<UserProfile>(sellerRef);

    useEffect(() => {
        if (mounted && !authLoading && !user) {
            router.replace('/');
        }
    }, [user, authLoading, router, mounted]);

    const formatPrice = (price: any) => {
        return Number(price || 0).toLocaleString('en-US', { maximumFractionDigits: 6 });
    };

    // 防死循环网络检测
    const hasPromptedNetwork = useRef(false);
    useEffect(() => {
        if (!mounted || !isConnected || chainId == null) return;
        const currentId = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);

        if (currentId !== REQUIRED_CHAIN_ID) {
            if (!hasPromptedNetwork.current) {
                hasPromptedNetwork.current = true;
                toast({
                    variant: "destructive",
                    title: "NETWORK_MISMATCH",
                    description: `请切换到 Base Sepolia (ID: ${REQUIRED_CHAIN_ID}) 进行支付。`,
                    action: (
                        <Button onClick={async () => { await connectToChain(REQUIRED_CHAIN_ID, toast); hasPromptedNetwork.current = false; }} className="bg-primary text-white text-[10px]">
                            切换网络
                        </Button>
                    ),
                    duration: 5000,
                });
            }
        } else {
            hasPromptedNetwork.current = false;
        }
    }, [isConnected, chainId, mounted, toast]);

    // 🚀 核心支付逻辑
    const handlePayment = async () => {
        if (!firestore || !user || !order || isProcessing) return;

        if (!isConnected || !address) {
            toast({ variant: "destructive", title: "钱包未连接", description: "请先连接 MetaMask 钱包。" });
            return;
        }

        const currentChainId = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId);
        if (currentChainId !== REQUIRED_CHAIN_ID) {
            toast({ variant: "destructive", title: "网络错误", description: `请切换到 Base 测试网。` });
            await connectToChain(REQUIRED_CHAIN_ID, toast);
            return;
        }

        setIsProcessing(true);

        try {
            if (typeof lockFunds !== 'function') throw new Error("支付模块未正确加载！");
            
            // 🎯 终极解法：全方位提取卖家的收款钱包地址
            // 有的系统存 sellerEthAddress，有的叫 walletAddress，有的叫 ethAddress，全部兼容。
            const finalSellerAddress = order.sellerEthAddress || seller?.walletAddress || seller?.ethAddress || (seller as any)?.address;

            // 拦截 1：卖家根本没有设置钱包
            if (!finalSellerAddress) {
                throw new Error("未获取到卖家的收款地址，无法执行智能合约。请联系卖家在个人中心绑定 Web3 钱包。");
            }

            // 拦截 2：买家和卖家是同一个钱包地址（防刷单拦截）
            if (finalSellerAddress.toLowerCase() === address.toLowerCase()) {
                throw new Error("智能合约安全拦截：买家和卖家不能使用同一个钱包地址！请更换钱包账户或测试账号。");
            }

            toast({ title: "唤起智能合约", description: "请在 MetaMask 中确认支付交易..." });

            // 🚀 调用 Hook 里的 lockFunds，传入真实的卖家地址
            const result = await lockFunds(order.id, order.price, finalSellerAddress);
            
            if (!result || !result.success || !result.hash) {
                throw new Error(result?.error || interactionError || "交易被拒绝或失败。");
            }

            // 支付成功，更新数据库
            await updateDoc(doc(firestore, 'orders', order.id), {
                status: 'paid',
                paidAt: serverTimestamp(),
                txHash: result.hash,
                paymentMethod: 'ETH',
                escrowOrderId: order.id,
            });

            toast({ title: "支付成功！", description: "资产已锁定至智能合约。正在返回订单页..." });
            
            setTimeout(() => {
                router.push(`/account/purchases/${order.id}`);
            }, 1500);

        } catch (e: any) {
            console.error("支付失败:", e);
            toast({ variant: 'destructive', title: '交易中断', description: e.message || "支付未能完成" });
        } finally { 
            setIsProcessing(false); 
        }
    };

    if (!mounted || orderLoading || authLoading) {
        return <div className="h-[80vh] flex flex-col items-center justify-center text-primary"><Loader2 className="w-10 h-10 animate-spin" /><p className="font-mono mt-4 text-[10px] tracking-widest uppercase">Initializing Secure Gateway...</p></div>;
    }
    
    if (!order || orderError || (user && order.buyerId !== user.uid)) {
        return <div className="h-[80vh] flex flex-col items-center justify-center"><AlertOctagon className="w-16 h-16 text-red-500 opacity-30" /><p className="font-mono mt-4">UNAUTHORIZED</p></div>;
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-32 font-sans selection:bg-primary/30">
            <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full mix-blend-screen" />
            </div>

            <div className="fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-xl border-b border-white/5">
                <PageHeaderWithBackAndClose />
            </div>

            <main className="container mx-auto max-w-6xl px-4 pt-36 relative z-10 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                
                <div>
                    <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
                        <div className="w-3 h-12 bg-primary rounded-full shadow-[0_0_25px_rgba(211,58,137,0.7)] animate-pulse" />
                        Checkout Gateway
                    </h1>
                    <p className="text-[11px] font-mono text-white/30 tracking-[0.4em] uppercase mt-3 pl-8">SECURE_NODE: {order.id}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                    
                    <div className="lg:col-span-2 space-y-12">
                        <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[48px] overflow-hidden shadow-2xl relative group border-b-primary/10">
                            <CardContent className="p-12 flex flex-col md:flex-row gap-12">
                                <div className="w-full md:w-48 h-48 rounded-[32px] overflow-hidden border border-white/10 relative shadow-2xl">
                                    <Image src={order.productImage || '/placeholder.jpg'} alt="Artifact" fill className="object-cover" />
                                </div>
                                <div className="flex-1 space-y-6 flex flex-col justify-center">
                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight">{order.productName}</h2>
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary font-mono text-[9px] font-black tracking-widest uppercase">Target Artifact</span>
                                        <p className="text-white/40 font-mono text-xs tracking-[0.2em]">{order.productId}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <ChatWindow orderId={order.id} sellerId={order.sellerId} buyerId={order.buyerId} productName={product?.name || order.productName} />
                    </div>

                    <div className="space-y-8 sticky top-32">
                        <Card className="bg-gradient-to-b from-[#111] to-[#050505] border border-primary/30 rounded-[40px] overflow-hidden shadow-[0_0_50px_rgba(211,58,137,0.15)] relative">
                            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                            <div className="p-10 space-y-8 relative z-10">
                                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                    <span className="text-[11px] font-mono text-white/50 tracking-widest uppercase">Payment Network</span>
                                    <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black border border-blue-500/20">
                                        <Globe className="w-3 h-3" /> Base Sepolia L2
                                    </div>
                                </div>

                                <div className="space-y-2 text-center py-6">
                                    <p className="text-[10px] font-mono text-white/40 tracking-[0.5em] uppercase">Total to Lock</p>
                                    <p className="text-6xl font-black text-white italic drop-shadow-[0_0_30px_rgba(211,58,137,0.5)] flex justify-center items-baseline gap-2">
                                        {formatPrice(order.price)} <span className="text-xl text-primary font-mono not-italic uppercase">ETH</span>
                                    </p>
                                </div>

                                {/* 真正的支付按钮 */}
                                <Button
                                    onClick={handlePayment}
                                    disabled={isProcessing || order.status !== 'pending_payment'}
                                    className="w-full h-20 bg-primary hover:bg-primary/80 text-white rounded-3xl font-black text-xl tracking-[0.2em] uppercase shadow-[0_15px_40px_-10px_rgba(211,58,137,0.7)] transition-all hover:-translate-y-1 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                                    {isProcessing ? (
                                        <Loader2 className="w-7 h-7 animate-spin mr-3" />
                                    ) : (
                                        <Wallet className="w-7 h-7 mr-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                                    )}
                                    {isProcessing ? 'Processing TX...' : 'PAY WITH ETH'}
                                </Button>

                                <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-4">
                                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-[9px] text-white/50 leading-relaxed font-mono uppercase tracking-widest">
                                        Your funds will be locked securely in the <span className="text-primary font-bold">Base Escrow Contract</span>. The seller cannot access the funds until you confirm receipt.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>

                </div>
            </main>

            <style jsx global>{`
                @keyframes shimmer { 100% { transform: translate(100%); } }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(211,58,137,0.2); border-radius: 10px; }
            `}</style>
        </div>
    );
}