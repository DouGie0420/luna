
'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Eye, Heart, MessageSquare, Star, TrendingUp, Edit, Trash2, MoreHorizontal, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { BbsPostCard } from './bbs-post-card';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createNotification } from '@/lib/notifications';


const locales = { en: enUS, zh: zhCN, th: th };

const SmallPostCardSkeleton = () => (
    <Card className="flex h-full flex-col justify-between bg-card/50">
        <CardContent className="p-5">
            <div className="flex items-start gap-4">
                <Skeleton className="h-28 w-28 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-3 w-4/5 mt-2" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
        </CardContent>
        <CardFooter className="p-5 pt-0 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7" />
                <Skeleton className="h-7 w-7" />
            </div>
        </CardFooter>
    </Card>
);


const SmallPostCard = React.memo(({ post }: { post: BbsPost }) => {
    const { t, language } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const canInteract = !!user;
    const hasAdminAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');

    const handleInteractionNotAllowed = () => {
        toast({
            variant: 'destructive',
            title: t('common.loginToInteract'),
        });
    };

    const handlePostInteraction = (e: React.MouseEvent, type: 'like' | 'favorite') => {
        e.preventDefault();
        e.stopPropagation();

        if (!canInteract || !firestore || !post || !user || !profile) {
            handleInteractionNotAllowed();
            return;
        }

        const isLiked = post.likedBy?.includes(user.uid);
        const isFavorited = post.favoritedBy?.includes(user.uid);
        const postRef = doc(firestore, 'bbs', post.id);
        
        let updateData = {};
        if (type === 'like') {
            updateData = {
                likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                likes: increment(isLiked ? -1 : 1)
            };
        } else { // favorite
            updateData = {
                favoritedBy: isFavorited ? arrayRemove(user.uid) : arrayUnion(user.uid),
                favorites: increment(isFavorited ? -1 : 1)
            };
            if (!isFavorited) {
                toast({ title: t('productCardActions.addedToFavorites') });
            }
        }

        updateDoc(postRef, updateData).then(() => {
            if(type === 'like' && !isLiked) {
                createNotification(firestore, post.authorId, { type: 'like-post', actor: profile, post });
            }
        }).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: postRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    const handleAdminAction = async (action: 'feature' | 'boost' | 'edit' | 'delete') => {
        if (!firestore || !profile) return;

        if (action === 'edit') {
            router.push(`/bbs/edit/${post.id}`);
        } else if (action === 'feature') {
            const postRef = doc(firestore, 'bbs', post.id);
            const newFeaturedState = !post.isFeatured;
            try {
                await updateDoc(postRef, { isFeatured: newFeaturedState });
                toast({
                    title: newFeaturedState ? "帖子已加精" : "帖子已取消精华",
                });
                 if (newFeaturedState) {
                    createNotification(firestore, post.authorId, { type: 'feature', actor: profile, post });
                }
            } catch (error) {
                console.error("Error updating feature status:", error);
                toast({
                    title: "操作失败",
                    description: "更新精华状态时出错。",
                    variant: "destructive",
                });
            }
        } else {
            toast({
                title: `Admin Action: ${action}`,
                description: "This feature is in development.",
            });
        }
    };

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

    const timeAgo = post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: locales[language] }) : '';

    const isLiked = user && post.likedBy?.includes(user.uid);
    const isFavorited = user && post.favoritedBy?.includes(user.uid);

    return (
        <Card className="relative flex h-full flex-col justify-between bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 border border-foreground/40">
            {hasAdminAccess && (
                <div className="absolute top-2 right-2 z-20">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => {e.preventDefault(); e.stopPropagation();}} className="h-7 w-7 rounded-full bg-black/50 text-white hover:bg-black/70">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                            <DropdownMenuItem onSelect={() => handleAdminAction('feature')}>
                                <Star className="mr-2 h-4 w-4" />
                                <span>{post.isFeatured ? "取消精华" : "加精华"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAdminAction('boost')}>
                                <TrendingUp className="mr-2 h-4 w-4" />
                                <span>加曝光</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => handleAdminAction('edit')}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>编辑</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleAdminAction('delete')} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>删除</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
            <Link href={`/bbs/${post.id}`} className="group block flex-grow">
                <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start gap-4">
                        <div className="w-28 h-28 relative overflow-hidden rounded-md shrink-0">
                            <img
                                src={post.images?.[0] || 'https://picsum.photos/seed/default-bbs/200/200'}
                                alt={post.title || t(post.titleKey || '')}
                                className="object-cover w-full h-full"
                                data-ai-hint={post.imageHints?.[0] || ''}
                                loading="lazy"
                            />
                        </div>
                        <div className="flex-1 flex flex-col self-stretch">
                            <div className="flex-grow">
                                <h3 className="font-headline text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                    {post.title || t(post.titleKey || '')}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-4">{summary}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Link>
            <CardFooter className="p-5 pt-0 flex justify-between items-center">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs">
                        <p className="font-semibold text-foreground truncate">{post.author.name}</p>
                        <p className="text-muted-foreground truncate">
                            {timeAgo}{post.location?.city && `, ${post.location.city}, ${post.location.countryCode}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handlePostInteraction(e, 'like')}>
                        <Heart className={cn("h-4 w-4", isLiked && "text-yellow-400 fill-yellow-400")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handlePostInteraction(e, 'favorite')}>
                        <Star className={cn("h-4 w-4", isFavorited && "text-yellow-400 fill-yellow-400")} />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
});
SmallPostCard.displayName = 'SmallPostCard';

export function SeaOfTranquility() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const postsQuery = useMemo(() => 
        firestore 
        ? query(collection(firestore, 'bbs'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(7)) 
        : null, 
    [firestore]);

    const { data: posts, loading: isLoading } = useCollection<BbsPost>(postsQuery);

    const handleGuestClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            toast({
                title: '需要认证',
                description: '请先登录或注册以访问更多内容。',
                variant: 'destructive'
            });
        }
    }

    const featuredPosts = posts?.slice(0, 2) || [];
    const otherPosts = posts?.slice(2, 7) || [];
    
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
                            <Skeleton className="aspect-[1.8/1] w-full" />
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3">
                            <Skeleton className="aspect-[1.8/1] w-full" />
                            <div className="space-y-2 p-4">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        </div>
                    </div>
                    {/* Other Posts Skeleton */}
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        {[...Array(5)].map((_, i) => <SmallPostCardSkeleton key={i} />)}
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
                    <Link href="/bbs" onClick={handleGuestClick}>
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
                         <div className="lg:col-span-1 flex flex-col gap-4 justify-between">
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
