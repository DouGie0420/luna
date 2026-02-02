'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Order, Product, UserProfile, Rating } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, addDoc, collection, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ThumbsUp, ThumbsDown, Meh } from 'lucide-react';
import { cn } from '@/lib/utils';

function ReviewPageSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-5 w-1/3" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex gap-4 p-4 border rounded-lg">
                            <Skeleton className="h-20 w-20" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-5 w-full" />
                                <Skeleton className="h-5 w-1/4" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-24" />
                            <div className="flex gap-4">
                                <Skeleton className="h-12 w-24" />
                                <Skeleton className="h-12 w-24" />
                                <Skeleton className="h-12 w-24" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-24" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-12 w-32 ml-auto" />
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}

export default function LeaveReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { user: currentUser, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const orderId = params.id as string;

    const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const orderRef = useMemo(() => firestore && orderId ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
    const { data: order, loading: orderLoading } = useDoc<Order>(orderRef);

    const productRef = useMemo(() => firestore && order?.productId ? doc(firestore, 'products', order.productId) : null, [firestore, order]);
    const { data: product, loading: productLoading } = useDoc<Product>(productRef);

    const sellerRef = useMemo(() => firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null, [firestore, order]);
    const { data: seller, loading: sellerLoading } = useDoc<UserProfile>(sellerRef);

    const isLoading = userLoading || orderLoading || productLoading || sellerLoading;

    const handleSubmit = async () => {
        if (!selectedRating) {
            toast({ variant: 'destructive', title: t('reviewPage.ratingRequired') });
            return;
        }
        if (!firestore || !currentUser || !order || !seller) return;

        setIsSubmitting(true);
        try {
            const reviewData = {
                orderId: order.id,
                reviewerId: currentUser.uid,
                revieweeId: seller.uid,
                role: 'buyer' as const,
                rating: selectedRating,
                comment: comment,
                createdAt: serverTimestamp(),
            };

            const reviewRef = await addDoc(collection(firestore, 'reviews'), reviewData);

            await updateDoc(doc(firestore, 'orders', order.id), {
                buyerReviewId: reviewRef.id
            });

            // Note: In a production app, updating aggregated data like user ratings
            // should ideally be handled by a secure backend function (e.g., Cloud Function)
            // to prevent race conditions and ensure data integrity.
            // This client-side update is for prototype demonstration.
            const sellerDoc = await getDoc(sellerRef);
            if (sellerDoc.exists()) {
                const sellerData = sellerDoc.data() as UserProfile;
                const currentRating = sellerData.rating || 0;
                const currentReviews = sellerData.reviewsCount || 0;
                const ratingValue = selectedRating === 'Good' ? 5 : selectedRating === 'Neutral' ? 3 : 1;

                const newTotalRating = (currentRating * currentReviews) + ratingValue;
                const newReviewsCount = currentReviews + 1;
                const newAverageRating = newTotalRating / newReviewsCount;

                await updateDoc(sellerRef, {
                    reviewsCount: increment(1),
                    rating: newAverageRating
                });
            }

            toast({ title: t('reviewPage.submitSuccess') });
            router.back();

        } catch (error: any) {
            console.error("Failed to submit review:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit review. Please try again.' });
            // Let a global handler show permission errors if applicable
            if (!error.message.includes('permission-denied')) {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `/reviews or /orders/${order.id}`,
                    operation: 'create',
                }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <ReviewPageSkeleton />;
    }

    if (!order || !product || !seller) {
        return notFound();
    }
    
    if (currentUser?.uid !== order.buyerId) {
        return (
             <div className="container mx-auto max-w-2xl px-4 py-12">
                 <h1 className="text-2xl font-headline text-destructive">拒绝访问</h1>
                 <p className="text-muted-foreground">您只能为自己的订单留下评价。</p>
            </div>
        )
    }
    
    if (order.buyerReviewId) {
         return (
             <div className="container mx-auto max-w-2xl px-4 py-12">
                 <h1 className="text-2xl font-headline">您已评价过此订单</h1>
                 <p className="text-muted-foreground">感谢您的反馈！</p>
                 <Button onClick={() => router.back()} className="mt-4">返回</Button>
            </div>
        )
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto max-w-2xl px-4 py-12">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">{t('reviewPage.title')}</CardTitle>
                        <CardDescription>{t('reviewPage.forProduct').replace('{productName}', product.name)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={seller.photoURL} alt={seller.displayName} />
                                <AvatarFallback>{seller.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{t('reviewPage.seller').replace('{sellerName}', seller.displayName)}</p>
                                <Link href={`/user/${seller.uid}`} className="text-sm text-muted-foreground hover:underline">
                                    查看卖家资料
                                </Link>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="font-semibold">{t('reviewPage.rating')}</Label>
                            <RadioGroup
                                value={selectedRating || ''}
                                onValueChange={(value: Rating) => setSelectedRating(value)}
                                className="grid grid-cols-3 gap-4"
                            >
                                <Label htmlFor="rating-good" className={cn("flex flex-col items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer transition-all", selectedRating === 'Good' && 'border-green-500 ring-2 ring-green-500/50 bg-green-500/10')}>
                                    <RadioGroupItem value="Good" id="rating-good" className="sr-only" />
                                    <ThumbsUp className={cn("h-8 w-8", selectedRating === 'Good' ? 'text-green-500' : 'text-muted-foreground')} />
                                    <span>{t('reviewPage.ratingGood')}</span>
                                </Label>
                                <Label htmlFor="rating-neutral" className={cn("flex flex-col items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer transition-all", selectedRating === 'Neutral' && 'border-yellow-500 ring-2 ring-yellow-500/50 bg-yellow-500/10')}>
                                    <RadioGroupItem value="Neutral" id="rating-neutral" className="sr-only" />
                                    <Meh className={cn("h-8 w-8", selectedRating === 'Neutral' ? 'text-yellow-500' : 'text-muted-foreground')} />
                                    <span>{t('reviewPage.ratingNeutral')}</span>
                                </Label>
                                <Label htmlFor="rating-bad" className={cn("flex flex-col items-center justify-center gap-2 p-4 border rounded-lg cursor-pointer transition-all", selectedRating === 'Bad' && 'border-red-500 ring-2 ring-red-500/50 bg-red-500/10')}>
                                    <RadioGroupItem value="Bad" id="rating-bad" className="sr-only" />
                                    <ThumbsDown className={cn("h-8 w-8", selectedRating === 'Bad' ? 'text-red-500' : 'text-muted-foreground')} />
                                    <span>{t('reviewPage.ratingBad')}</span>
                                </Label>
                            </RadioGroup>
                        </div>
                        
                        <div className="space-y-3">
                            <Label htmlFor="comment" className="font-semibold">{t('reviewPage.comment')}</Label>
                            <Textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder={t('reviewPage.commentPlaceholder')}
                                rows={5}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSubmit} disabled={isSubmitting || !selectedRating} className="ml-auto">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('reviewPage.submit')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </>
    );
}
