'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Eye, Star } from 'lucide-react';
import type { BbsPost } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { useRouter } from 'next/navigation';

const locales = { en: enUS, zh: zhCN, th: th };

export function BbsPostCard({ post }: { post: BbsPost }) {
    const router = useRouter();
    const { t, language } = useTranslation();
    const { toast } = useToast();
    
    const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
        addSuffix: true,
        locale: locales[language] || enUS
    });

    const handleInteraction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        action();
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        handleInteraction(e, () => {
            router.push(`/bbs/${post.id}#comments`);
        });
    };

    const handleLikeClick = (e: React.MouseEvent) => {
        handleInteraction(e, () => {
            toast({
                title: t('bbsPage.thankYouForLike'),
            });
        });
    };
    
    const handleViewsClick = (e: React.MouseEvent) => {
        handleInteraction(e, () => {
            toast({
                title: t('productCardActions.featureComingSoon'),
            });
        });
    };

    return (
        <Link href={`/bbs/${post.id}`} className="group block h-full">
            <Card className="h-full flex flex-col bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 hover:shadow-lg hover:scale-105 border border-border hover:border-primary/50">
                {post.images && post.images.length > 0 && (
                    <CardHeader className="p-0">
                        <div className="aspect-video relative overflow-hidden">
                            <Image
                                src={post.images[0]}
                                alt={t(post.titleKey)}
                                fill
                                className="object-cover"
                                data-ai-hint={post.imageHints?.[0] || ''}
                            />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                    </CardHeader>
                )}
                <div className={post.images && post.images.length > 0 ? "p-4 -mt-16 z-10 text-white" : "p-4"}>
                     <CardTitle className="font-headline text-xl mb-2 leading-tight">
                        {t(post.titleKey)}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {post.isFeatured && (
                            <Badge variant="outline" className="text-xs border-amber-400/50 bg-amber-400/10 text-amber-300">
                                <Star className="mr-1 h-3 w-3 fill-amber-300" />
                                {t('bbsPage.featuredBadge')}
                            </Badge>
                        )}
                        {post.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                    </div>
                </div>

                <CardContent className="p-4 pt-2 text-sm text-muted-foreground flex-grow">
                    <p className="line-clamp-3">{t(post.contentKey)}</p>
                </CardContent>

                <CardFooter className="p-4 flex flex-col items-start gap-4">
                     <div className="flex items-center gap-3 w-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{post.author.name}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                    </div>
                    <div className="flex justify-end items-center gap-4 text-xs text-muted-foreground w-full">
                        <button onClick={handleCommentClick} className="flex items-center gap-1.5 z-10 hover:text-primary" title={`${post.replies} replies`}>
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.replies}</span>
                        </button>
                        <button onClick={handleLikeClick} className="flex items-center gap-1.5 z-10 hover:text-primary" title={`${post.likes} likes`}>
                            <ThumbsUp className="h-4 w-4" />
                            <span>{post.likes}</span>
                        </button>
                        <button onClick={handleViewsClick} className="flex items-center gap-1.5 z-10 hover:text-primary" title={`${post.views} views`}>
                            <Eye className="h-4 w-4" />
                            <span>{post.views}</span>
                        </button>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}
