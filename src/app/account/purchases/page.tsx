'use client';

import React, { useMemo } from 'react';
import { useUser, useCollection, useFirestore } from "@/firebase";
import { query, collection, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


export default function PurchasesPage() {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const ordersQuery = useMemo(() => {
        if (!user?.uid || !db) return null;
        return query(
            collection(db, "orders"),
            where("buyerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
    }, [user?.uid, db]);

    const { data: orders, loading: dataLoading, error } = useCollection<Order>(ordersQuery);

    const handleConfirmReceipt = async (orderId: string) => {
        if (!db) return;
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, {
                status: 'Completed',
                completedAt: serverTimestamp()
            });
            toast({ title: t('orderDetails.receiptConfirmed') });
        } catch (error) {
            console.error("Failed to confirm receipt:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update order status.' });
        }
    };

    if (authLoading || (user && dataLoading)) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">正在同步您的购买记录...</p>
            </div>
        );
    }

    if (!user) {
        return <div className="p-20 text-center text-muted-foreground">请登录后查看您的订单。</div>;
    }

    return (
        <div className="p-6 md:p-12 max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">{t('accountLayout.myPurchases')}</h1>
            </div>

            {error ? (
                <div className="p-10 border border-destructive/20 rounded-lg bg-destructive/5 text-center">
                    <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                    <h2 className="text-destructive font-bold">连接被拦截</h2>
                    <p className="text-sm mt-2 text-muted-foreground">请检查 Firebase 控制台的 Rules 是否已点击 Publish。</p>
                </div>
            ) : !orders || orders.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed rounded-2xl opacity-40">
                    <p className="text-xl italic">空空如也，去商城看看吧</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {orders.map((order: Order) => (
                        <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                             <Link href={`/account/purchases/${order.id}`} className="block">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 p-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-mono">ORDER ID: {order.id?.slice(0, 10) || 'N/A'}</p>
                                        <CardTitle className="text-lg mt-1 group-hover:underline">{order.productName || '数字资产'}</CardTitle>
                                    </div>
                                    <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' || order.status === 'Cancelled' ? 'destructive' : 'secondary')}>
                                        {t(`accountPurchases.status.${order.status.toLowerCase().replace(/\s/g, '')}` as any) || order.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">
                                                下单时间: {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                                            </p>
                                            <p className="font-bold text-2xl text-primary">{order.totalAmount.toLocaleString()} <span className="text-sm">{order.currency}</span></p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Link>
                             <CardContent className="pb-4">
                                <div className="flex justify-end gap-2">
                                     {order.status === 'Shipped' && (
                                        <Button size="sm" onClick={() => handleConfirmReceipt(order.id)}>
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> {t('orderDetails.confirmReceipt')}
                                        </Button>
                                    )}
                                    {order.status === 'Completed' && !order.buyerReviewId && (
                                            <Button size="sm" variant="outline" asChild>
                                            <Link href={`/account/purchases/${order.id}/review`}>
                                                {t('orderDetails.leaveReview')}
                                            </Link>
                                        </Button>
                                    )}
                                        {order.status === 'Completed' && order.buyerReviewId && (
                                            <Button size="sm" variant="ghost" disabled>
                                            {t('orderDetails.reviewed')}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
