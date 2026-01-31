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
    const [posts, setPosts] = useState<BbsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const locales = { en: enUS, zh: zhCN, th: th };
    const { toast } = useToast();
    const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            const fetchedPosts = await getBbsPosts();
            setPosts(fetchedPosts.slice(0, 4));
            setIsLoading(false);
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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {/* Main Post Skeleton */}
                    <div className="flex flex-col space-y-3">
                        <Skeleton className="aspect-video w-full" />
                        <div className="space-y-2 p-4">
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                    {/* Other Posts Skeleton */}
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
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
    
    const [featuredPost, ...otherPosts] = posts;

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
            
             {posts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {featuredPost && (
                        <div className="md:col-span-1">
                            <BbsPostCard post={featuredPost} />
                        </div>
                    )}
                    
                    {otherPosts.length > 0 && (
                        <div className="md:col-span-1 flex flex-col gap-4 justify-between">
                            {otherPosts.map(post => {
                                const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
                                    addSuffix: true,
                                    locale: locales[language] || enUS
                                });
                                const isLiked = likedPosts[post.id];

                                return (
                                    <Link key={post.id} href={`/bbs/${post.id}`} className="group block flex-1">
                                        <Card className="flex flex-col p-4 h-full bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 border border-border hover:border-primary/50">
                                            <div className="flex items-start gap-4 flex-grow">
                                                {post.images && post.images.length > 0 && (
                                                    <div className="aspect-square w-20 md:w-24 relative shrink-0 overflow-hidden rounded-md">
                                                        <Image
                                                            src={post.images[0]}
                                                            alt={t(post.titleKey)}
                                                            fill
                                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            data-ai-hint={post.imageHints?.[0] || ''}
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h3 className="font-headline text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">{t(post.titleKey)}</h3>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        <span>{post.author.name}</span>
                                                        <span className="mx-1.5">&middot;</span>
                                                        <span>{timeAgo}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end items-center gap-4 text-xs text-muted-foreground w-full mt-3 pt-3 border-t border-border/50">
                                                <Button variant="ghost" size="sm" onClick={(e) => handleCommentClick(e, post.id)} className="flex items-center gap-1.5 z-10 hover:text-primary p-1 h-auto text-xs text-muted-foreground" title={`${post.replies} replies`}>
                                                    <MessageSquare className="h-4 w-4" />
                                                    <span>{post.replies}</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => handleLikeClick(e, post.id)}
                                                    className={cn(
                                                        "p-1 h-auto text-xs text-muted-foreground rounded-md",
                                                        isLiked ? "bg-yellow-400 text-black hover:bg-yellow-500" : "hover:text-primary"
                                                    )}
                                                    title={`${post.likes} likes`}
                                                >
                                                    <ThumbsUp className="h-4 w-4 mr-1" />
                                                    <span>{post.likes + (isLiked ? 1 : 0)}</span>
                                                </Button>
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
