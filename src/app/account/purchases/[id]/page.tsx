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

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, CheckCircle2, Clock, Truck, MapPin, Package, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow, addDays } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';

const locales = { en: enUS, zh: zhCN, th: th };


function OrderDetailPageSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
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
    
    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirmReceipt = async () => {
        if (!firestore || !order) return;
        setIsConfirming(true);
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
            setIsConfirming(false);
        }
    };


    const isLoading = orderLoading || productLoading || sellerLoading;

    if (isLoading) return <OrderDetailPageSkeleton />;

    if (!order || orderError) {
        return (
            <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h1 className="mt-4 text-2xl font-bold">Order Not Found</h1>
                <p className="mt-2 text-muted-foreground">{orderError ? orderError.message : "The order you are looking for does not exist or you don't have permission to view it."}</p>
                <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
            </div>
        )
    }

    // Security Check
    if (user && user.uid !== order.buyerId && user.uid !== order.sellerId && profile?.role !== 'admin') {
         return (
            <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
                 <p className="mt-2 text-muted-foreground">You do not have permission to view this order.</p>
                <Button onClick={() => router.back()} className="mt-6">Go Back</Button>
            </div>
        )
    }

    const isBuyer = user?.uid === order.buyerId;
    const canConfirmReceipt = isBuyer && (order.status === 'Shipped' || order.status === 'Awaiting Confirmation');
    const canReview = isBuyer && order.status === 'Completed' && !order.buyerReviewId;

    return (
        <>
        <PageHeaderWithBackAndClose />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>{t(`accountPurchases.status.${order.status.toLowerCase().replace(/\s/g, '')}` as any, order.status)}</span>
                             <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' || order.status === 'Cancelled' ? 'destructive' : 'secondary')}>
                                {t(`accountPurchases.status.${order.status.toLowerCase().replace(/\s/g, '')}` as any, order.status)}
                             </Badge>
                        </CardTitle>
                        <CardDescription>
                            {order.status === 'Shipped' ? 'Your item is on its way.' : 'Thank you for your purchase.'}
                        </CardDescription>
                    </CardHeader>
                    {canConfirmReceipt && (
                        <CardFooter className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground text-center sm:text-left">
                                Please confirm receipt after you have received and inspected the item.
                            </p>
                            <Button onClick={handleConfirmReceipt} disabled={isConfirming}>
                                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('orderDetails.confirmReceipt')}
                            </Button>
                        </CardFooter>
                    )}
                     {canReview && (
                        <CardFooter className="border-t pt-6 flex justify-end">
                            <Button asChild>
                                <Link href={`/account/purchases/${order.id}/review`}>
                                    {t('orderDetails.leaveReview')}
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Package className="h-5 w-5" /> Product Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {product && (
                            <Link href={`/products/${product.id}`} className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent transition-colors">
                                <Image src={product.images[0]} alt={product.name} width={80} height={80} className="rounded-md object-cover aspect-square" />
                                <div className="flex-1">
                                    <p className="font-semibold">{product.name}</p>
                                    <p className="text-sm text-muted-foreground">{product.category}</p>
                                    <p className="font-bold text-primary mt-1">{order.totalAmount.toLocaleString()} {order.currency}</p>
                                </div>
                            </Link>
                        )}
                        <Separator className="my-4" />
                        <div className="text-xs text-muted-foreground space-y-1 font-mono">
                            <div className="flex justify-between"><p>Order ID:</p><p>{order.id}</p></div>
                             <div className="flex justify-between"><p>Order Time:</p><p>{format(order.createdAt.toDate(), 'Pp')}</p></div>
                             {order.completedAt && <div className="flex justify-between"><p>Completed Time:</p><p>{format(order.completedAt.toDate(), 'Pp')}</p></div>}
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Truck className="h-5 w-5" /> Shipping Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <p className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Ship to</p>
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
                                    <p className="font-semibold">Tracking</p>
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
                           Seller Information
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                        {seller && (
                             <div className="flex items-center gap-4">
                                <Link href={`/user/${seller.uid}`}>
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={seller.photoURL} alt={seller.displayName} />
                                        <AvatarFallback>{seller.displayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="flex-1">
                                    <Link href={`/user/${seller.uid}`} className="font-semibold hover:underline">{seller.displayName}</Link>
                                    <p className="text-xs text-muted-foreground">{seller.email}</p>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href={`/messages?to=${seller.uid}`}>Contact Seller</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
        </>
    )
}
