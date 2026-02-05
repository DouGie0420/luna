

'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { BbsPostCard } from '@/components/bbs-post-card';
import { Button } from '@/components/ui/button';
import type { BbsPost, UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Flame, Sparkles, Star, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot, doc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';

const PAGE_SIZE = 50;

function BbsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="relative text-center mb-12 py-16">
                <Skeleton className="h-16 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-full max-w-2xl mx-auto mt-4" />
            </div>
            <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-3">
                        <Skeleton className="aspect-video w-full" />
                        <div className="space-y-2 p-4">
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function BbsPageContent() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const authorId = searchParams.get('author');

    const [posts, setPosts] = useState<BbsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [fetchError, setFetchError] = useState<any>(null);

    const [activeFilter, setActiveFilter] = useState<'newest' | 'trending' | 'featured' | 'nearest'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const { data: authorProfile, loading: authorLoading } = useDoc<UserProfile>(
        firestore && authorId ? doc(firestore, 'users', authorId) : null
    );
    
    const buildQuery = useCallback((startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'bbs'));
        
        // Filtering
        if (authorId) {
            q = query(q, where('authorId', '==', authorId));
        }
        q = query(q, where('status', '==', 'active'));

        if (activeFilter === 'featured' && !authorId) {
            q = query(q, where('isFeatured', '==', true));
        }

        // Ordering
        q = query(q, orderBy('createdAt', 'desc'));

        // Pagination
        if (startAfterDoc) {
            q = query(q, startAfter(startAfterDoc));
        }
        q = query(q, limit(PAGE_SIZE));
        
        return q;
    }, [firestore, authorId, activeFilter]);
    
    // Effect for initial fetch and when filters change
    useEffect(() => {
        const fetchInitialPosts = async () => {
            const q = buildQuery();
            if (!q) return;

            setLoading(true);
            setFetchError(null);
            
            try {
                const documentSnapshots = await getDocs(q);
                const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost);
                
                setPosts(newPosts);
                setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
                setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
            } catch (error: any) {
                console.error("Error fetching initial posts:", error);
                setFetchError(error);
                toast({ variant: 'destructive', title: 'Failed to fetch posts.' });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialPosts();
    }, [buildQuery, toast]);
    
    const handleLoadMore = useCallback(async () => {
        const q = buildQuery(lastVisible);
        if (!q) return;

        setLoadingMore(true);
        try {
            const documentSnapshots = await getDocs(q);
            const newPosts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost);
            
            setPosts(prev => [...prev, ...newPosts]);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);
        } catch (error: any) {
            console.error("Error loading more posts:", error);
            setFetchError(error);
            toast({ variant: 'destructive', title: 'Failed to load more posts.' });
        } finally {
            setLoadingMore(false);
        }
    }, [buildQuery, lastVisible, toast]);


    const handleNearestFilter = () => {
        setActiveFilter('nearest');
        if (userLocation) return;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    toast({
                        variant: 'destructive',
                        title: 'Location Error',
                        description: 'Could not retrieve your location. Please enable location services.',
                    });
                    setActiveFilter('newest'); // Revert to default
                }
            );
        } else {
             toast({
                variant: 'destructive',
                title: 'Location Error',
                description: 'Geolocation is not supported by your browser.',
            });
            setActiveFilter('newest'); // Revert to default
        }
    };


    const filteredAndSortedPosts = useMemo(() => {
        let processedPosts = posts ? [...posts] : [];

        // 1. Filter by search term
        if (debouncedSearchTerm) {
            processedPosts = processedPosts.filter(post => {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                const titleMatch = post.title?.toLowerCase().includes(lowercasedTerm);
                const contentMatch = post.content?.toLowerCase().includes(lowercasedTerm);
                const tagMatch = post.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm));
                return titleMatch || contentMatch || tagMatch;
            });
        }

        // 2. Apply client-side sorting for filters that need it
        switch (activeFilter) {
            case 'trending':
                processedPosts.sort((a, b) => ((b.likes || 0) + (b.replies * 2)) - ((a.likes || 0) + (a.replies * 2)));
                break;
            case 'nearest':
                if (userLocation) {
                    processedPosts.sort((a, b) => {
                        const distA = a.location ? haversineDistance(userLocation, a.location) : Infinity;
                        const distB = b.location ? haversineDistance(userLocation, b.location) : Infinity;
                        return distA - distB;
                    });
                }
                break;
        }
        
        return processedPosts;

    }, [debouncedSearchTerm, activeFilter, posts, userLocation]);

    // Helper for Haversine distance
    function haversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
        const R = 6371; // Earth radius in km
        const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
        const dLon = (coords2.lng - coords1.lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coords1.lat * (Math.PI / 180)) * Math.cos(coords2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    if (loading || (authorId && authorLoading)) {
        return <BbsPageSkeleton />;
    }

    if (fetchError) {
        let createIndexUrl = null;
        if (fetchError.code === 'failed-precondition' && fetchError.message.includes('https://console.firebase.google.com')) {
            createIndexUrl = fetchError.message.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0] || null;
        }

        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <div className="max-w-2xl mx-auto p-8 border border-destructive/50 bg-destructive/10 rounded-lg">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h1 className="mt-4 text-2xl font-bold text-destructive-foreground">Failed to Load Posts</h1>
                    <p className="mt-2 text-muted-foreground">The database query failed. This often means a composite index is required.</p>
                    {createIndexUrl && (
                        <div className="mt-4">
                            <p className="text-sm text-muted-foreground">Click the button below to create the necessary index in your Firebase console.</p>
                            <Button asChild className="mt-2">
                                <a href={createIndexUrl} target="_blank" rel="noopener noreferrer">Create Database Index</a>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
                    <BackButton />
                    <div className="flex-1 max-w-xl">
                        <Input 
                            placeholder={t('bbsPage.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
                        <Link href="/">
                            <X className="mr-2 h-4 w-4" />
                            {t('common.close')}
                        </Link>
                    </Button>
                </div>
            </div>
            <div className="container mx-auto px-4 py-12">
                {authorId ? (
                     <div className="flex items-center gap-4 mb-8">
                        <h1 className="font-headline text-3xl md:text-5xl font-bold text-primary">
                            Posts by {authorProfile?.displayName || '...'}
                        </h1>
                    </div>
                ) : (
                    <>
                        <div className="relative text-center mb-12 py-16 overflow-hidden rounded-lg border border-primary/20 bg-card/50">
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10" />
                            <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-transparent z-10" />
                            <Image src="https://picsum.photos/seed/lacus-somniorum-bg/1920/400" alt="Lacus Somniorum background" fill className="object-cover opacity-20" />
                            <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary animate-glow [text-shadow:0_0_15px_hsl(var(--primary))] relative z-20">
                                {t('bbsPage.title')}
                            </h1>
                            <p className="mt-4 text-xl text-foreground/80 max-w-2xl mx-auto relative z-20">
                                {t('bbsPage.description')}
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                            <div className="flex items-center gap-2">
                                <Button variant={activeFilter === 'newest' ? 'default' : 'outline'} onClick={() => setActiveFilter('newest')}>
                                    <Sparkles />
                                    {t('bbsPage.filterNewest')}
                                </Button>
                                <Button variant={activeFilter === 'trending' ? 'default' : 'outline'} onClick={() => setActiveFilter('trending')}>
                                    <Flame />
                                    {t('bbsPage.filterTrending')}
                                </Button>
                                <Button variant={activeFilter === 'featured' ? 'default' : 'outline'} onClick={() => setActiveFilter('featured')}>
                                    <Star />
                                    {t('bbsPage.filterFeatured')}
                                </Button>
                                <Button variant={activeFilter === 'nearest' ? 'default' : 'outline'} onClick={handleNearestFilter}>
                                    <MapPin />
                                {t('bbsPage.filterNearest')}
                                </Button>
                            </div>
                            <Button asChild>
                            <Link href="/bbs/new">
                                <Plus className="mr-2 h-4 w-4" />
                                {t('bbsPage.newPost')}
                            </Link>
                            </Button>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filteredAndSortedPosts.map((post) => (
                        <BbsPostCard key={post.id} post={post} />
                    ))}
                </div>
                
                {filteredAndSortedPosts.length === 0 && !loading && (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg col-span-full">
                        <p className="text-muted-foreground">{authorId ? 'This user has no posts.' : 'No posts match your criteria.'}</p>
                    </div>
                )}

                {hasMore && (
                    <div className="mt-12 text-center">
                        <Button onClick={handleLoadMore} disabled={loadingMore}>
                            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Load More
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}

export default function BbsPage() {
    return (
        <Suspense fallback={<BbsPageSkeleton />}>
            <BbsPageContent />
        </Suspense>
    );
}
