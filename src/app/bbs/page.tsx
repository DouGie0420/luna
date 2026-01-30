'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { BbsPostCard } from '@/components/bbs-post-card';
import { Button } from '@/components/ui/button';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Flame, Sparkles, Star, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

function haversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLon = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


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

export default function BbsPage() {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<BbsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'newest' | 'trending' | 'featured' | 'nearest'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const fetchedPosts = await getBbsPosts();
            setPosts(fetchedPosts);
            setLoading(false);
        };
        fetchPosts();
    }, []);

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
        let processedPosts = [...posts];

        // 1. Filter by search term
        if (debouncedSearchTerm) {
            processedPosts = processedPosts.filter(post => {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                const titleMatch = t(post.titleKey).toLowerCase().includes(lowercasedTerm);
                const contentMatch = t(post.contentKey).toLowerCase().includes(lowercasedTerm);
                const tagMatch = post.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm));
                return titleMatch || contentMatch || tagMatch;
            });
        }

        // 2. Filter/Sort by activeFilter
        switch (activeFilter) {
            case 'trending':
                processedPosts.sort((a, b) => (b.likes + b.replies * 2) - (a.likes + a.replies * 2));
                break;
            case 'featured':
                 processedPosts = processedPosts.filter(p => p.isFeatured).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'nearest':
                if (userLocation) {
                    processedPosts.sort((a, b) => {
                        const distA = a.author.location ? haversineDistance(userLocation, a.author.location) : Infinity;
                        const distB = b.author.location ? haversineDistance(userLocation, b.author.location) : Infinity;
                        return distA - distB;
                    });
                }
                break;
            case 'newest':
            default:
                processedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
        }

        return processedPosts;

    }, [debouncedSearchTerm, activeFilter, posts, userLocation, t]);

    if (loading) {
        return <BbsPageSkeleton />;
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
                    <Button>
                       <Plus className="mr-2 h-4 w-4" />
                       {t('bbsPage.newPost')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {filteredAndSortedPosts.map((post) => (
                        <BbsPostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        </>
    )
}
