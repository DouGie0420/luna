'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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

            toast({
                title: '评价已提交',
                description: '感谢您的反馈！',
            });

            router.push('/account/purchases');
        } catch (error) {
            console.error('Failed to submit review:', error);
            toast({
                variant: 'destructive',
                title: '提交失败',
                description: '请重试',
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
                <p>订单不存在</p>
                <Button onClick={() => router.push('/account/purchases')}>返回</Button>
            </div>
        );
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <h1 className="text-3xl font-bold mb-8">评价订单</h1>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">评分</label>
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
                        <label className="block text-sm font-medium mb-2">评价内容</label>
                        <Textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="分享您的购物体验..."
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
                                提交中...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                提交评价
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </>
    );
}
