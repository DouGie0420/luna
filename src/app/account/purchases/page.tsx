'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { query, collection, where, orderBy, doc, updateDoc, serverTimestamp, getDocs, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import type { Order, Product, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { enUS, zhCN, th } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 50;
const locales = { en: enUS, zh: zhCN, th: th };

const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
        case 'Completed': return 'default';
        case 'Disputed':
        case 'Cancelled': return 'destructive';
        default: return 'secondary';
    }
};

const getStatusTranslationKey = (status: Order['status']) => {
    const camelCaseStatus = status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '');
    return `accountPurchases.status.${camelCaseStatus}`;
}

function OrderCardSkeleton() {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between bg-muted/30 p-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex items-start gap-4">
                    <Skeleton className="h-24 w-24 rounded-md" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-5 w-1/4" />
                        <div className="flex items-center gap-2 pt-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/30 p-4">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
            </CardFooter>
        </Card>
    );
}


function PurchaseOrderCard({ order }: { order: Order }) {
    const firestore = useFirestore();
    const router = useRouter();
    const { t, language } = useTranslation();
    const { toast } = useToast();

    const productRef = useMemo(() => firestore ? doc(firestore, 'products', order.productId) : null, [firestore, order.productId]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const sellerRef = useMemo(() => firestore ? doc(firestore, 'users', order.sellerId) : null, [firestore, order.sellerId]);
    const { data: seller, loading: sellerLoading } = useDoc<UserProfile>(sellerRef);
    
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirmReceipt = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!firestore) return;

        setIsConfirming(true);
        const orderRef = doc(firestore, 'orders', order.id);
        try {
            await updateDoc(orderRef, {
                status: 'Completed',
                completedAt: serverTimestamp()
            });
            toast({ title: t('orderDetails.receiptConfirmed') });
        } catch (error) {
            console.error("Failed to confirm receipt:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update order status.' });
        } finally {
            setIsConfirming(false);
        }
    };
    
    const isLoading = productLoading || sellerLoading;

    if (isLoading) {
        return <OrderCardSkeleton />;
    }

    return (
        <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader className="flex-row items-center justify-between bg-muted/30 p-4">
                <div>
                    <p className="text-sm font-medium">
                        {t('accountSales.orderPlaced')}:{' '}
                        <span className="font-normal text-muted-foreground">
                        {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'PPP', { locale: locales[language] }) : 'N/A'}
                        </span>
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                        ORDER ID: {order.id}
                    </p>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)}>
                    {t(getStatusTranslationKey(order.status), order.status)}
                </Badge>
            </CardHeader>
             <Link href={`/account/purchases/${order.id}`} className="block">
                <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border">
                        <Image
                            src={product?.images?.[0] || 'https://picsum.photos/seed/default-product/200/200'}
                            alt={product?.name || 'Product image'}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold hover:underline">{order.productName}</p>
                        <p className="text-primary">{order.totalAmount.toLocaleString()} {order.currency}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Link href={`/@${seller?.loginId || seller?.uid}`} onClick={(e) => e.stopPropagation()}>
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={seller?.photoURL} />
                                    <AvatarFallback>{seller?.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </Link>
                            <Link href={`/@${seller?.loginId || seller?.uid}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                                {seller?.displayName}
                            </Link>
                        </div>
                    </div>
                    </div>
                </CardContent>
            </Link>
            <CardFooter className="flex justify-end gap-2 bg-muted/30 p-4">
                <Button size="sm" variant="outline" onClick={() => router.push(`/account/purchases/${order.id}`)}>
                    <ExternalLink className="h-4 w-4 mr-1" /> View Details
                </Button>
                {order.status === 'Shipped' && (
                    <Button size="sm" onClick={handleConfirmReceipt} disabled={isConfirming}>
                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        {t('orderDetails.confirmReceipt')}
                    </Button>
                )}
                {order.status === 'Completed' && !order.buyerReviewId && (
                    <Button size="sm" asChild>
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
            </CardFooter>
        </Card>
    )
}

export default function PurchasesPage() {
    const { t } = useTranslation();
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();

    const [purchaseOrders, setPurchaseOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        if (!user?.uid || !db) {
            setLoading(false);
            return;
        }

        const fetchInitialOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const q = query(
                    collection(db, "orders"),
                    where("buyerId", "==", user.uid),
                    orderBy("createdAt", "desc"),
                    limit(PAGE_SIZE)
                );
                const documentSnapshots = await getDocs(q);
                const orders = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
                setPurchaseOrders(orders);
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
                setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
            } catch (err) {
                console.error(err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialOrders();
    }, [user?.uid, db]);

    const handleLoadMore = async () => {
        if (!user?.uid || !db || !lastVisible) return;
        setLoadingMore(true);
        try {
            const q = query(
                collection(db, "orders"),
                where("buyerId", "==", user.uid),
                orderBy("createdAt", "desc"),
                startAfter(lastVisible),
                limit(PAGE_SIZE)
            );
            const documentSnapshots = await getDocs(q);
            const newOrders = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
            setPurchaseOrders(prev => [...prev, ...newOrders]);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
        } catch (err) {
            console.error(err);
            setError(err);
        } finally {
            setLoadingMore(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    <p className="text-sm mt-2 text-muted-foreground">
                        无法加载订单，这可能是因为数据库缺少必要的查询索引。请打开开发者控制台(F12)查看错误信息，其中通常会包含一个用于一键创建索引的链接。
                    </p>
                </div>
            ) : loading ? (
                 <div className="grid gap-6">
                    {[...Array(3)].map((_, i) => <OrderCardSkeleton key={i} />)}
                </div>
            ) : !purchaseOrders || purchaseOrders.length === 0 ? (
                <div className="py-24 text-center border-2 border-dashed rounded-2xl opacity-40">
                    <p className="text-xl italic">空空如也，去商城看看吧</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {purchaseOrders.map((order: Order) => (
                        <PurchaseOrderCard key={order.id} order={order} />
                    ))}
                </div>
            )}

            {hasMore && !loading && purchaseOrders.length > 0 && (
                 <div className="mt-12 text-center">
                    <Button onClick={handleLoadMore} disabled={loadingMore}>
                        {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
}