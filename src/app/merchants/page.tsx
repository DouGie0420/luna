
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { MerchantCard } from '@/components/merchant-card';
import { Loader2, AlertCircle } from 'lucide-react';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const PAGE_SIZE = 50;

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
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!firestore) return;

        const fetchAndProcessMerchants = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Query pro merchants with a limit to satisfy security rules for non-admin users.
                const q = query(
                    collection(firestore, 'users'),
                    where('isPro', '==', true),
                    limit(PAGE_SIZE)
                );
                
                const documentSnapshots = await getDocs(q);
                let allFetchedMerchants = documentSnapshots.docs.map(doc => doc.data() as UserProfile);

                // 2. Sort all fetched merchants on the client side by priority
                allFetchedMerchants.sort((a, b) => (b.displayPriority || 0) - (a.displayPriority || 0));

                // 3. Separate priority merchants from regular ones
                const priorityMerchants = allFetchedMerchants.filter(m => m.displayPriority && m.displayPriority > 0);
                const regularMerchants = allFetchedMerchants.filter(m => !m.displayPriority || m.displayPriority === 0);

                // 4. Shuffle the regular merchants to make the list random
                for (let i = regularMerchants.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [regularMerchants[i], regularMerchants[j]] = [regularMerchants[j], regularMerchants[i]];
                }
                
                // 5. Construct the final list: priority merchants first, then fill up to PAGE_SIZE with random regular merchants
                const neededRegular = PAGE_SIZE - priorityMerchants.length;
                const finalMerchants = [
                    ...priorityMerchants,
                    ...regularMerchants.slice(0, Math.max(0, neededRegular))
                ];

                setMerchants(finalMerchants);

            } catch (error: any) {
                console.error("Error fetching merchants:", error);
                setError("Failed to load merchants. Please check your connection and permissions.");
                toast({
                    variant: 'destructive',
                    title: 'Error fetching merchants',
                    description: error.message || 'An unknown error occurred.',
                    duration: 10000,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAndProcessMerchants();
    }, [firestore, toast]);


    if (error) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <div className="container mx-auto px-4 py-12 text-center">
                    <div className="max-w-2xl mx-auto p-8 border border-destructive/50 bg-destructive/10 rounded-lg">
                        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                        <h1 className="mt-4 text-2xl font-bold text-destructive-foreground">Failed to load merchants</h1>
                        <p className="mt-2 text-muted-foreground">{error}</p>
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
