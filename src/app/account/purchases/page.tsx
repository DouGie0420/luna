'use client';

import React, { useMemo } from 'react';
import { useUser, useCollection, useFirestore } from "@/firebase";
import { query, collection, where, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';

export default function PurchasesPage() {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();

    const ordersQuery = useMemo(() => {
        if (!user?.uid || !db) return null;
        return query(
            collection(db, "orders"),
            where("buyerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
    }, [user?.uid, db]);

    const { data: orders, loading: dataLoading, error } = useCollection(ordersQuery);

    const handleConfirmReceipt = async (orderId: string) => {
        // Web3 结算：99% 卖家, 1% 平台 (0x2fa2aa...)
        const platformAddress = "0x2fa2aa671077755331B96B96D7617bE5B84B2aa6"; 
        alert(`启动分账程序：\n99% 归卖家\n1% 归平台 (${platformAddress.slice(0, 6)}...)`);
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
                    {orders.map((order: any) => (
                        <Card key={order.id || Math.random()} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 p-4">
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-mono">ORDER ID: {order.id?.slice(0, 10) || 'N/A'}</p>
                                    <CardTitle className="text-lg mt-1">{order.productName || '数字资产'}</CardTitle>
                                </div>
                                <Badge variant={order.status === 'paid' ? 'default' : 'secondary'}>
                                    {order.status}
                                </Badge>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            下单时间: {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                                        </p>
                                        <p className="font-bold text-2xl text-primary">{order.amount} <span className="text-sm">USDT</span></p>
                                    </div>
                                    <div className="flex gap-2">
                                        {order.status === 'paid' && (
                                            <Button size="sm" onClick={() => handleConfirmReceipt(order.id)}>
                                                <CheckCircle2 className="h-4 w-4 mr-1" /> 确认收货 (结算)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
