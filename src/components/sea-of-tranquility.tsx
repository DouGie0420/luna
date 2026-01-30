'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, ThumbsUp, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';

const locales = { en: enUS, zh: zhCN, th: th };

export function SeaOfTranquility() {
    const { t, language } = useTranslation();
    const { toast } = useToast();
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

    const handleComingSoon = (e: React.MouseEvent) => {
        e.preventDefault();
        toast({
            title: t('productCardActions.featureComingSoon'),
        });
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="bg-card/50">
                             <CardHeader><Skeleton className="h-10 w-4/5" /></CardHeader>
                             <CardFooter><Skeleton className="h-8 w-3/5 ml-auto" /></CardFooter>
                        </Card>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map(post => {
                    const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
                        addSuffix: true,
                        locale: locales[language] || enUS
                    });
                    
                    return (
                        <Link key={post.id} href={`/bbs/${post.id}`} className="group block h-full">
                            <Card className="bg-card/50 hover:bg-card/80 transition-colors duration-300 flex flex-col h-full">
                                <CardHeader>
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                                            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <CardTitle className="font-headline text-lg leading-tight transition-colors group-hover:text-primary">{t(post.titleKey)}</CardTitle>
                                            <div className="mt-2">
                                                <p className="text-sm font-semibold text-muted-foreground">{post.author.name}</p>
                                                <div className="flex items-center flex-wrap gap-x-2 text-xs text-muted-foreground">
                                                    <span>{timeAgo}</span>
                                                    {post.author.location && (
                                                        <>
                                                            <span className="text-muted-foreground/50">•</span>
                                                            <div className="flex items-center gap-1">
                                                                <MapPin className="h-3 w-3" />
                                                                <span>{post.author.location.city}, {post.author.location.countryCode}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow" />
                                <CardFooter>
                                    <div className="flex justify-end items-center gap-2 text-sm text-muted-foreground w-full">
                                        <Button variant="ghost" size="sm" onClick={handleComingSoon} className="relative z-10 flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                            <MessageSquare className="h-4 w-4" />
                                            <span>{post.replies}</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={handleComingSoon} className="relative z-10 flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                            <ThumbsUp className="h-4 w-4" />
                                            <span>{post.likes}</span>
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={handleComingSoon} className="relative z-10 flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                            <Star className="h-4 w-4" />
                                            <span>{post.favorites || 0}</span>
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </section>
    );
}
