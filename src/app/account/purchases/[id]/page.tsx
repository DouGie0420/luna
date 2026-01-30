'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { getUsers } from '@/lib/data';
import type { User } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Copy, MessageCircle, MoreHorizontal, CheckCircle, Gem, ChevronDown, PackageSearch } from 'lucide-react';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';


// --- Mock Data ---
// In a real app, this would be fetched from a database
const mockOrders: any = {
    "ORD004": {
        id: "ORD004",
        product: { id: "vintage-camera", name: "Suno ai v5国际版充值 | 账号 直充一次性到账", image: "https://picsum.photos/seed/purchase1/600/400", imageHint: "glitch art", originalPrice: 80.00, },
        sellerId: "user10",
        dealPrice: 76.00,
        discount: 4.00,
        shippingFee: 0.00,
        currency: '¥',
        status: "Shipped",
        orderNumber: "5027653261827220635",
        paymentTransactionId: "2026012222001169911450728666",
        shippingAddress: "陈先生 18990008909 四川省自贡市 大安区马冲口街道张化厂宿舍4栋",
        orderTime: "2026-01-22 16:23:42",
        paymentTime: "2026-01-22 16:23:47",
        shippingTime: "2026-01-22 16:37:46",
        autoConfirmTime: new Date(new Date().getTime() + 1.5 * 24 * 60 * 60 * 1000).toISOString()
    }
};


function OrderDetailPageSkeleton() {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-1/2" /></CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
                <div className="flex gap-4">
                    <Skeleton className="h-20 w-20" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-1/4" />
                    </div>
                </div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
             <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
             </CardContent>
          </Card>
           <Card>
             <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
             <CardContent className="space-y-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
             </CardContent>
          </Card>
        </div>
      </div>
    );
}

function Countdown({ targetDate }: { targetDate: string }) {
    const { t } = useTranslation();
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft: { [key: string]: number } = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000 * 60); // Update every minute is enough

        return () => clearTimeout(timer);
    });

    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
        if (value > 0) {
            return `${value}${t(`orderDetails.time.${interval}` as any)}`;
        }
        return null;
    }).filter(Boolean).join('');
    
    if (!timerComponents) {
        return <span className="text-destructive">{t('orderDetails.autoConfirmed')}</span>;
    }

    return <span>{t('orderDetails.countdown').replace('{time}', timerComponents)}</span>;
}

const InfoRow = ({ label, value, copyValue, onCopy, isAction = false, isLink = false, href = '#' }: { label: string; value: React.ReactNode; copyValue?: string; onCopy?: (v: string) => void; isAction?: boolean; isLink?: boolean; href?: string; }) => {
    const { t } = useTranslation();
    
    const handleCopyClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent collapsible trigger if inside another trigger
        if (onCopy && copyValue) {
            onCopy(copyValue);
        }
    };

    return (
        <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                {isLink ? (
                    <Link href={href!} className="font-semibold text-foreground hover:underline hover:text-primary transition-colors">{value}</Link>
                ) : (
                    <div className="font-medium text-right">{value}</div>
                )}
                {onCopy && copyValue && <Button variant="ghost" size="sm" onClick={handleCopyClick}>{t('accountPage.copy')}</Button>}
                {isAction && <span className="text-muted-foreground text-lg">&gt;</span>}
            </div>
        </div>
    );
};


