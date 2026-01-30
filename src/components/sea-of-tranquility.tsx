'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ThumbsUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getBbsPosts } from '@/lib/data';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export function SeaOfTranquility() {
    const { t } = useTranslation();
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="bg-card/50 overflow-hidden">
                             <Skeleton className="aspect-video w-full" />
                             <div className="p-4 space-y-2">
                                 <Skeleton className="h-5 w-3/4" />
                                 <Skeleton className="h-4 w-full" />
                                 <Skeleton className="h-4 w-5/6" />
                             </div>
                             <div className="p-4 pt-0 flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                     <Skeleton className="h-6 w-6 rounded-full" />
                                     <Skeleton className="h-4 w-16" />
                                 </div>
                                 <Skeleton className="h-4 w-12" />
                             </div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {posts.map(post => (
                    <Link key={post.id} href={`/bbs/${post.id}`} className="group block h-full">
                        <Card className="bg-card/50 hover:bg-card/80 transition-colors duration-300 flex flex-col h-full overflow-hidden">
                            {post.images && post.images.length > 0 && (
                                <CardHeader className="p-0">
                                    <div className="aspect-video relative">
                                        <Image
                                            src={post.images[0]}
                                            alt={t(post.titleKey)}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            data-ai-hint={post.imageHints?.[0] || ''}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                    </div>
                                </CardHeader>
                            )}
                            <div className={`p-4 ${post.images && post.images.length > 0 ? "-mt-10 z-10 text-white" : ""}`}>
                                <CardTitle className="font-headline text-lg leading-tight transition-colors group-hover:text-primary line-clamp-2">{t(post.titleKey)}</CardTitle>
                            </div>
                        
                            <CardContent className="p-4 pt-0 text-sm text-muted-foreground flex-grow">
                                <p className="line-clamp-2">{t(post.contentKey)}</p>
                            </CardContent>

                            <CardFooter className="p-4 pt-0 flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate">{post.author.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <div className="flex items-center gap-1" title={`${post.replies} replies`}>
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        <span>{post.replies}</span>
                                    </div>
                                    <div className="flex items-center gap-1" title={`${post.likes} likes`}>
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                        <span>{post.likes}</span>
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    );
}
