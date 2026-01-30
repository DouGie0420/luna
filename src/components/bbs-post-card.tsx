'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import type { BbsPost } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';

const locales = { en: enUS, zh: zhCN, th: th };

export function BbsPostCard({ post }: { post: BbsPost }) {
    const { t, language } = useTranslation();
    
    const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
        addSuffix: true,
        locale: locales[language] || enUS
    });

    return (
        <Link href={`/bbs/${post.id}`} className="group block h-full">
            <Card className="h-full flex flex-col bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 hover:shadow-lg hover:scale-105 border border-border hover:border-primary/50">
                {post.featuredImage && (
                    <CardHeader className="p-0">
                        <div className="aspect-video relative overflow-hidden">
                            <Image
                                src={post.featuredImage}
                                alt={t(post.titleKey)}
                                fill
                                className="object-cover"
                                data-ai-hint={post.featuredImageHint || ''}
                            />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                    </CardHeader>
                )}
                <div className={post.featuredImage ? "p-4 -mt-16 z-10 text-white" : "p-4"}>
                     <CardTitle className="font-headline text-xl mb-2 leading-tight">
                        {t(post.titleKey)}
                    </CardTitle>
                    <div className="flex gap-1.5 flex-wrap">
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
                        <div className="flex items-center gap-1.5" title={`${post.replies} replies`}>
                            <MessageSquare className="h-4 w-4" />
                            <span>{post.replies}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={`${post.likes} likes`}>
                            <ThumbsUp className="h-4 w-4" />
                            <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={`${post.views} views`}>
                            <Eye className="h-4 w-4" />
                            <span>{post.views}</span>
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    )
}