export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const orderId = params.id as string;

    const [order, setOrder] = useState<any>(null);
    const [seller, setSeller] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInfoOpen, setIsInfoOpen] = useState(false);


    useEffect(() => {
        setLoading(true);
        const fetchData = async () => {
            const fetchedOrder = mockOrders[orderId];
            if (fetchedOrder) {
                const allUsers = await getUsers();
                const foundSeller = allUsers.find(u => u.id === fetchedOrder.sellerId);
                setOrder(fetchedOrder);
                setSeller(foundSeller || null);
            }
            setLoading(false);
        };
        fetchData();
    }, [orderId]);
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t('accountPage.copied'),
        });
    };

    const handleConfirmReceipt = () => {
        toast({
            title: t('orderDetails.receiptConfirmed'),
        });
        // In a real app, update order status in the backend
        router.push('/account/purchases');
    };

    if (loading) {
        return <OrderDetailPageSkeleton />;
    }
    
    if (!order || !seller) {
        return notFound();
    }

    return (
        <div className="container mx-auto max-w-2xl px-4 py-8">
            <div className="space-y-4">
                
                <Card className="overflow-hidden">
                    <CardHeader className="bg-card">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl font-headline">
                                    {t(`orderDetails.status.${order.status}`)}
                                </CardTitle>
                                <CardDescription className="mt-1 text-sm">
                                    <Countdown targetDate={order.autoConfirmTime} />
                                </CardDescription>
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                {order.status === 'Shipped' && (
                                    <Button variant="outline">
                                        <PackageSearch className="mr-2 h-4 w-4" />
                                        {t('orderDetails.viewLogistics')}
                                    </Button>
                                )}
                                <Truck className="h-12 w-12 text-muted-foreground" />
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <Image src={order.product.image} alt={order.product.name} width={80} height={80} className="rounded-md object-cover" data-ai-hint={order.product.imageHint} />
                            <div className="flex-1">
                                <p className="font-semibold leading-tight">{order.product.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{order.currency}{order.product.originalPrice.toFixed(2)}</p>
                            </div>
                        </div>
                         <div className="mt-4 border-t pt-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">{t('accountPage.creditScore')}</span>
                                <div className="flex items-center gap-2 font-semibold">
                                    <Gem className="h-4 w-4 text-primary" />
                                    <span>{seller.creditScore || 0}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="pt-6 text-sm">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="font-semibold">{t('orderDetails.dealPrice')}</span>
                                <span className="font-semibold">{order.currency}{order.dealPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground items-center">
                                <span>{t('orderDetails.totalPrice')}</span>
                                <div className="flex items-center gap-2">
                                     <span className="line-through">{order.currency}{order.product.originalPrice.toFixed(2)}</span>
                                     <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400">
                                        {t('orderDetails.discount').replace('{amount}', `${order.currency}${order.discount.toFixed(2)}`)}
                                     </Badge>
                                </div>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>{t('orderDetails.shippingFee')}</span>
                                <span>{order.currency}{order.shippingFee.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen} className="text-sm">
                        <CollapsibleTrigger className="flex justify-between items-center w-full p-6">
                            <span className="text-muted-foreground">{t('orderDetails.orderNumber')}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-right">{order.orderNumber}</span>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCopy(order.orderNumber); }}>{t('accountPage.copy')}</Button>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", isInfoOpen && "rotate-180")} />
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="px-6 pb-6">
                                <Separator className="mb-6"/>
                                <div className="space-y-3">
                                    <InfoRow label={t('orderDetails.transactionSnapshot')} value={t('orderDetails.snapshotInfo')} isAction />
                                    <InfoRow label={t('orderDetails.paymentTransactionId')} value={order.paymentTransactionId} copyValue={order.paymentTransactionId} onCopy={handleCopy} />
                                    <Separator />
                                    <InfoRow label={t('orderDetails.shippingAddress')} value={order.shippingAddress} copyValue={order.shippingAddress} onCopy={handleCopy} />
                                    <InfoRow 
                                        label={t('orderDetails.sellerNickname')} 
                                        value={
                                            <Badge variant="outline" className="px-3 py-1 rounded-full font-semibold border-primary/50 text-primary">
                                                {seller.name}
                                            </Badge>
                                        } 
                                        isLink 
                                        href={`/user/${seller.id}`} 
                                    />
                                    <Separator />
                                    <InfoRow label={t('orderDetails.orderTime')} value={order.orderTime} />
                                    <InfoRow label={t('orderDetails.paymentTime')} value={order.paymentTime} />
                                    <InfoRow label={t('orderDetails.shippingTime')} value={order.shippingTime} />
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>


                <Card>
                    <CardFooter className="p-4 pt-4 justify-end gap-2">
                        <Button className="bg-yellow-400 text-black hover:bg-yellow-500"><MessageCircle className="mr-1 h-4 w-4" /> {t('orderDetails.contactSeller')}</Button>
                        <Button className="bg-yellow-400 text-black hover:bg-yellow-500"><MoreHorizontal className="mr-1 h-4 w-4" /> {t('orderDetails.more')}</Button>
                        <Button className="bg-yellow-400 text-black hover:bg-yellow-500">{t('orderDetails.buyAgain')}</Button>
                        <Button onClick={handleConfirmReceipt} className="bg-yellow-400 text-black hover:bg-yellow-500">{t('orderDetails.confirmReceipt')}</Button>
                    </CardFooter>
                </Card>

            </div>
        </div>
    );
}
