'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useTranslation } from '@/hooks/use-translation';
import { doc, updateDoc, increment, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { Star, CheckCircle2, Loader2, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/lib/types';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';

interface ClientReviewProps {
  id: string;
}

export default function ClientReview({ id }: ClientReviewProps) {
    const router = useRouter();
    const { user, loading: authLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();

    const orderId = id;

    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const orderRef = useMemo(() => (firestore && orderId) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [user, authLoading, router]);

    const handleSubmit = async () => {
        if (!firestore || !user || !order) return;

        setIsSubmitting(true);

        try {
            await updateDoc(doc(firestore, 'orders', orderId), {
                review: {
                    rating,
                    text: reviewText,
                    createdAt: serverTimestamp(),
                },
                hasReview: true,
            });

            // 更新卖家信用分
            if (order.sellerId) {
                await updateDoc(doc(firestore, 'users', order.sellerId), {
                    creditScore: increment(rating),
                    reviewsCount: increment(1),
                });
            }

            // 写入 reviews 集合供 Reputation 页面展示
            await addDoc(collection(firestore, 'reviews'), {
                targetUserId: order.sellerId,
                reviewerId: user.uid,
                type: 'buyer',
                rating,
                comment: reviewText,
                orderId,
                itemName: (order as any).productName || '',
                itemImage: (order as any).productImage || '',
                createdAt: serverTimestamp(),
            });

            toast({
                title: t('reviewPage.submitSuccess'),
            });

            router.push('/account/purchases');
        } catch (error) {
            console.error('Failed to submit review:', error);
            toast({
                variant: 'destructive',
                title: t('reviewPage.submitFailed'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <AlertOctagon className="w-16 h-16 text-red-500" />
                <p>{t('reviewPage.orderNotFound')}</p>
                <Button onClick={() => router.push('/account/purchases')}>{t('reviewPage.goBack')}</Button>
            </div>
        );
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8">{t('reviewPage.title')}</h1>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('reviewPage.rating')}</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none"
                                >
                                    <Star
                                        className={`w-8 h-8 ${
                                            star <= rating
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-gray-300'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t('reviewPage.comment')}</label>
                        <Textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder={t('reviewPage.commentPlaceholder')}
                            rows={4}
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('reviewPage.submitting')}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                {t('reviewPage.submit')}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </>
    );
}
