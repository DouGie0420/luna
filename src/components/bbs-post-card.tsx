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
import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';


const locales = { en: enUS, zh: zhCN, th: th };

export function BbsPostCard({ post }: { post: BbsPost }) {
    const router = useRouter();
    const { t, language } = useTranslation();
    const { user } = useUser();
    const firestore = useFirestore();

    const isLiked = user ? post.likedBy?.includes(user.uid) : false;
    
    const timeAgo = post.createdAt ? formatDistanceToNow(new Date(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt), {
        addSuffix: true,
        locale: locales[language] || enUS
    }) : '';

    const summary = useMemo(() => {
        const content = post.content || t(post.contentKey || '');
        // Remove markdown for images and videos for a cleaner summary
        return content
            .replace(/!\[.*?\]\(.*?\)/g, '') // Remove image markdown
            .replace(/\[(youtube|tiktok)\]\(.*?\)/g, '') // Remove video markdown
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join(' ')
            .trim();
    }, [post.content, post.contentKey, t]);

    const handleInteraction = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        e.preventDefault();
        if (action) action();
    };

    const handleCommentClick = (e: React.MouseEvent) => {
        handleInteraction(e, () => {
            router.push(`/bbs/${post.id}#comments`);
        });
    };

    const handleLikeClick = async (e: React.MouseEvent) => {
        handleInteraction(e);
        if (!user || !firestore) {
            // Optionally, show a toast to prompt login
            return;
        }

        const postRef = doc(firestore, 'bbs', post.id);
        try {
            await updateDoc(postRef, {
                likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                likes: increment(isLiked ? -1 : 1),
            });
        } catch (error) {
            console.error("Failed to update like status", error);
        }
    };
    
    const handleViewsClick = (e: React.MouseEvent) => {
        handleInteraction(e);
    };

    return (
        <Link href={`/bbs/${post.id}`} className="group block h-full">
            <Card className="h-full flex flex-col bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 hover:shadow-lg hover:scale-105 border border-border hover:border-primary/50">
                {post.images && post.images.length > 0 && (
                    <CardHeader className="p-0">
                        <div className="aspect-video relative overflow-hidden">
                            <Image
                                src={post.images[0]}
                                alt={post.title || t(post.titleKey || '')}
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
                        {post.title || t(post.titleKey || '')}
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
                    <p className="line-clamp-3">{summary}</p>
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
                        <Button variant="ghost" size="sm" onClick={handleCommentClick} className="flex items-center gap-1.5 z-10 hover:text-primary p-1 h-auto text-xs text-muted-foreground" title={`${post.replies} replies`}>
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.replies}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLikeClick}
                            className={cn(
                                "p-1 h-auto text-xs text-muted-foreground rounded-md",
                                isLiked ? "bg-yellow-400 text-black hover:bg-yellow-500" : "hover:text-primary"
                            )}
                            title={`${post.likes} likes`}
                        >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            <span>{post.likes}</span>
                        </Button>
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
