'use client';

import React, { useMemo, useState } from 'react';
import { useUser, useCollection, useFirestore } from "@/firebase";
import { query, collection, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PackageCheck, AlertCircle, Truck, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from '@/hooks/use-translation';
import Link from 'next/link';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function SalesPage() {
    const { t } = useTranslation();
    const { user, profile, loading: authLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const [shippingInfo, setShippingInfo] = useState({ provider: '', trackingNumber: '' });
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Query for all orders where the user is a participant
    const ordersQuery = useMemo(() => {
        if (!user?.uid || !db) return null;
        return query(
            collection(db, "orders"),
            where("participants", "array-contains", user.uid),
            orderBy("createdAt", "desc")
        );
    }, [user?.uid, db]);

    const { data: allUserOrders, loading: dataLoading, error } = useCollection<Order>(ordersQuery);

    // Client-side filter for sales
    const salesOrders = useMemo(() => {
        if (!allUserOrders || !user) return [];
        return allUserOrders.filter(order => order.sellerId === user.uid);
    }, [allUserOrders, user]);

    const handleMarkAsShipped = (order: Order) => {
        setSelectedOrder(order);
    };

    const handleConfirmShipment = async () => {
        if (!db || !selectedOrder || !shippingInfo.provider || !shippingInfo.trackingNumber || !profile) return;

        if (shippingInfo.provider.trim() === '' || shippingInfo.trackingNumber.trim() === '') {
            toast({
                variant: 'destructive',
                title: t('accountSales.shippingInfoRequired'),
            });
            return;
        }

        setIsSubmitting(true);
        const orderRef = doc(db, 'orders', selectedOrder.id);
        const updateData = {
            status: 'Shipped' as const,
            shippingProvider: shippingInfo.provider,
            trackingNumber: shippingInfo.trackingNumber
        };
        try {
            await updateDoc(orderRef, updateData);
            await createNotification(db, selectedOrder.buyerId, {
                type: 'shipped',
                actor: profile,
                order: selectedOrder,
                shippingProvider: shippingInfo.provider,
                trackingNumber: shippingInfo.trackingNumber
            });
            toast({
                title: t('accountSales.shipmentConfirmed'),
                description: t('accountSales.shipmentConfirmedDescription'),
            });
            setSelectedOrder(null);
            setShippingInfo({ provider: '', trackingNumber: '' });
        } catch (error: any) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: orderRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getStatusTranslationKey = (status: Order['status']) => {
        const camelCaseStatus = status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '');
        return `accountPurchases.status.${camelCaseStatus}`;
    }

    if (authLoading || (user && dataLoading)) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">正在同步您的销售记录...</p>
            </div>
        );
    }

    if (!user) {
        return <div className="p-20 text-center text-muted-foreground">请登录后查看您的销售记录。</div>;
    }

    return (
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
            <div className="p-6 md:p-12 max-w-6xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">{t('accountSales.title')}</h1>
                </div>

                {error && (
                    <div className="p-10 border border-destructive/20 rounded-lg bg-destructive/5 text-center">
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                        <h2 className="text-destructive font-bold">连接被拦截</h2>
                        <p className="text-sm mt-2 text-muted-foreground">请检查 Firebase 控制台的 Rules 是否已点击 Publish。</p>
                    </div>
                )}
                {!error && (!salesOrders || salesOrders.length === 0) ? (
                    <div className="text-center p-20 border-2 border-dashed rounded-xl">
                        <PackageCheck className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold">{t('accountSales.noSales')}</h3>
                        <p className="text-muted-foreground mt-1">{t('accountSales.noSalesDescription')}</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {salesOrders?.map((order: Order) => (
                            <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-muted/30 p-4">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground font-mono">ORDER ID: {order.id?.slice(0, 10) || 'N/A'}</p>
                                        <CardTitle className="text-lg mt-1 group-hover:underline">{order.productName || '数字资产'}</CardTitle>
                                    </div>
                                    <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' || order.status === 'Cancelled' ? 'destructive' : 'secondary')}>
                                        {t(getStatusTranslationKey(order.status), order.status)}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    <div className="grid sm:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('accountSales.orderPlaced')}</p>
                                            <p>{order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</p>
                                        </div>
                                         <div>
                                            <p className="text-xs text-muted-foreground">{t('accountSales.buyer')}</p>
                                            <p className="font-mono">{order.buyerId.slice(0, 12)}...</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('accountSales.total')}</p>
                                            <p className="font-bold text-lg text-primary">{order.totalAmount.toLocaleString()} <span className="text-xs">{order.currency}</span></p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pb-4 flex justify-end gap-2">
                                     <Button size="sm" variant="outline" asChild>
                                        <Link href={`/account/purchases/${order.id}`}>
                                            {t('accountSales.viewOrder')}
                                        </Link>
                                    </Button>
                                    {order.status === 'In Escrow' && (
                                        <Button size="sm" onClick={() => handleMarkAsShipped(order)}>
                                            <Truck className="h-4 w-4 mr-1" /> {t('accountSales.markShipped')}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

             <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('accountSales.updateShipmentTitle')}</DialogTitle>
                    <DialogDescription>{t('accountSales.updateShipmentDescription')}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="shipping-provider">{t('accountSales.shippingProviderLabel')}</Label>
                        <Input id="shipping-provider" value={shippingInfo.provider} onChange={(e) => setShippingInfo({...shippingInfo, provider: e.target.value})} placeholder={t('accountSales.shippingProviderPlaceholder')} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="tracking-number">{t('accountSales.trackingNumberLabel')}</Label>
                        <Input id="tracking-number" value={shippingInfo.trackingNumber} onChange={(e) => setShippingInfo({...shippingInfo, trackingNumber: e.target.value})} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setSelectedOrder(null)}>Cancel</Button>
                    <Button onClick={handleConfirmShipment} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('accountSales.confirmShipment')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
