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
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [errorInfo, setErrorInfo] = useState<{ message: string; link?: string | null } | null>(null);


    const fetchMerchants = async (loadMore = false) => {
        if (!firestore) return;
        if (loadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setErrorInfo(null);
        }

        const constraints = [
            where('isPro', '==', true),
            orderBy('displayPriority', 'desc'),
            orderBy('lastLogin', 'desc'),
            limit(PAGE_SIZE)
        ];
        
         if (loadMore && lastVisible) {
            constraints.push(startAfter(lastVisible));
        }
        
        const q = query(collection(firestore, 'users'), ...constraints);

        try {
            const documentSnapshots = await getDocs(q);
            let newMerchants = documentSnapshots.docs.map(doc => doc.data() as UserProfile);
            
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
            setMerchants(prev => loadMore ? [...prev, ...newMerchants] : newMerchants);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

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
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchMerchants();
    }, [firestore]);


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
                
                {hasMore && !loading && (
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
