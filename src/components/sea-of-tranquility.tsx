'use client';

import { useTranslation } from '@/hooks/use-translation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ThumbsUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Placeholder data for BBS posts
const placeholderPosts = [
    {
        id: 'post1',
        title: 'seaOfTranquility.post1.title',
        author: { name: 'Cypher', avatar: 'https://picsum.photos/seed/bbsuser1/100/100' },
        replies: 28,
        likes: 105,
    },
    {
        id: 'post2',
        title: 'seaOfTranquility.post2.title',
        author: { name: 'Glitch', avatar: 'https://picsum.photos/seed/bbsuser2/100/100' },
        replies: 15,
        likes: 72,
    },
    {
        id: 'post3',
        title: 'seaOfTranquility.post3.title',
        author: { name: 'NeonRider', avatar: 'https://picsum.photos/seed/bbsuser3/100/100' },
        replies: 42,
        likes: 159,
    },
    {
        id: 'post4',
        title: 'seaOfTranquility.post4.title',
        author: { name: '8-Bit', avatar: 'https://picsum.photos/seed/bbsuser4/100/100' },
        replies: 9,
        likes: 54,
    },
];

export function SeaOfTranquility() {
    const { t } = useTranslation();

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
                {placeholderPosts.map(post => (
                    <Card key={post.id} className="bg-card/50 hover:bg-card/80 transition-colors duration-300">
                        <CardHeader>
                             <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={post.author.avatar} alt={post.author.name} />
                                    <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="font-headline text-lg leading-tight">{t(post.title)}</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">{t('seaOfTranquility.postedBy')} {post.author.name}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex justify-end items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <ThumbsUp className="h-4 w-4" />
                                    <span>{post.likes}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Star className="h-4 w-4" />
                                    <span>{post.replies}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </section>
    );
}
