'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link'
import { useParams, notFound, useRouter } from 'next/navigation'
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Order, Product, UserProfile } from '@/lib/types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/lib/notifications';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle2, Clock, Truck, MapPin, Package, AlertCircle, BellRing, CreditCard, Wallet } from 'lucide-react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const locales = { en: enUS, zh: zhCN, th: th };

// Correctly format status for translation key
const getStatusTranslationKey = (status: Order['status']) => {
    const camelCaseStatus = status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '');
    return `accountPurchases.status.${camelCaseStatus}`;
}

function OrderDetailPageSkeleton() {
    return (
        <>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                 <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-8 w-2/3" />
                            <Skeleton className="h-5 w-1/3" />
                        </CardHeader>
                        <CardContent>
                             <Skeleton className="h-24 w-full" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-1/4" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </>
    )
}


export default function OrderDetailPage() {
    const params = useParams();
    const orderId = params.id as string;
    const { t, language } = useTranslation();
    const router = useRouter();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const orderRef = useMemo(() => firestore && orderId ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading, error: orderError } = useDoc<Order>(orderRef);

    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const sellerRef = useMemo(() => firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null, [firestore, order]);
    const { data: seller, loading: sellerLoading } = useDoc<UserProfile>(sellerRef);
    
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirmReceipt = async () => {
        if (!firestore || !order) return;
        setIsProcessing(true);
        try {
            await updateDoc(doc(firestore, 'orders', order.id), {
                status: 'Completed',
                completedAt: serverTimestamp()
            });
            toast({ title: t('orderDetails.receiptConfirmed') });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to confirm receipt.' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleConfirmPayment = async () => {
        if (!firestore || !order) return;
        setIsProcessing(true);
        try {
            await updateDoc(doc(firestore, 'orders', order.id), {
                status: 'In Escrow'
            });
            toast({ title: t('orderDetails.paymentSuccess') });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update order status.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemindSeller = async () => {
        if (!firestore || !order || !user || !profile || !product) return;
        setIsProcessing(true);
        try {
            await createNotification(firestore, order.sellerId, {
                type: 'remind-to-ship',
                actor: profile,
                order,
                product
            });
            toast({ title: t('orderDetails.reminderSent') });
        } catch(e) {
             console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to send reminder.' });
        } finally {
            setIsProcessing(false);
        }
    }


    const isLoading = orderLoading || productLoading || sellerLoading;

    if (isLoading) return <OrderDetailPageSkeleton />;

    if (!order || orderError) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h1 className="mt-4 text-2xl font-bold">{t('orderDetails.notFoundTitle')}</h1>
                <p className="mt-2 text-muted-foreground">{orderError ? orderError.message : t('orderDetails.notFoundDesc')}</p>
                <Button onClick={() => router.back()} className="mt-6">{t('orderDetails.goBack')}</Button>
            </div>
        )
    }

    // Security Check
    if (user && user.uid !== order.buyerId && user.uid !== order.sellerId && (!profile || !['admin', 'support', 'staff', 'ghost'].includes(profile.role))) {
         return (
            <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h1 className="mt-4 text-2xl font-bold">{t('orderDetails.accessDenied')}</h1>
                 <p className="mt-2 text-muted-foreground">{t('orderDetails.accessDeniedDesc')}</p>
                <Button onClick={() => router.back()} className="mt-6">{t('orderDetails.goBack')}</Button>
            </div>
        )
    }

    const isBuyer = user?.uid === order.buyerId;
    const statusKey = getStatusTranslationKey(order.status);
    const canConfirmReceipt = isBuyer && (order.status === 'Shipped' || order.status === 'Awaiting Confirmation');
    const canReview = isBuyer && order.status === 'Completed' && !order.buyerReviewId;
    const canTrack = order.status === 'Shipped' || order.status === 'Awaiting Confirmation' || order.status === 'Completed';

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>{t(statusKey, order.status)}</span>
                             <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' || order.status === 'Cancelled' ? 'destructive' : 'secondary')}>
                                {t(statusKey, order.status)}
                             </Badge>
                        </CardTitle>
                        <CardDescription>
                            {order.status === 'Shipped' ? t('orderDetails.itemOnWay') : 
                             order.status === 'Pending' ? t('orderDetails.awaitingPayment') :
                             t('orderDetails.thankYou')}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="border-t pt-6 flex flex-col sm:flex-row items-center justify-end gap-4">
                       {canTrack && (
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline">{t('orderDetails.trackShipment')}</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('orderDetails.trackingInfo')}</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div>
                                        <Label htmlFor="provider">{t('orderDetails.trackingProvider')}</Label>
                                        <p id="provider" className="font-semibold">{order.shippingProvider || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <Label htmlFor="trackingNo">{t('orderDetails.trackingNumber')}</Label>
                                        <p id="trackingNo" className="font-semibold font-mono">{order.trackingNumber || 'N/A'}</p>
                                    </div>
                                    <Separator />
                                    <p className="text-sm text-muted-foreground">{t('orderDetails.trackingPlaceholder')}</p>
                                </div>
                            </DialogContent>
                        </Dialog>
                       )}
                       {isBuyer && order.status === 'In Escrow' && (
                            <Button onClick={handleRemindSeller} disabled={isProcessing} variant="outline">
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <BellRing className="mr-2 h-4 w-4" />
                                {t('orderDetails.remindSeller')}
                            </Button>
                       )}
                       {isBuyer && order.status === 'Pending' && order.paymentMethod === 'USDT' ? (
                           <Button onClick={handleConfirmPayment} disabled={isProcessing}>
                               {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                               <Wallet className="mr-2 h-4 w-4" />
                               Pay with Wallet (Escrow)
                           </Button>
                       ) : isBuyer && order.status === 'Pending' && (
                           <Button onClick={handleConfirmPayment} disabled={isProcessing}>
                               {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                               <CreditCard className="mr-2 h-4 w-4" />
                               I Have Paid
                           </Button>
                       )}
                       {canConfirmReceipt && (
                            <Button onClick={handleConfirmReceipt} disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('orderDetails.confirmReceipt')}
                            </Button>
                        )}
                         {canReview && (
                            <Button asChild>
                                <Link href={`/account/purchases/${order.id}/review`}>
                                    {t('orderDetails.leaveReview')}
                                </Link>
                            </Button>
                        )}
                         {isBuyer && order.status === 'Completed' && order.buyerReviewId && (
                            <Button disabled variant="outline">{t('orderDetails.reviewed')}</Button>
                         )}
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Package className="h-5 w-5" /> {t('orderDetails.productDetails')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {product ? (
                            <Link href={`/products/${product.id}`} className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent transition-colors -m-4">
                                <Image src={product.images[0]} alt={product.name} width={80} height={80} className="rounded-md object-cover aspect-square" />
                                <div className="flex-1">
                                    <p className="font-semibold">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">{product.category}</p>
                                    <p className="font-bold text-primary mt-1">{order.totalAmount.toLocaleString()} {order.currency}</p>
                                </div>
                            </Link>
                        ) : (
                            <p>{t('orderDetails.productLoading')}</p>
                        )}
                        <Separator className="my-4" />
                        <div className="text-sm text-muted-foreground space-y-2 font-mono">
                            <div className="flex justify-between items-center"><p>{t('orderDetails.orderId')}</p><p>{order.id}</p></div>
                             <div className="flex justify-between items-center"><p>{t('orderDetails.orderTime')}</p><p>{order.createdAt?.toDate ? format(order.createdAt.toDate(), 'Pp', { locale: locales[language] }) : 'N/A'}</p></div>
                             {order.completedAt && <div className="flex justify-between items-center"><p>{t('orderDetails.completedTime')}</p><p>{format(order.completedAt.toDate(), 'Pp', { locale: locales[language] })}</p></div>}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Truck className="h-5 w-5" /> {t('orderDetails.shippingDetails')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <p className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> {t('orderDetails.shipTo')}</p>
                                <div className="text-sm text-muted-foreground mt-1 pl-6">
                                    <p>{order.shippingAddress.recipientName}, {order.shippingAddress.phone}</p>
                                    <p>{order.shippingAddress.addressLine1}</p>
                                    {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                                    <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
                                    <p>{order.shippingAddress.country}</p>
                                </div>
                            </div>
                            {order.trackingNumber && (
                                <div>
                                    <p className="font-semibold">{t('orderDetails.tracking')}</p>
                                    <div className="text-sm text-muted-foreground mt-1 pl-6">
                                        <p>{order.shippingProvider}: {order.trackingNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           {t('orderDetails.sellerInfo')}
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                        {seller ? (
                             <div className="flex items-center gap-4">
                                <Link href={`/user/${seller.uid}`}>
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={seller.photoURL} alt={seller.displayName} />
                                        <AvatarFallback>{seller.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="flex-1">
                                    <Link href={`/user/${seller.uid}`} className="font-semibold hover:underline">{seller.displayName}</Link>
                                    <p className="text-xs text-muted-foreground">{seller.email}</p>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href={`/messages?to=${seller.uid}`}>{t('orderDetails.contactSeller')}</Link>
                                </Button>
                            </div>
                        ) : (
                            <p>{t('orderDetails.sellerLoading')}</p>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
