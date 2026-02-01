
'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { BbsPostCard } from './bbs-post-card';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


export function SeaOfTranquility() {
    const router = useRouter();
    const { t, language } = useTranslation();
    const [featuredPosts, setFeaturedPosts] = useState<BbsPost[]>([]);
    const [otherPosts, setOtherPosts] = useState<BbsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const locales = { en: enUS, zh: zhCN, th: th };
    const { toast } = useToast();
    const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                const allPosts = await getBbsPosts();
                
                // New logic: 2 featured posts, 5 other posts
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

    const handleInteraction = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        if (action) action();
    };

    const handleCommentClick = (e: React.MouseEvent, postId: string) => {
        handleInteraction(e, () => {
            router.push(`/bbs/${postId}#comments`);
        });
    };

    const handleLikeClick = (e: React.MouseEvent, postId: string) => {
        handleInteraction(e, () => {
            setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
        });
    };
    
    const handleViewsClick = (e: React.MouseEvent) => {
        handleInteraction(e);
    };

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
                    <div className="lg:col-span-2 grid grid-cols-1 gap-6">
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
                             <div key={i} className="flex items-center gap-4 p-2">
                                <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/3 mt-1" />
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
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {featuredPosts.map((post) => (
                                <BbsPostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                    
                    {otherPosts.length > 0 && (
                        <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
                            {otherPosts.map(post => {
                                const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
                                    addSuffix: true,
                                    locale: locales[language] || enUS
                                });
                                const isLiked = likedPosts[post.id];

                                return (
                                    <Link key={post.id} href={`/bbs/${post.id}`} className="group block h-full">
                                        <Card className="flex flex-col p-4 h-full bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 border border-border hover:border-primary/50">
                                            {post.images && post.images.length > 0 && (
                                                <div className="flex gap-2 mb-3">
                                                    {post.images.slice(0, 3).map((img, index) => (
                                                        <div key={index} className="aspect-square flex-1 relative overflow-hidden rounded-md">
                                                            <Image
                                                                src={img}
                                                                alt={`${post.title || t(post.titleKey || '')} image ${index + 1}`}
                                                                fill
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                                data-ai-hint={post.imageHints?.[index] || ''}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <h3 className="font-headline text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                                {post.title || t(post.titleKey || '')}
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-2 flex-grow">
                                                <span>{post.author.name}</span>
                                                <span className="mx-1.5">&middot;</span>
                                                <span>{timeAgo}</span>
                                                {post.location?.city && (
                                                    <>
                                                        <span className="mx-1.5">&middot;</span>
                                                        <span className="text-primary font-semibold">{post.location.city}</span>
                                                    </>
                                                )}
                                            </p>
                                            <div className="flex justify-start items-center gap-4 text-xs text-muted-foreground w-full mt-3 pt-3 border-t border-border/50">
                                                <button onClick={(e) => handleCommentClick(e, post.id)} className="flex items-center gap-1.5 z-10 hover:text-primary" title={`${post.replies} replies`}>
                                                    <MessageSquare className="h-4 w-4" />
                                                    <span>{post.replies}</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleLikeClick(e, post.id)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 z-10",
                                                        isLiked ? "text-yellow-400" : "hover:text-primary"
                                                    )}
                                                    title={`${post.likes} likes`}
                                                >
                                                    <ThumbsUp className="h-4 w-4" />
                                                    <span>{post.likes + (isLiked ? 1 : 0)}</span>
                                                </button>
                                                <button onClick={handleViewsClick} className="flex items-center gap-1.5 z-10 hover:text-primary" title={`${post.views} views`}>
                                                    <Eye className="h-4 w-4" />
                                                    <span>{post.views}</span>
                                                </button>
                                            </div>
                                        </Card>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
