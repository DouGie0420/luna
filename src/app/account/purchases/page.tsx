'use client';

import React, { useMemo } from 'react';
import { useUser, useCollection, useFirestore, useDoc } from "@/firebase";
import { query, collection, where, orderBy, doc } from "firebase/firestore";
import type { Order, Product } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, ExternalLink, CheckCircle2, XCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/hooks/use-translation";
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

function OrderCard({ order }: { order: Order }) {
    const { t } = useTranslation();
    const db = useFirestore();

    const productRef = useMemo(() => {
        if (!db || !order.productId) return null;
        return doc(db, 'products', order.productId);
    }, [db, order.productId]);

    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const handleConfirmReceipt = async () => {
        // WEB3: 99% 卖家, 1% 平台 (0x2fa2aa...)。
        alert("Web3 settlement logic placeholder.");
    };

    if (productLoading) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20" />
                </CardHeader>
                <CardContent className="p-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-16 w-16 rounded-md" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="bg-muted/30 p-4 flex justify-end gap-2">
                    <Skeleton className="h-8 w-24" />
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card key={order.id} className="overflow-hidden hover:ring-1 hover:ring-primary/20 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 p-4">
                <div>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">Order: {order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                        {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                    </p>
                </div>
                <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'}>
                    {t(`accountPurchases.status.${order.status.toLowerCase().replace(/\s/g, '')}` as any, order.status)}
                </Badge>
            </CardHeader>
            <CardContent className="p-4">
                 <Link href={`/products/${order.productId}`} className="flex items-start gap-4 group">
                    {product?.images?.[0] && (
                        <Image src={product.images[0]} alt={product.name || 'Product Image'} width={80} height={80} className="rounded-md object-cover border" data-ai-hint={product.imageHints?.[0]}/>
                    )}
                    <div className="flex-1">
                        <p className="font-semibold group-hover:underline">{product?.name || 'Loading product...'}</p>
                        <p className="text-sm font-bold text-primary mt-1">
                            {order.totalAmount.toLocaleString()} {order.currency}
                        </p>
                    </div>
                </Link>
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/account/purchases/${order.id}`}>
                        <Package className="h-4 w-4 mr-1" /> 查看详情
                    </Link>
                </Button>
                {order.status === 'Shipped' && (
                    <Button size="sm" onClick={handleConfirmReceipt}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> {t('accountPurchases.orderCard.confirmReceipt')}
                    </Button>
                )}
                 {order.status === 'Completed' && !order.buyerReviewId && (
                    <Button size="sm" asChild>
                        <Link href={`/account/purchases/${order.id}/review`}>
                             {t('accountPurchases.orderCard.leaveReview')}
                        </Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}

function PurchasesList({ user }: { user: NonNullable<ReturnType<typeof useUser>['user']>}) {
    const db = useFirestore();
    const { t } = useTranslation();
    
    // This query is now safe because this component only renders when user and db are available.
    const ordersQuery = useMemo(() => {
        if (!db) return null; // Still good practice to have this check
        return query(
            collection(db, "orders"),
            where("buyerId", "==", user.uid),
            orderBy("createdAt", "desc")
        );
    }, [user.uid, db]);

    const { data: orders, loading: dataLoading, error } = useCollection<Order>(ordersQuery);

    if (dataLoading) {
        return (
            <div className="grid gap-4">
                {[...Array(3)].map((_, i) => <OrderCard key={i} order={{} as Order} />)}
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="p-10 border border-destructive/20 rounded-lg bg-destructive/10 m-6 text-center">
                <XCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                <h2 className="text-destructive font-bold text-lg">权限或索引异常</h2>
                <p className="text-sm mt-2 text-muted-foreground">
                    Firestore 安全规则拒绝了此请求。请确保复合索引已正确配置。
                </p>
            </div>
        );
    }

    return (
        <>
            {!orders || orders.length === 0 ? (
                <Card className="bg-secondary/10 border-dashed">
                    <CardContent className="py-20 text-center text-muted-foreground">
                        暂无已完成或进行中的订单。
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {orders.map((order) => (
                       <OrderCard key={order.id} order={order} />
                    ))}
                </div>
            )}
        </>
    );
}


export default function PurchasesPage() {
    const { user, loading: authLoading } = useUser();
    const { t } = useTranslation();

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground italic">正在安全检索您的账户信息...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-20 text-center">
                <p className="text-muted-foreground">请先登录以查看您的购买记录。</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 lg:p-12 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <ShoppingBag className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-headline">{t('accountPurchases.title')}</h1>
            </div>
            <PurchasesList user={user} />
        </div>
    );
}
