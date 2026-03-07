'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import type { Order, Product, UserProfile } from '@/lib/types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/lib/notifications';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CheckCircle2, ExternalLink, MessageSquare, Truck } from 'lucide-react';
import { format } from "date-fns";
import { enUS, zhCN, th } from 'date-fns/locale';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { cn } from '@/lib/utils';
import { UserAvatar } from './ui/user-avatar'; // 🚀 確保引入了 UserAvatar

const locales = { en: enUS, zh: zhCN, th: th };

const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
        case 'Completed': return 'default';
        case 'Cancelled': return 'destructive';
        case 'In Escrow': return 'secondary';
        case 'Shipped':
        case 'Awaiting Confirmation':
             return 'secondary';
        default: return 'outline';
    }
};

const getStatusTranslationKey = (status: Order['status']) => {
    if (!status) return 'accountPurchases.status.pending';
    const camelCaseStatus = status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '');
    return `accountPurchases.status.${camelCaseStatus}`;
}

export function OrderCardSkeleton() {
    return (
        <Card className="overflow-hidden bg-black/60 backdrop-blur-2xl border-white/5 shadow-2xl">
            <CardHeader className="flex-row items-center justify-between space-y-0 bg-white/5 p-4">
                 <Skeleton className="h-4 w-48 bg-white/10" />
                 <Skeleton className="h-6 w-24 bg-white/10" />
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex gap-4">
                    <Skeleton className="h-20 w-20 rounded-md bg-white/10" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4 bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded-full bg-white/10" />
                            <Skeleton className="h-4 w-24 bg-white/10" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function OrderCard({ order, perspective }: { order: Order; perspective: 'buyer' | 'seller' }) {
    const firestore = useFirestore();
    const router = useRouter();
    const { t, language } = useTranslation();
    const { user: currentUser, profile: currentUserProfile } = useUser();
    const { toast } = useToast();

    const totalAmount = order?.totalAmount ?? 0;
    const currency = order?.currency ?? 'USDT';
    const productName = order?.productName ?? 'Protocol Data';

    const productRef = useMemo(() => (firestore && order.productId ? doc(firestore, 'products', order.productId) : null), [firestore, order.productId]);
    const { data: product } = useDoc<Product>(productRef);

    const otherUserId = perspective === 'buyer' ? order.sellerId : order.buyerId;
    const otherUserRef = useMemo(() => (firestore && otherUserId ? doc(firestore, 'users', otherUserId) : null), [firestore, otherUserId]);
    const { data: otherUser } = useDoc<UserProfile>(otherUserRef);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);
    const [shippingInfo, setShippingInfo] = useState({ provider: '', trackingNumber: '' });

    const handleConfirmReceipt = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!firestore) return;
        setIsProcessing(true);
        const orderDocRef = doc(firestore, 'orders', order.id);
        const updateData = { status: 'Completed' as const, completedAt: serverTimestamp() };
        try {
            await updateDoc(orderDocRef, updateData);
            toast({ title: t('orderDetails.receiptConfirmed') });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: orderDocRef.path, operation: 'update', requestResourceData: updateData,
            }));
        } finally { setIsProcessing(false); }
    };

    const handleConfirmShipment = async () => {
        if (!firestore || !currentUserProfile || !shippingInfo.provider || !shippingInfo.trackingNumber) return;
        setIsProcessing(true);
        try {
            const orderDocRef = doc(firestore, 'orders', order.id);
            await updateDoc(orderDocRef, {
                status: 'Shipped', shippingProvider: shippingInfo.provider, trackingNumber: shippingInfo.trackingNumber,
            });
            await createNotification(firestore, order.buyerId, {
                type: 'shipped', actor: currentUserProfile, order,
                shippingProvider: shippingInfo.provider, trackingNumber: shippingInfo.trackingNumber,
            });
            toast({ title: t('accountSales.shipmentConfirmed') });
            setIsShippingDialogOpen(false);
            setShippingInfo({ provider: '', trackingNumber: '' });
        } catch (error) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `orders/${order.id}`, operation: 'update' }));
        } finally { setIsProcessing(false); }
    };
    
    const canConfirmReceipt = perspective === 'buyer' && (order.status === 'Shipped' || order.status === 'Awaiting Confirmation');
    const canReview = perspective === 'buyer' && order.status === 'Completed' && !order.buyerReviewId;
    const canMarkAsShipped = perspective === 'seller' && order.status === 'In Escrow';

    return (
        <>
            <Card className={cn(
                "group relative overflow-hidden transition-all duration-500",
                "bg-[#09090b]/80 backdrop-blur-[24px] backdrop-saturate-[200%]",
                "border-t border-l border-white/10 border-b border-r border-white/5",
                "shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:shadow-primary/5 hover:border-primary/30 rounded-2xl"
            )}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <CardHeader className="flex-row items-center justify-between space-y-0 p-4 bg-white/[0.03] border-b border-white/5 relative z-10">
                    <div className="text-[10px] text-white/40 font-mono uppercase tracking-[0.2em]">
                        <p>{t('orderDetails.orderTime')}: {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPP', { locale: locales[language] || enUS }) : 'N/A'}</p>
                        <p className="mt-0.5 text-primary/60 font-black">ID_PROT: {order.id.slice(0, 10)}</p>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="font-black uppercase italic tracking-tighter bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                        {t(getStatusTranslationKey(order.status), order.status)}
                    </Badge>
                </CardHeader>

                <CardContent className="p-5 relative z-10">
                    <div className="flex gap-5">
                        <Link href={`/products/${product?.id || order.productId}`} className="shrink-0 relative group/img">
                            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover/img:opacity-40 transition-opacity" />
                            <Image
                                src={product?.images?.[0] || 'https://picsum.photos/seed/default-product/400/400'}
                                alt={productName} width={90} height={90}
                                className="rounded-xl object-cover aspect-square border-2 border-white/5 group-hover:border-primary/40 transition-all duration-500 shadow-2xl relative z-10"
                            />
                        </Link>
                        
                        <div className="flex-1 space-y-2">
                            <Link href={`/products/${product?.id || order.productId}`}>
                                <h3 className="font-headline font-black text-xl text-white leading-none tracking-tight line-clamp-1 uppercase italic group-hover:text-primary transition-colors">
                                    {productName}
                                </h3>
                            </Link>
                            
                            {/* 🚀 用戶卡片修復：點擊跳轉 + 傳入身份組(displayedBadge) */}
                            <div className="flex items-center gap-3 text-xs text-white/40 font-mono uppercase">
                                <span className="opacity-30">{perspective === 'buyer' ? 'PROVIDER' : 'RECIPIENT'}:</span>
                                {otherUser ? (
                                     <Link href={`/@${otherUser.loginId || otherUser.uid}`} className="flex items-center gap-2 hover:text-white transition-colors group/user">
                                        <UserAvatar 
                                            profile={{ 
                                                displayName: otherUser.displayName, 
                                                photoURL: otherUser.photoURL,
                                                displayedBadge: otherUser.displayedBadge // 🔥 關鍵：傳入身份組
                                            }} 
                                            className="h-6 w-6 border border-white/10 group-hover/user:border-primary/50 transition-colors" 
                                        />
                                        <span className="font-bold tracking-widest">{otherUser.displayName}</span>
                                    </Link>
                                ) : (
                                    <span className="tracking-widest italic opacity-20">INITIALIZING_NODE...</span>
                                )}
                            </div>
                        </div>

                         <div className="text-right flex flex-col justify-end">
                             <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">{currency}</span>
                             <p className="font-black text-2xl text-white font-mono tracking-tighter shadow-primary/20 drop-shadow-2xl">
                                {totalAmount.toLocaleString()}
                             </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-5 pt-0 flex justify-end gap-3 relative z-10">
                    <Button size="sm" variant="ghost" className="h-9 px-4 bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-mono text-[10px] tracking-widest uppercase" asChild>
                        <Link href={`/account/purchases/${order.id}`}>
                            <ExternalLink className="mr-2 h-3.5 w-3.5" /> Data_Access
                        </Link>
                    </Button>
                    {perspective === 'buyer' && canConfirmReceipt && (
                        <Button size="sm" onClick={handleConfirmReceipt} disabled={isProcessing} className="h-9 px-4 bg-primary text-black font-black uppercase italic tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)]">
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            {t('orderDetails.confirmReceipt')}
                        </Button>
                    )}
                    {perspective === 'buyer' && canReview && (
                        <Button size="sm" className="h-9 px-4 bg-primary text-black font-black uppercase italic tracking-tighter hover:shadow-primary/40 transition-all shadow-lg" asChild>
                            <Link href={`/account/purchases/${order.id}/review`}>
                                {t('orderDetails.leaveReview')}
                            </Link>
                        </Button>
                    )}
                    {perspective === 'seller' && canMarkAsShipped && (
                         <Button size="sm" className="h-9 px-4 bg-primary text-black font-black uppercase italic tracking-tighter shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:scale-105 transition-all" onClick={() => setIsShippingDialogOpen(true)}>
                            <Truck className="h-4 w-4 mr-2" /> {t('accountSales.markShipped')}
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {perspective === 'seller' &&
                <Dialog open={isShippingDialogOpen} onOpenChange={setIsShippingDialogOpen}>
                    <DialogContent className="bg-[#09090b] border border-white/10 text-white font-mono backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-3xl">
                        <DialogHeader>
                            <DialogTitle className="uppercase italic text-xl font-black text-primary tracking-tighter">{t('accountSales.updateShipmentTitle')}</DialogTitle>
                            <DialogDescription className="text-white/40 uppercase text-[10px] tracking-widest">{t('accountSales.updateShipmentDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                            <div className="grid gap-3">
                                <Label htmlFor="shipping-provider" className="text-[10px] font-black uppercase tracking-widest text-primary/80">{t('accountSales.shippingProviderLabel')}</Label>
                                <Input id="shipping-provider" className="bg-white/[0.03] border-white/10 h-12 focus:border-primary/50 transition-all" value={shippingInfo.provider} onChange={(e) => setShippingInfo({...shippingInfo, provider: e.target.value})} placeholder={t('accountSales.shippingProviderPlaceholder')} />
                            </div>
                            <div className="grid gap-3">
                                <Label htmlFor="tracking-number" className="text-[10px] font-black uppercase tracking-widest text-primary/80">{t('accountSales.trackingNumberLabel')}</Label>
                                <Input id="tracking-number" className="bg-white/[0.03] border-white/10 h-12 focus:border-primary/50 transition-all" value={shippingInfo.trackingNumber} onChange={(e) => setShippingInfo({...shippingInfo, trackingNumber: e.target.value})} />
                            </div>
                        </div>
                        <DialogFooter className="gap-3">
                            <Button variant="ghost" className="text-white/40 uppercase font-bold text-xs" onClick={() => setIsShippingDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                            <Button onClick={handleConfirmShipment} disabled={isProcessing} className="bg-primary text-black font-black uppercase italic tracking-tighter px-8 h-12 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('accountSales.confirmShipment')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            }
        </>
    );
}