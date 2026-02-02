'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Order, Product, UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, Truck, Copy, MessageCircle, ExternalLink, Package, CircleDollarSign, Bell, Edit, Star } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createNotification } from '@/lib/notifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

function OrderDetailPageSkeleton() {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <Card className="text-center">
            <CardHeader><Skeleton className="h-8 w-12 mx-auto rounded-full" /></CardHeader>
            <CardContent className="space-y-2">
                <Skeleton className="h-7 w-48 mx-auto" />
                <Skeleton className="h-5 w-64 mx-auto" />
                <Skeleton className="h-5 w-32 mx-auto" />
                <Skeleton className="h-10 w-40 mx-auto mt-4" />
            </CardContent>
          </Card>
          <Card>
             <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
             <CardContent className="space-y-4">
                <div className="flex gap-4">
                    <Skeleton className="h-20 w-20 rounded-md" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-1/4" />
                    </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
             </CardContent>
          </Card>
           <Card>
             <CardFooter className="p-4 pt-4 justify-between flex-wrap gap-2">
                 <Skeleton className="h-10 w-28" />
                 <div className="flex-grow" />
                 <Skeleton className="h-10 w-28" />
                 <Skeleton className="h-10 w-28" />
             </CardFooter>
          </Card>
        </div>
      </div>
    );
}

const InfoRow = ({ label, value, onCopy }: { label: string; value: React.ReactNode; onCopy?: () => void; }) => {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                <div className="font-medium text-right">{value}</div>
                {onCopy && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCopy}><Copy className="h-4 w-4" /></Button>}
            </div>
        </div>
    );
};


