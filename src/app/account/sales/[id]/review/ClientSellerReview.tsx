'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useTranslation } from '@/hooks/use-translation';
import { doc, updateDoc, increment, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { Star, CheckCircle2, Loader2, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';

export default function ClientSellerReview({ id }: { id: string }) {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();

    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const orderRef = useMemo(() => (firestore && id) ? doc(firestore, 'orders', id) : null, [firestore, id]);
    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    useEffect(() => {
        if (!authLoading && !user) router.push('/');
    }, [user, authLoading, router]);

    const handleSubmit = async () => {
        if (!firestore || !user || !order) return;
        setIsSubmitting(true);
        try {
            // 保存卖家对买家的评价到订单文档
            await updateDoc(doc(firestore, 'orders', id), {
                sellerReview: {
                    rating,
                    text: reviewText,
                    createdAt: serverTimestamp(),
                },
                hasSellerReview: true,
            });

            // 更新买家的信用分（+rating）
            if (order.buyerId) {
                await updateDoc(doc(firestore, 'users', order.buyerId), {
                    creditScore: increment(rating),
                    reviewsCount: increment(1),
                });
            }

            // 写入 reviews 集合供 Reputation 页面展示
            await addDoc(collection(firestore, 'reviews'), {
                targetUserId: order.buyerId,
                reviewerId: user.uid,
                type: 'seller',
                rating,
                comment: reviewText,
                orderId: id,
                itemName: (order as any).productName || '',
                itemImage: (order as any).productImage || '',
                createdAt: serverTimestamp(),
            });

            toast({ title: t('reviewPage.submitSuccess') });
            router.push('/account/sales');
        } catch (error) {
            toast({ variant: 'destructive', title: t('reviewPage.submitFailed') });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <AlertOctagon className="w-16 h-16 text-red-500" />
                <p>{t('reviewPage.orderNotFound')}</p>
                <Button onClick={() => router.push('/account/sales')}>{t('reviewPage.goBack')}</Button>
            </div>
        );
    }

    // 已评价则直接跳转
    if ((order as any).hasSellerReview) {
        router.push('/account/sales');
        return null;
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <h1 className="text-3xl font-bold mb-2">{t('reviewPage.sellerTitle')}</h1>
                <p className="text-muted-foreground mb-8">{t('reviewPage.orderRef', `Order #${id.slice(-6).toUpperCase()} · ${(order as any).productName || ''}`).replace('{ref}', id.slice(-6).toUpperCase()).replace('{product}', (order as any).productName || '')}</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3">{t('reviewPage.sellerRatingLabel')}</label>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                    <Star className={`w-9 h-9 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                                </button>
                            ))}
                            <span className="ml-2 self-center text-sm text-muted-foreground">
                                {t(`reviewPage.ratingLabel${rating}`)}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t('reviewPage.comment')}</label>
                        <Textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder={t('reviewPage.sellerCommentPlaceholder')}
                            rows={4}
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('reviewPage.submitting')}</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-2" />{t('reviewPage.submit')}</>
                        )}
                    </Button>
                </div>
            </div>
        </>
    );
}
