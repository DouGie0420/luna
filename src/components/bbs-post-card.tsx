'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, Star, MoreHorizontal, TrendingUp, Edit, Trash2, Heart, MapPin, Share2 } from 'lucide-react';
import type { BbsPost, UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { formatDistanceToNow } from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';
import { UserAvatar } from './ui/user-avatar';


export function BbsPostCard({ post }: { post: BbsPost }) {
    const { t } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const hasAdminAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');
    const canInteract = !!user;

    const timeAgo = post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : '';

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
    
    const handleMarkForReview = async () => {
        if (!firestore) return;
        
        try {
            const postRef = doc(firestore, 'bbs', post.id);
            await updateDoc(postRef, { status: 'under_review' });
            setIsDeleteDialogOpen(false);
            toast({
                title: t('bbsPostCard.postSubmittedForReview'),
                description: t('bbsPostCard.postSubmittedForReviewDescription'),
            });
        } catch (error) {
            console.error("Error marking post for review:", error);
            toast({
                title: t('bbsPostCard.actionFailed'),
                description: t('bbsPostCard.actionFailedDescription'),
                variant: "destructive",
            });
        }
    };
    
    const handleAdminAction = async (action: 'feature' | 'boost' | 'edit' | 'delete') => {
      if (!firestore || !profile) return;

      if (action === 'edit') {
          router.push(`/bbs/edit/${post.id}`);
          return;
      }
      
      if (action === 'delete') {
        setIsDeleteDialogOpen(true);
        return;
      }

      if (action === 'feature') {
          const postRef = doc(firestore, 'bbs', post.id);
          const newFeaturedState = !post.isFeatured;
          try {
            await updateDoc(postRef, { isFeatured: newFeaturedState });
            toast({
              title: newFeaturedState ? t('bbsPostCard.postFeatured') : t('bbsPostCard.postUnfeatured'),
            });
            if (newFeaturedState) {
                createNotification(firestore, post.authorId, {
                    type: 'feature',
                    actor: profile,
                    post: post,
                });
            }
          } catch (error) {
            console.error("Error updating feature status:", error);
            toast({
              title: t('bbsPostCard.actionFailed'),
              description: t('bbsPostCard.featureError'),
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

        updateDoc(postRef, updateData)
            .then(() => {
                if(type === 'like' && !isLiked) {
                    createNotification(firestore, post.authorId, { type: 'like-post', actor: profile, post });
                }
            })
            .catch(error => {
                console.error(`Failed to update ${type}:`, error);
                toast({
                    title: t('bbsPostCard.actionFailed'),
                    variant: "destructive",
                });
            });
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const postUrl = `${window.location.origin}/bbs/${post.id}`;
        navigator.clipboard.writeText(postUrl);
        toast({
            title: t('bbsPage.linkCopied'),
        });
    };

    const handleGoToComments = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/bbs/${post.id}#comments`);
    };

    const isLiked = user && post.likedBy?.includes(user.uid);
    const isFavorited = user && post.favoritedBy?.includes(user.uid);
    const authorProfileUrl = `/@${post.author.loginId || post.author.id}`;

    return (
        <>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('bbsPostCard.submitForReview')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('bbsPostCard.submitForReviewDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('bbsPostCard.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkForReview} className="bg-destructive hover:bg-destructive/90">{t('bbsPostCard.confirmSubmit')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* 🚀 终极修复：彻底抛弃 Link，改用带 onClick 的 div 编程式导航，完美避开 HTML 嵌套地雷！ */}
            <div onClick={() => router.push(`/bbs/${post.id}`)} className="group block h-full cursor-pointer">
                <Card className="h-full flex flex-col bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 hover:shadow-lg hover:scale-105 border-2 border-white/60 hover:border-primary">
                    <CardHeader className="p-0 relative">
                        <div className="aspect-[1.8/1] relative overflow-hidden">
                            <img
                                src={post.images?.[0] || 'https://picsum.photos/seed/default-bbs/800/600'}
                                alt={post.title || t(post.titleKey || '')}
                                className="object-cover w-full h-full"
                                data-ai-hint={post.imageHints?.[0] || ''}
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                        {hasAdminAccess && (
                            <div className="absolute top-2 right-2 z-20">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={(e) => {e.preventDefault(); e.stopPropagation();}} className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                                        <DropdownMenuItem onSelect={() => handleAdminAction('feature')}>
                                            <Star className="mr-2 h-4 w-4" />
                                            <span>{post.isFeatured ? t('bbsPostCard.unfeaturePost') : t('bbsPostCard.featurePost')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleAdminAction('boost')}>
                                            <TrendingUp className="mr-2 h-4 w-4" />
                                            <span>{t('bbsPostCard.boostPost')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => handleAdminAction('edit')}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>{t('bbsPostCard.editPost')}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleAdminAction('delete')} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>{t('bbsPostCard.deletePost')}</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </CardHeader>
                    <div className="p-4 -mt-16 z-10 text-white">
                         <CardTitle className="font-bold text-lg mb-2 leading-tight drop-shadow-md not-italic">
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
                                <Badge key={tag} variant="secondary" className="text-xs bg-white/10 text-white/80 border-white/20">{tag}</Badge>
                            ))}
                        </div>
                    </div>

                    <CardContent className="p-4 pt-2 text-sm text-muted-foreground flex-grow line-clamp-3">
                        <p>{summary}</p>
                    </CardContent>

                    <CardFooter className="p-4 flex justify-between items-end">
                        <div className="flex items-center gap-3">
                             <div
                                className="relative cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    router.push(authorProfileUrl);
                                }}
                            >
                                <UserAvatar profile={post.author} className="h-8 w-8" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold not-italic text-foreground">{post.author.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {timeAgo}{post.location?.city && `, ${post.location.city}, ${post.location.countryCode}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {post.views != null && (
                                <span className="flex items-center gap-1 px-1.5 py-1">
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>{post.views}</span>
                                </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoToComments}>
                                <span className="flex items-center gap-1 cursor-pointer">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    <span>{post.comments ?? 0}</span>
                                </span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 px-2 w-auto" onClick={(e) => handlePostInteraction(e, 'like')}>
                                <span className="flex items-center gap-1">
                                    <Heart className={cn("h-3.5 w-3.5", isLiked && "text-yellow-400 fill-yellow-400")} />
                                    <span>{post.likes ?? 0}</span>
                                </span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 px-2 w-auto" onClick={(e) => handlePostInteraction(e, 'favorite')}>
                                <span className="flex items-center gap-1">
                                    <Star className={cn("h-3.5 w-3.5", isFavorited && "text-yellow-400 fill-yellow-400")} />
                                    <span>{post.favorites ?? 0}</span>
                                </span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShare}>
                                <Share2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </>
    )
}