'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { BbsPostCard } from '@/components/bbs-post-card';
import { Button } from '@/components/ui/button';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Flame, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
                        <Skeleton className="aspect-[16/9] w-full" />
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
    const [activeFilter, setActiveFilter] = useState<'newest' | 'trending' | 'hot'>('newest');

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            const fetchedPosts = await getBbsPosts();
            // In a real app, sorting would happen here based on the filter
            setPosts(fetchedPosts);
            setLoading(false);
        };
        fetchPosts();
    }, [activeFilter]);

    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <BbsPageSkeleton />
            </>
        )
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="relative text-center mb-12 py-16 overflow-hidden rounded-lg border border-primary/20 bg-card/50">
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-transparent z-10" />
                    <Image src="https://picsum.photos/seed/bbs-bg/1920/400" alt="Sea of Tranquility background" fill className="object-cover opacity-20" />
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
                    </div>
                    <Button>
                       <Plus className="mr-2 h-4 w-4" />
                       {t('bbsPage.newPost')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {posts.map((post, index) => (
                        <BbsPostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        </>
    )
}
