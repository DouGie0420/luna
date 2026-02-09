
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, Star, ShieldCheck, MoreHorizontal, TrendingUp, Edit, Trash2, Heart, MapPin, Share2 } from 'lucide-react';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { createNotification } from '@/lib/notifications';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.038 24l7.07-13.34-7.07 4.545-7.07-4.545L12.038 24zM12.038 0L4.968 10.66l7.07 4.545 7.07-4.545L12.038 0z"/>
    </svg>
);

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
    
    const handleMarkForReview = () => {
        if (!firestore) return;
        setIsDeleteDialogOpen(false); // Close dialog immediately to prevent UI freeze

        const postRef = doc(firestore, 'bbs', post.id);
        const updateData = { status: 'under_review' as const };

        updateDoc(postRef, updateData)
            .then(() => {
                setTimeout(() => { // Defer toast to avoid render-while-rendering error
                    toast({
                        title: "帖子已提交审核",
                        description: "该帖子现在将在后台等待最终审核。",
                    });
                }, 0);
            })
            .catch(serverError => {
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
              title: newFeaturedState ? "帖子已加精" : "帖子已取消精华",
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
            const permissionError = new FirestorePermissionError({
              path: postRef.path,
              operation: 'update',
              requestResourceData: { isFeatured: newFeaturedState },
            });
            errorEmitter.emit('permission-error', permissionError);
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
            .catch(serverError => {
                const permissionError = new FirestorePermissionError({
                    path: postRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
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
                        <AlertDialogTitle>确认提交审核</AlertDialogTitle>
                        <AlertDialogDescription>
                           此操作会将帖子从前台隐藏并提交给管理员审核。您确定吗？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleMarkForReview} className="bg-destructive hover:bg-destructive/90">确认提交</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Link href={`/bbs/${post.id}`} className="group block h-full">
                <Card className="h-full flex flex-col bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 hover:shadow-primary/20 hover:shadow-lg hover:scale-105 border border-foreground/10 hover:border-primary/50">
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
                    </CardHeader>
                    <div className="p-4 -mt-16 z-10 text-white">
                         <CardTitle className="font-headline text-lg mb-2 leading-tight drop-shadow-md">
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
                                className="relative cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    router.push(authorProfileUrl);
                                }}
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                                    <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {post.author.isNftVerified ? (
                                    <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-black/80 p-0.5 backdrop-blur-sm">
                                        <EthereumIcon className="h-3 w-3 text-cyan-400" />
                                    </div>
                                ) : post.author.isWeb3Verified ? (
                                    <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-black/80 p-0.5 backdrop-blur-sm">
                                        <ShieldCheck className="h-3 w-3 text-blue-400" />
                                    </div>
                                ) : post.author.kycStatus === 'Verified' && (
                                    <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-black/80 p-0.5 backdrop-blur-sm">
                                        <ShieldCheck className="h-3 w-3 text-cyan-400" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-headline text-foreground">{post.author.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {timeAgo}{post.location?.city && ` · ${post.location.city}, ${post.location.countryCode}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoToComments}>
                                 <span className="flex items-center gap-1 cursor-pointer">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{post.replies}</span>
                                </span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handlePostInteraction(e, 'like')}>
                                <Heart className={cn("h-4 w-4", isLiked && "text-yellow-400 fill-yellow-400")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handlePostInteraction(e, 'favorite')}>
                                <Star className={cn("h-4 w-4", isFavorited && "text-yellow-400 fill-yellow-400")} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShare}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </Link>
        </>
    )
}
