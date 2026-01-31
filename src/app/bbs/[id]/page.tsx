'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { getBbsPostById, getUsers } from '@/lib/data';
import type { BbsPost, User } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ThumbsUp, Star, Share2, Plus, MessageSquare, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { BbsPostImageGallery } from '@/components/bbs-post-image-gallery';

const locales = { en: enUS, zh: zhCN, th: th };

// Placeholder comments
const initialComments = [
    { user: 'user2', text: '这看起来太棒了！你的外壳是在哪里买的？', time: '2小时前' },
    { user: 'user3', text: '很棒的教程！对新手来说超级有用。', time: '1小时前' },
    { user: 'user6', text: '喜欢这种霓虹美学。我下一个作品可能会试试。', time: '45分钟前' },
    { user: 'user7', text: '可以分享一下键帽的链接吗？', time: '30分钟前' },
];

function PostPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Card>
                <div className="p-4 border-b">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                </div>
                <div className="p-6 space-y-6">
                    <Skeleton className="h-8 w-4/5" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="aspect-video w-full rounded-xl" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
                <div className="p-4 border-t">
                     <Skeleton className="h-10 w-full" />
                </div>
            </Card>
        </div>
    );
}


export default function BbsPostPage() {
    const params = useParams();
    const { t, language } = useTranslation();
    const { toast } = useToast();
    const [post, setPost] = useState<BbsPost | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const { user, profile } = useUser();
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const id = typeof params.id === 'string' ? params.id : '';

    useEffect(() => {
        if (!id) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const [postData, usersData] = await Promise.all([
                    getBbsPostById(id),
                    getUsers()
                ]);

                if (!postData) {
                    // This will trigger the not-found UI
                    return;
                }
                setPost(postData);
                setUsers(usersData);
            } catch (error) {
                console.error("Failed to fetch post data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleShare = () => {
        const postUrl = window.location.href;
        navigator.clipboard.writeText(postUrl);
        toast({
            title: t('bbsPage.linkCopied'),
        });
    };

    const handlePostComment = () => {
        if (!newComment.trim()) return;
        if (!user) {
            toast({
                variant: 'destructive',
                title: t('productComments.cannotCommentTitle'),
                description: t('productComments.loginToComment_link') + ' ' + t('productComments.loginToComment_text'),
            });
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            const newCommentObject = {
                user: user.uid,
                text: newComment,
                time: '刚刚',
            };
            setComments(prev => [newCommentObject, ...prev]);
            setNewComment('');
            setIsSubmitting(false);
            toast({ title: t('productComments.commentPosted') });
        }, 500);
    };

    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <PostPageSkeleton />
            </>
        );
    }
    
    if (!post) {
        return notFound();
    }
    
    const postDate = new Date(post.createdAt);
    const timeAgo = formatDistanceToNow(postDate, { addSuffix: true, locale: locales[language] || enUS });

    const getUserById = (userId: string) => {
        if (user && userId === user.uid) {
            return {
                id: user.uid,
                name: profile?.displayName || user.displayName || 'You',
                avatarUrl: profile?.photoURL || user.photoURL || '',
            } as User;
        }
        return users.find(u => u.id === userId);
    };

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <Card className="w-full overflow-hidden shadow-2xl shadow-primary/10">
                    
                    {/* Author Header */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <Link href={`/user/${post.author.id}`} className="flex items-center gap-3 group">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                                <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold group-hover:underline">{post.author.name}</p>
                                <p className="text-xs text-muted-foreground">{timeAgo}</p>
                            </div>
                        </Link>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            关注
                        </Button>
                    </div>

                     {/* Content */}
                    <div className="p-6">
                        <h1 className="font-headline text-3xl font-bold mb-4">{t(post.titleKey)}</h1>

                        {post.images && post.images.length > 0 && (
                            <div className="my-6">
                                <BbsPostImageGallery post={post} />
                            </div>
                        )}

                        <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{t(post.contentKey)}</p>

                        <div className="flex flex-wrap gap-2 mt-6">
                        {post.tags.map(tag => (
                            <Badge key={tag} variant="secondary">#{tag}</Badge>
                        ))}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground mt-4 pt-4 border-t border-border/20">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(postDate, 'PPP')}</span>
                            </div>
                            {post.author.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{post.author.location.city}, {post.author.location.countryCode}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Comments */}
                     <div id="comments" className="px-6 pb-6 scroll-mt-24">
                        <Separator className="my-6" />
                        <div className="space-y-6">
                            <p className="text-lg font-semibold">{comments.length} 条评论</p>
                            {comments.map((comment, index) => {
                                const user = getUserById(comment.user);
                                return user ? (
                                    <div key={index} className="flex items-start gap-3">
                                        <Link href={`/user/${user.id}`}>
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <Link href={`/user/${user.id}`}>
                                                    <span className="text-sm font-semibold text-muted-foreground hover:underline">{user.name}</span>
                                                </Link>
                                                <p className="text-xs text-muted-foreground">{comment.time}</p>
                                            </div>
                                            <p className="text-sm">{comment.text}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })}
                        </div>
                    </div>
                    
                    {/* Actions Footer */}
                    <div className="sticky bottom-0 p-4 border-t bg-card/80 backdrop-blur-sm z-20">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder={t('productComments.placeholder')}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handlePostComment();
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button onClick={handlePostComment} disabled={isSubmitting || !newComment.trim()}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('productComments.submit')}
                            </Button>
                        </div>
                    </div>

                </Card>
            </div>
        </>
    );
}
