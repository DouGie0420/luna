'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { BbsPostCard } from './bbs-post-card';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import React from 'react';

const SmallPostCard = React.memo(({ post }: { post: BbsPost }) => {
    const { t } = useTranslation();

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
            <Card className="bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 border border-border hover:border-primary/50 p-4">
                <div className="flex items-start gap-4">
                    <div className="w-24 h-24 relative overflow-hidden rounded-md shrink-0">
                        <Image
                            src={post.images?.[0] || 'https://picsum.photos/seed/default-bbs/200/200'}
                            alt={post.title || t(post.titleKey || '')}
                            fill
                            className="object-cover"
                            data-ai-hint={post.imageHints?.[0] || ''}
                        />
                    </div>
                    <div className="flex-1 flex flex-col h-24 justify-between">
                        <div>
                            <h3 className="font-headline text-base leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                {post.title || t(post.titleKey || '')}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                                {summary}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="border-t border-border/50 mt-4 pt-3 text-xs text-muted-foreground">
                    <div className="flex justify-between items-center">
                        <div>
                            <span>{post.author.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
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


export function SeaOfTranquility() {
    const { t } = useTranslation();
    const [featuredPosts, setFeaturedPosts] = useState<BbsPost[]>([]);
    const [otherPosts, setOtherPosts] = useState<BbsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                const allPosts = await getBbsPosts();
                
                setFeaturedPosts(allPosts.slice(0, 2));
                setOtherPosts(allPosts.slice(2, 7));

            } catch (err) {
                console.error("Failed to fetch posts for Sea of Tranquility.", err);
                setFeaturedPosts([]);
                setOtherPosts([]);
            } finally {
                setIsLoading(false);
            }
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
                    <div className="space-y-4 lg:col-span-1">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-4 border rounded-lg bg-card/50">
                                <div className="flex items-start gap-4">
                                    <Skeleton className="h-24 w-24 shrink-0 rounded-md" />
                                    <div className="flex-1 flex flex-col h-24 justify-between">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-4/5" />
                                            <Skeleton className="h-3 w-full mt-1" />
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-border/50 mt-4 pt-3">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </div>
                                </div>
                            </div>
                        ))}
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
                        <div className="lg:col-span-1 flex flex-col gap-4">
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
