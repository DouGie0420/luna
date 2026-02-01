'use client';

import React, { useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { BbsPostCard } from './bbs-post-card';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

const SmallPostCard = React.memo(({ post }: { post: BbsPost }) => {
    const { t } = useTranslation();
    const timeAgo = post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : '';
    const summary = useMemo(() => {
        const content = post.content || t(post.contentKey || '');
        return content
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[(youtube|tiktok)\]\(.*?\)/g, '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ')
            .trim();
    }, [post.content, post.contentKey, t]);

    return (
        <Link href={`/bbs/${post.id}`} className="group block">
            <Card className="bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 border border-border hover:border-primary/50 p-5">
                <div className="flex items-center gap-4">
                    <div className="w-28 h-28 relative overflow-hidden rounded-md shrink-0">
                        <Image
                            src={post.images?.[0] || 'https://picsum.photos/seed/default-bbs/200/200'}
                            alt={post.title || t(post.titleKey || '')}
                            fill
                            className="object-cover"
                            data-ai-hint={post.imageHints?.[0] || ''}
                        />
                    </div>
                    <div className="flex-1 flex flex-col self-stretch">
                        <div className="flex-grow">
                             <h3 className="font-headline text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                {post.title || t(post.titleKey || '')}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-3">{summary}</p>
                        </div>
                        <div className="flex justify-end items-center gap-3 text-xs text-muted-foreground mt-2">
                            <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{post.replies}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                <span>{post.likes}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>{post.views}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        </Link>
    );
});
SmallPostCard.displayName = 'SmallPostCard';


const SmallPostCardSkeleton = () => (
    <Card className="p-4 bg-card/50">
        <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 shrink-0 rounded-md" />
            <div className="flex-1 flex flex-col h-24 justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
                <div className="flex justify-end items-center">
                    <Skeleton className="h-4 w-1/3" />
                </div>
            </div>
        </div>
    </Card>
);

export function SeaOfTranquility() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const postsQuery = useMemo(() => 
        firestore 
        ? query(collection(firestore, 'bbs'), orderBy('createdAt', 'desc'), limit(7)) 
        : null, 
    [firestore]);

    const { data: posts, loading: isLoading } = useCollection<BbsPost>(postsQuery);

    const featuredPosts = useMemo(() => posts?.slice(0, 2) || [], [posts]);
    const otherPosts = useMemo(() => posts?.slice(2, 7) || [], [posts]);
    
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
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Main Posts Skeleton */}
                    <div className="lg:col-span-2 grid grid-cols-1 gap-8">
                         <div className="flex flex-col space-y-3">
                            <Skeleton className="aspect-video w-full" />
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3">
                            <Skeleton className="aspect-video w-full" />
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    </div>
                    {/* Other Posts Skeleton */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        {[...Array(5)].map((_, i) => <SmallPostCardSkeleton key={i} />)}
                    </div>
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
            
             {(featuredPosts.length > 0 || otherPosts.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    
                    {featuredPosts.length > 0 && (
                        <div className="lg:col-span-2 flex flex-col gap-8">
                            {featuredPosts.map((post) => (
                                <BbsPostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                    
                    {otherPosts.length > 0 && (
                         <div className="lg:col-span-1 flex flex-col justify-between">
                            {otherPosts.map(post => (
                                <SmallPostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
