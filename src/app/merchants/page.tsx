'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { MerchantCard } from '@/components/merchant-card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';

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
    const [merchants, setMerchants] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchMerchants = async (loadMore = false) => {
        if (!firestore) return;
        if (loadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        const constraints = [where('isPro', '==', true), orderBy('lastLogin', 'desc'), limit(PAGE_SIZE)];
         if (loadMore && lastVisible) {
            constraints.push(startAfter(lastVisible));
        }
        
        const q = query(collection(firestore, 'users'), ...constraints);

        try {
            const documentSnapshots = await getDocs(q);
            const newMerchants = documentSnapshots.docs.map(doc => doc.data() as UserProfile);
            
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
            setMerchants(prev => loadMore ? [...prev, ...newMerchants] : newMerchants);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error("Error fetching merchants:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, [firestore]);

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
                
                {hasMore && (
                    <div className="mt-12 text-center">
                        <Button onClick={() => fetchMerchants(true)} disabled={loadingMore}>
                            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Load More
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}
