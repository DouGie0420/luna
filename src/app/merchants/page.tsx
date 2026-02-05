'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { MerchantCard } from '@/components/merchant-card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const PAGE_SIZE = 50;
const PREFETCH_POOL_SIZE = 200; // Fetch a larger pool for randomization

function MerchantsPageSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="p-1">
                    <Skeleton className="h-48 w-full" />
                </div>
            ))}
        </div>
    )
}

export default function AllMerchantsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [merchants, setMerchants] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorInfo, setErrorInfo] = useState<{ message: string; link?: string | null } | null>(null);

    useEffect(() => {
        if (!firestore) return;

        const fetchAndProcessMerchants = async () => {
            setLoading(true);
            setErrorInfo(null);

            try {
                // Fetch a larger pool of merchants, prioritized first
                const q = query(
                    collection(firestore, 'users'),
                    where('isPro', '==', true),
                    orderBy('displayPriority', 'desc'),
                    limit(PREFETCH_POOL_SIZE)
                );
                
                const documentSnapshots = await getDocs(q);
                const allFetchedMerchants = documentSnapshots.docs.map(doc => doc.data() as UserProfile);

                // Separate priority merchants from regular ones
                const priorityMerchants = allFetchedMerchants.filter(m => m.displayPriority && m.displayPriority > 0);
                const regularMerchants = allFetchedMerchants.filter(m => !m.displayPriority || m.displayPriority === 0);

                // Shuffle the regular merchants to make the list random
                for (let i = regularMerchants.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [regularMerchants[i], regularMerchants[j]] = [regularMerchants[j], regularMerchants[i]];
                }
                
                // Construct the final list: priority merchants first, then fill the rest with random regular merchants
                const neededRegular = PAGE_SIZE - priorityMerchants.length;
                const finalMerchants = [
                    ...priorityMerchants,
                    ...regularMerchants.slice(0, Math.max(0, neededRegular))
                ];

                setMerchants(finalMerchants);

            } catch (error: any) {
                console.error("Error fetching merchants:", error);
                const errorMessage: string = error.message || 'An unknown error occurred.';
                const firebaseUrlMatch = errorMessage.match(/(https?:\/\/[^\s]+console\.firebase\.google\.com[^\s]+)/);

                if (firebaseUrlMatch) {
                    setErrorInfo({
                        message: "为了按优先级和活跃度排序商户，数据库需要一个复合索引。请点击下方按钮一键创建。",
                        link: firebaseUrlMatch[0],
                    });
                } else {
                    toast({
                      variant: 'destructive',
                      title: 'Error fetching merchants',
                      description: 'This may be due to missing Firestore indexes. Please check the browser console for a link to create it.',
                      duration: 10000,
                    })
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessMerchants();
    }, [firestore, toast]);


    if (errorInfo) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <div className="container mx-auto px-4 py-12 text-center">
                    <div className="max-w-2xl mx-auto p-8 border border-destructive/50 bg-destructive/10 rounded-lg">
                        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                        <h1 className="mt-4 text-2xl font-bold text-destructive-foreground">需要创建数据库索引</h1>
                        <p className="mt-2 text-muted-foreground">{errorInfo.message}</p>
                        {errorInfo.link && (
                            <Button asChild className="mt-6">
                                <a href={errorInfo.link} target="_blank" rel="noopener noreferrer">
                                    在 Firebase 控制台创建索引
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <h1 className="text-3xl font-headline mb-8">All Verified Merchants</h1>
                
                {loading ? <MerchantsPageSkeleton /> : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {merchants.map((user) => (
                            <MerchantCard key={user.uid} user={user} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
