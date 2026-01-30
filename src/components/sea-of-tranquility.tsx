'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { BbsPostCard } from './bbs-post-card';

export function SeaOfTranquility() {
    const { t } = useTranslation();
    const [posts, setPosts] = useState<BbsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            const fetchedPosts = await getBbsPosts();
            setPosts(fetchedPosts.slice(0, 4));
            setIsLoading(false);
        };
        fetchPosts();
    }, []);

    if (isLoading) {
        return (
            <section className="container mx-auto px-4 py-12 md:py-16">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-headline text-3xl font-semibold">{t('seaOfTranquility.title')}</h2>
                     <Button asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate text-primary-foreground font-bold">
                        <Link href="/bbs">
                            {t('seaOfTranquility.enter')} <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
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
            </section>
        );
    }

    return (
        <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline text-3xl font-semibold">{t('seaOfTranquility.title')}</h2>
                <Button asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate text-primary-foreground font-bold">
                    <Link href="/bbs">
                        {t('seaOfTranquility.enter')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {posts.map(post => (
                    <BbsPostCard key={post.id} post={post} />
                ))}
            </div>
        </section>
    );
}
