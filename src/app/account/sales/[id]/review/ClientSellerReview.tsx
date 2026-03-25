'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
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

            toast({ title: '评价已提交', description: '感谢您的反馈！' });
            router.push('/account/sales');
        } catch (error) {
            toast({ variant: 'destructive', title: '提交失败', description: '请重试' });
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
                <p>订单不存在</p>
                <Button onClick={() => router.push('/account/sales')}>返回</Button>
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
                <h1 className="text-3xl font-bold mb-2">评价买家</h1>
                <p className="text-muted-foreground mb-8">订单 #{id.slice(-6).toUpperCase()} · {order.productName}</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-3">信用评分</label>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                    <Star className={`w-9 h-9 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                                </button>
                            ))}
                            <span className="ml-2 self-center text-sm text-muted-foreground">
                                {rating === 5 ? '非常好' : rating === 4 ? '较好' : rating === 3 ? '一般' : rating === 2 ? '较差' : '很差'}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">评价内容</label>
                        <Textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="描述买家的交易体验，如付款速度、沟通是否顺畅等..."
                            rows={4}
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold"
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />提交中...</>
                        ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-2" />提交评价</>
                        )}
                    </Button>
                </div>
            </div>
        </>
    );
}
