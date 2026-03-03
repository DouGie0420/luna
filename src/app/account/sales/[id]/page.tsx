// @ts-nocheck
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

// ✅ Web3 核心引入 - 现在使用我们自己的 Hooks
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance'; // 导入我们自己的 Hook
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider'; // 引入连接链的函数

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';

// 定义Luna项目所需的Polygon链ID，与web3-provider.ts保持一致
const REQUIRED_CHAIN_ID = 8453;

export default function SalesOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const orderId = (params.id || params.orderId) as string;

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // --- Web3 Hooks ---
    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
    const { 
        isInteracting: isEscrowInteracting, 
        interactionError: escrowInteractionError, 
        openDispute // 引入 openDispute
    } = useEscrowContract();
    // --- End Web3 Hooks ---

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
    const [isShipping, setIsShipping] = useState(false); // 用于发货处理
    const [isDisputing, setIsDisputing] = useState(false); // 用于争议处理

    useEffect(() => { 
        if (mounted && !authLoading && !user) router.replace('/'); 
    }, [user, authLoading, router, mounted]);

    // 处理网络不匹配
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

    // ✅ 發貨邏輯：狀態變更後輸入框會消失
    const handleShipOrder = async () => {
        if (!firestore || !order || isShipping) return;
        if (!carrier.trim() || !trackingNumber.trim()) {
            toast({ title: 'Protocol Rejected', description: '请填写物流信息。', variant: 'destructive' });
            return;
        }

        setIsShipping(true);
        try {
            await updateDoc(doc(firestore, 'orders', order.id), { 
                status: 'Shipped', 
                shippingProvider: carrier,
                trackingNumber: trackingNumber,
                shippedAt: serverTimestamp() 
            });
            toast({ title: "指令已下达", description: "物流信息已同步至买家端。" });
        } catch (e: any) { 
            toast({ variant: 'destructive', title: '系统错误' }); 
        } finally { 
            setIsShipping(false); 
        }
    };

    // --- 新增：打开争议逻辑 ---
    const handleOpenDispute = async () => {
        if (!firestore || !order || isDisputing) return;

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

        setIsDisputing(true);
        toast({ title: "协议执行中", description: "正在发起链上争议请求..." });

        try {
            const disputeTxHash = await openDispute(order.escrowOrderId); // 捕获 openDispute 返回的交易哈希

            if (!disputeTxHash) {
                throw new Error(escrowInteractionError || "链上争议发起失败，请检查 Gas 或余额。");
            }

            // 更新 Firebase 订单状态为 Disputed
            await updateDoc(doc(firestore, 'orders', order.id), { 
                status: 'Disputed', 
                disputedAt: serverTimestamp(),
                openDisputeTxHash: disputeTxHash, // 存储争议交易哈希
            });
            
            toast({ title: "争议已发起", description: "已成功在智能合约中标记争议，等待仲裁员处理。" });
            router.refresh(); 

        } catch (e: any) { 
            console.error("争议发起失败:", e);
            toast({ variant: 'destructive', title: '协议执行失败', description: e.message || "争议发起中断" }); 
        } finally { setIsDisputing(false); }
    };
    // --- End 新增：打开争议逻辑 ---


    const isLoading = !mounted || orderLoading || productLoading || authLoading || isEscrowInteracting; // 添加 isEscrowInteracting
    if (isLoading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-4 text-[#D33A89]">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing Revenue Protocol...</p>
            </div>
        );
    }
    
    // 确保只有卖家能访问此页面
    if (!order || orderError || order.sellerId !== user?.uid) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-6 text-white/20 uppercase font-mono text-xs tracking-widest">
                Access Denied
            </div>
        );
    }

    const status = (order.status || 'pending').toLowerCase();
    const isPaid = status === 'paid' || status === 'shipped' || status === 'completed' || status === 'disputed'; 
    const isShipped = status === 'shipped' || status === 'completed' || status === 'disputed';
    const isCompleted = status === 'completed';
    const isDisputed = status === 'disputed'; 

    return (
        <div className="w-full max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <Button variant="ghost" onClick={() => router.push('/account/sales')} className="mb-4 text-white/40 hover:text-primary -ml-4 h-8 px-4 rounded-xl transition-all">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 我卖出的
                    </Button>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
                        <div className="w-3 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(211,58,137,0.5)]" />
                        Sales Management
                    </h1>
                    <p className="text-[11px] font-mono text-white/40 tracking-[0.3em] uppercase mt-2">ID: {order.id}</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold font-mono">
                    <ShieldCheck className="w-4 h-4" /> 资金受合约保护
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
                            {[]}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}