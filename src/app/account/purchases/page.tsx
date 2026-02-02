'use client'

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { format } from 'date-fns';
import { useTranslation } from "@/hooks/use-translation";
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy, type Firestore } from 'firebase/firestore';
import type { Order, Product, UserProfile, OrderStatus } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import { type User as FirebaseUser } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

function DynamicOrderCard({ order }: { order: Order }) {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const { data: product, loading: productLoading } = useDoc<Product>(
        firestore ? doc(firestore, 'products', order.productId) : null
    );
    const { data: seller, loading: sellerLoading } = useDoc<UserProfile>(
        firestore ? doc(firestore, 'users', order.sellerId) : null
    );

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Completed': return 'default';
            case 'Disputed': return 'destructive';
            case 'Shipped':
            case 'Awaiting Confirmation':
                return 'secondary';
            default: return 'secondary';
        }
    }

    const getStatusTranslation = (status: string) => {
        const keyPart = status.replace(/\s+/g, '').charAt(0).toLowerCase() + status.replace(/\s+/g, '').slice(1);
        const translationKey = `accountPurchases.status.${keyPart}` as any;
        const translated = t(translationKey);
        return translated === translationKey ? status : translated;
    }

    if (productLoading || sellerLoading) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="p-4"><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent className="p-4 bg-secondary/20">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-md" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-6 w-1/2 mt-2" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 flex justify-end gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </CardFooter>
            </Card>
        );
    }

    if (!product || !seller) return null;

    return (
        <Link href={`/account/purchases/${order.id}`}>
            <Card className="overflow-hidden hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={seller.photoURL} alt={seller.displayName} />
                            <AvatarFallback>{seller.displayName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm">{seller.displayName}</span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)}>{getStatusTranslation(order.status)}</Badge>
                </CardHeader>
                <CardContent className="p-4 bg-secondary/20">
                    <div className="flex items-center gap-4">
                        <div className="aspect-square w-24 relative">
                            <Image src={product.images[0]} alt={product.name} fill className="object-cover rounded-md" data-ai-hint={product.imageHints ? product.imageHints[0] : ''} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold leading-tight">{product.name}</p>
                            <p className="text-sm text-muted-foreground mt-1">{order.id.slice(0, 8).toUpperCase()} | {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd') : ''}</p>
                            <p className="text-lg font-bold text-primary mt-2">{order.totalAmount.toLocaleString()} {order.currency}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm">{t('accountPurchases.orderCard.contactSeller')}</Button>
                    {order.status === 'Completed' && !order.buyerReviewId ? (
                         <Button asChild size="sm"><Link href={`/account/purchases/${order.id}/review`}>{t('accountPurchases.orderCard.leaveReview')}</Link></Button>
                    ) : (order.status === 'Shipped' || order.status === 'Awaiting Confirmation') ? (
                         <Button asChild size="sm"><Link href={`/account/purchases/${order.id}`}>{t('accountPurchases.orderCard.confirmReceipt')}</Link></Button>
                    ) : null }
                </CardFooter>
            </Card>
        </Link>
    );
}

function PurchasesSkeleton() {
    return (
        <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                    <CardHeader className="p-4"><Skeleton className="h-8 w-3/4" /></CardHeader>
                    <CardContent className="p-4 bg-secondary/20">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-24 w-24 rounded-md" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-6 w-1/2 mt-2" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 flex justify-end gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}


function UserOrdersList({ user, firestore }: { user: FirebaseUser; firestore: Firestore }) {
    const { t } = useTranslation();
    
    const ordersQuery = useMemo(() => {
        // This query is now guaranteed to have a valid user.uid
        return query(
            collection(firestore, 'orders'),
            where('buyerId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );
    }, [user.uid, firestore]);

    const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

    if (ordersLoading) {
        return <PurchasesSkeleton />;
    }

    const renderOrders = (status?: OrderStatus | 'In Escrow') => {
        let filteredOrders;
        if (status === 'In Escrow') {
            filteredOrders = orders?.filter(o => o.status === 'Pending' || o.status === 'In Escrow');
        } else if (status) {
             filteredOrders = orders?.filter(o => o.status === status);
        } else {
            filteredOrders = orders;
        }
        
        if (!filteredOrders || filteredOrders.length === 0) {
            return (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">{t('accountPurchases.noOrdersTitle')}</h2>
                    <p className="text-muted-foreground mt-2 mb-6">{t('accountPurchases.noOrdersDescription')}</p>
                </div>
            )
        }
        return (
            <div className="space-y-6">
                {filteredOrders.map(order => <DynamicOrderCard key={order.id} order={order} />)}
            </div>
        )
    };
    
    return (
        <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="all">{t('accountPurchases.tabs.all')}</TabsTrigger>
                <TabsTrigger value="in-escrow">{t('accountPurchases.tabs.toShip')}</TabsTrigger>
                <TabsTrigger value="shipped">{t('accountPurchases.tabs.toReceive')}</TabsTrigger>
                <TabsTrigger value="completed">{t('accountPurchases.tabs.completed')}</TabsTrigger>
                <TabsTrigger value="disputed">{t('accountPurchases.tabs.disputed')}</TabsTrigger>
            </TabsList>
            <TabsContent value="all">{renderOrders()}</TabsContent>
            <TabsContent value="in-escrow">{renderOrders('In Escrow')}</TabsContent>
            <TabsContent value="shipped">{renderOrders('Shipped')}</TabsContent>
            <TabsContent value="completed">{renderOrders('Completed')}</TabsContent>
            <TabsContent value="disputed">{renderOrders('Disputed')}</TabsContent>
        </Tabs>
    );
}


export default function MyPurchasesPage() {
    const { t } = useTranslation();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const renderContent = () => {
        // Strict guard: Wait for auth and Firestore to be ready.
        if (userLoading || !firestore) {
            return <PurchasesSkeleton />;
        }
        
        // Strict guard: Only proceed if we have a logged-in user with a UID.
        if (!user) {
            return (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">{t('accountPurchases.noOrdersTitle')}</h2>
                    <p className="text-muted-foreground mt-2 mb-6">Please log in to view your purchases.</p>
                     <Button asChild><Link href="/login">Login</Link></Button>
                </div>
            );
        }

        // If all checks pass, render the component that makes the query.
        return <UserOrdersList user={user} firestore={firestore} />;
    };

    return (
        <div className="p-6 md:p-8 lg:p-12">
            <h1 className="text-3xl font-headline mb-6">{t('accountPurchases.title')}</h1>
            {renderContent()}
        </div>
    )
}