export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user: currentUser, profile: currentUserProfile, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const orderId = params.id as string;
    const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);

    const orderRef = useMemo(() => firestore && orderId ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);
    
    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const sellerRef = useMemo(() => firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null, [firestore, order]);
    const { data: seller, loading: sellerLoading } = useDoc<UserProfile>(sellerRef);


    const isLoading = userLoading || orderLoading || productLoading || sellerLoading;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: t('accountPage.copied') });
    };

    const handleRemindSeller = async () => {
        if (!firestore || !currentUserProfile || !order || !product) return;
        
        await createNotification(firestore, order.sellerId, {
            type: 'remind-to-ship',
            actor: currentUserProfile,
            order: order,
            product: product,
        });

        toast({ title: "已成功提醒卖家发货！" });
    };
    
    const handleConfirmReceipt = async () => {
        if (!firestore || !orderRef) return;
        
        // As per spec, this should trigger a smart contract.
        // For prototype, we will just update status and show a toast.
        await updateDoc(orderRef, {
            status: 'Completed',
            completedAt: serverTimestamp()
        });

        toast({
            title: t('orderDetails.receiptConfirmed'),
            description: "感谢您的购买！"
        });
    };
    
    const blockExplorerUrl = useMemo(() => {
        // This is a placeholder. A real implementation would depend on the chain.
        // I'll assume Ethereum for now.
        if (order?.paymentTransactionId) {
            return `https://etherscan.io/tx/${order.paymentTransactionId}`;
        }
        return '#';
    }, [order]);

    if (isLoading) {
        return <OrderDetailPageSkeleton />;
    }
    
    // Authorization check
    if (!order || !product || !seller) {
        return notFound();
    }

    if (currentUser?.uid !== order.buyerId && currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'ghost') {
        return (
            <div className="container mx-auto max-w-4xl px-4 py-8">
                 <h1 className="text-2xl font-headline text-destructive">拒绝访问</h1>
                 <p className="text-muted-foreground">您没有权限查看此订单。</p>
            </div>
        )
    }

    // Determine status text
    let statusText = "未知状态";
    if (order.status === 'Pending' || order.status === 'In Escrow') {
        statusText = "等待卖家发货";
    } else if (order.status === 'Shipped' || order.status === 'Awaiting Confirmation') {
        statusText = "运输中";
    } else if (order.status === 'Completed') {
        statusText = "订单已完成";
    } else {
        statusText = order.status;
    }


    return (
        <>
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <div className="space-y-6">
                
                <Card className="text-center overflow-hidden">
                     <CardHeader>
                        <CheckCircle className="mx-auto h-12 w-12 text-green-400 animate-pulse" />
                        <CardTitle className="font-headline text-2xl">支付成功!</CardTitle>
                        <CardDescription>您的资金已进入安全托管状态。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-4xl font-bold">{order.totalAmount.toLocaleString()} <span className="text-xl text-muted-foreground">{order.currency}</span></p>
                        {(order as any).paymentTransactionId && (
                            <Button asChild variant="outline">
                                <Link href={blockExplorerUrl} target="_blank" rel="noopener noreferrer">
                                    查看链上凭证 <ExternalLink className="ml-2 h-4 w-4"/>
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                订单详情
                            </CardTitle>
                            <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'}>{statusText}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4 p-4 bg-secondary/30 rounded-lg">
                            <div className="w-20 h-20 relative rounded-md overflow-hidden shrink-0">
                                <Image src={product.images[0]} alt={product.name} fill className="object-cover" data-ai-hint={product.imageHints[0]} />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold leading-tight">{product.name}</p>
                                <p className="text-lg font-bold text-primary mt-1">
                                    {product.price.toLocaleString()} <span className="text-xs ml-1">{product.currency}</span>
                                </p>
                            </div>
                        </div>

                        <InfoRow label="订单编号" value={order.id} onCopy={() => handleCopy(order.id)} />
                        
                        {(currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'ghost') && seller.walletAddress && (
                             <InfoRow label="卖家钱包" value={`${seller.walletAddress.slice(0, 6)}...${seller.walletAddress.slice(-4)}`} onCopy={() => handleCopy(seller.walletAddress!)} />
                        )}

                        <InfoRow label="下单时间" value={order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'} />
                        
                        <Separator />

                        <p className="font-semibold text-sm">收货地址:</p>
                        <div className="text-sm text-muted-foreground">
                            <p>{order.shippingAddress.recipientName}, {order.shippingAddress.phone}</p>
                            <p>{order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.province}, {order.shippingAddress.postalCode}</p>
                        </div>

                    </CardContent>
                     <CardFooter className="p-4 pt-0 flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <Button variant="outline" onClick={() => setIsLogisticsOpen(true)} disabled={!order.trackingNumber}>
                                <Package className="mr-2 h-4 w-4"/>
                                {t('orderDetails.viewLogistics')}
                            </Button>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                            <Button variant="outline"><MessageCircle className="mr-2"/>{t('orderDetails.contactSeller')}</Button>
                            {(order.status === 'Pending' || order.status === 'In Escrow') && (
                                <>
                                    <Button variant="outline" onClick={handleRemindSeller}><Bell className="mr-2"/>提醒发货</Button>
                                    <Button variant="outline" onClick={() => toast({ title: "功能即将推出" })}><Edit className="mr-2"/>修改地址</Button>
                                </>
                            )}
                            <Button variant="outline" onClick={() => toast({ title: "功能即将推出" })}>
                                <CircleDollarSign className="mr-2"/>{t('orderDetails.refund')}
                            </Button>
                            
                            {order.status === 'Completed' ? (
                                order.buyerReviewId ? (
                                    <Button disabled variant="outline">
                                        <CheckCircle className="mr-2"/>{t('orderDetails.reviewed')}
                                    </Button>
                                ) : (
                                    <Button asChild>
                                        <Link href={`/account/purchases/${order.id}/review`}>
                                            <Star className="mr-2"/>{t('orderDetails.leaveReview')}
                                        </Link>
                                    </Button>
                                )
                            ) : (order.status === 'Shipped' || order.status === 'Awaiting Confirmation') ? (
                                <Button onClick={handleConfirmReceipt}>{t('orderDetails.confirmReceipt')}</Button>
                            ) : null}
                        </div>
                    </CardFooter>
                </Card>

            </div>
        </div>
        <Dialog open={isLogisticsOpen} onOpenChange={setIsLogisticsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('orderDetails.logisticsInfo')}</DialogTitle>
                    <DialogDescription>
                        {t('orderDetails.snapshotInfo')}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <InfoRow label={t('orderDetails.courier')} value={order.shippingProvider || 'N/A'} />
                    <InfoRow label={t('orderDetails.trackingNumber')} value={order.trackingNumber || 'N/A'} onCopy={() => handleCopy(order.trackingNumber || '')} />
                    <Button className="w-full mt-4" disabled>{t('orderDetails.trackPackage')}</Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
