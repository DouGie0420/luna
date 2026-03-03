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
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

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

    useEffect(() => {
        if (mounted && !authLoading && !user) router.replace('/');
    }, [user, authLoading, router, mounted]);

    const isLoading = !mounted || orderLoading || productLoading || authLoading;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!order || orderError || order.sellerId !== user?.uid) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6">
                <AlertOctagon className="w-16 h-16 text-red-500 opacity-30" />
                <p className="font-mono text-xs tracking-widest text-white/40 uppercase">Unauthorized Access</p>
                <Button onClick={() => router.push('/account/sales')} variant="ghost">Return to Sales</Button>
            </div>
        );
    }

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
                            Sale Order
                        </h1>
                        <p className="text-[11px] font-mono text-white/30 tracking-[0.3em] uppercase mt-3 pl-7">Order_ID: {order.id}</p>
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
                            <div className="text-center p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                                <p className="text-[10px] font-mono text-white/50 tracking-[0.2em] uppercase mb-2">Sale Status</p>
                                <p className="text-sm font-bold text-white uppercase tracking-wider">
                                    {isCompleted ? 'Transaction Finalized' : isShipped ? 'Item Shipped' : 'Awaiting Payment'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Product Info */}
                <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 shadow-2xl">
                    <div className="flex items-center gap-6">
                        {product?.imageUrls?.[0] && (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden">
                                <Image
                                    src={product.imageUrls[0]}
                                    alt={product.name}
                                    width={96}
                                    height={96}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                        )}
                        <div>
                            <h3 className="text-xl font-bold">{product?.name || 'Unknown Product'}</h3>
                            <p className="text-white/50">Order #{order.id.slice(-8)}</p>
                            <p className="text-primary font-bold mt-1">{order.price} {order.currency}</p>
                        </div>
                    </div>
                </Card>

                {/* Buyer Info */}
                {buyer && (
                    <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[40px] p-8 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4">Buyer Information</h3>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12">
                                <AvatarImage src={buyer.photoURL} alt={buyer.displayName} />
                                <AvatarFallback>{buyer.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{buyer.displayName}</p>
                                <p className="text-sm text-white/50">{buyer.email}</p>
                            </div>
                        </div>
                    </Card>
                )}

            </main>
        </div>
    );
}
