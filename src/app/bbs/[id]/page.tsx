

'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { Loader2, Plus, MessageSquare, Calendar, X, MoreHorizontal, Edit, Trash2, Check, Reply, ThumbsUp, ThumbsDown, MapPin, Star, Heart } from 'lucide-react';
import { doc, collection, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { BbsPost, UserProfile, Comment as CommentType } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { BbsPostImageGallery } from '@/components/bbs-post-image-gallery';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const locales = { en: enUS, zh: zhCN, th: th };

type NestedComment = CommentType & {
    replies: NestedComment[];
};

const COMMENTS_INITIAL_LOAD = 10;
const COMMENTS_LOAD_MORE = 10;

function PostPageSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <Card>
                    <div className="p-4 border-b">
                        <div className="flex items-start gap-4">
                            <Skeleton className="h-20 w-20 rounded-full" />
                            <div className="flex-1 space-y-3 pt-1">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-64" />
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
        </>
    );
}

const CommentForm = ({
  isSubmitting,
  value,
  onChange,
  onSubmit,
  onCancelClick,
}: {
  isSubmitting: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: () => void
  onCancelClick: () => void
}) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={t('productComments.placeholder')}
        maxLength={2000}
        rows={3}
        autoFocus
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{value.length} / 2000</p>
        <div className="flex items-center gap-2">
          <Button onClick={onSubmit} disabled={isSubmitting || !value.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('productComments.submit')}
          </Button>
          <Button variant="default" onClick={onCancelClick}>
            {t('productComments.cancelReply')}
          </Button>
        </div>
      </div>
    </div>
  )
}

const CommentItem = ({
  comment,
  user,
  canInteract,
  handleLikeDislike,
  setReplyingTo,
  handleInteractionNotAllowed,
  setCommentToDelete
}: {
  comment: NestedComment;
  user: FirebaseUser | null;
  canInteract: boolean;
  handleLikeDislike: (commentId: string, isLiked: boolean, isDisliked: boolean, type: 'like' | 'dislike') => void;
  setReplyingTo: React.Dispatch<React.SetStateAction<{ id: string; authorName: string; } | null>>;
  handleInteractionNotAllowed: () => void;
  setCommentToDelete: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const firestore = useFirestore();
  const { t, language } = useTranslation();
  const { data: author } = useDoc<UserProfile>(firestore ? doc(firestore, 'users', comment.authorId) : null);
  const timeAgo = comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: locales[language] }) : '';
  const isLiked = user ? comment.likedBy?.includes(user.uid) : false;
  const isDisliked = user ? comment.dislikedBy?.includes(user.uid) : false;

  return (
    <div className="flex items-start gap-3">
        <Link href={`/user/${author?.uid || comment.authorId}`}>
            <Avatar className="h-10 w-10">
                {author?.photoURL && <AvatarImage src={author.photoURL} alt={author.displayName} />}
                <AvatarFallback>{author?.displayName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
        </Link>
        <div className="flex-1">
             <div className="flex items-center justify-between">
                <div>
                    <span className="font-semibold text-foreground">{author?.displayName}</span>
                    {author?.location && <p className="text-xs text-muted-foreground inline ml-2">{author.location}</p>}
                </div>
                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                    <Button
                        variant="ghost"
                        onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'like')}
                        className={cn("h-auto p-1.5 rounded-md text-xs flex items-center gap-1.5 hover:bg-accent", isLiked && "text-yellow-400")}
                    >
                        <Heart className={cn("h-4 w-4", isLiked && "fill-yellow-400")} />
                        <span>{comment.likes || 0}</span>
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'dislike')}
                        className={cn("h-auto p-1.5 rounded-md text-xs flex items-center gap-1.5 hover:bg-accent", isDisliked && "text-gray-500")}
                    >
                        <ThumbsDown className="h-4 w-4" />
                        <span>{comment.dislikes || 0}</span>
                    </Button>
                    <span>{timeAgo}</span>
                </div>
            </div>
            <p className="text-sm my-2 text-foreground/90">{comment.text}</p>
            <div className="flex items-center justify-start gap-2">
               <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: author?.displayName || 'User' }) : handleInteractionNotAllowed()}
                >
                    <Reply className="mr-1 h-3 w-3 -scale-x-100" />
                    {t('productComments.reply')}
                </Button>
                 {user?.uid === comment.authorId && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => setCommentToDelete(comment.id)}
                    >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {t('productComments.delete')}
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
};


export default function BbsPostPage() {
    const params = useParams();
    const router = useRouter();
    const { t, language } = useTranslation();
    const { toast } = useToast();
    const firestore = useFirestore();

    const { user, profile } = useUser();
    
    const id = typeof params.id === 'string' ? params.id : '';

    const postRef = useMemo(() => firestore && id ? doc(firestore, 'bbs', id) : null, [firestore, id]);
    const { data: post, loading: postLoading, error: postError } = useDoc<BbsPost>(postRef);

    const commentsQuery = useMemo(() => firestore && id ? query(collection(firestore, 'bbs', id, 'comments'), orderBy('createdAt', 'desc')) : null, [firestore, id]);
    const { data: comments, loading: commentsLoading } = useCollection<CommentType>(commentsQuery);

    const { data: authorProfile } = useDoc<UserProfile>(firestore && post ? doc(firestore, 'users', post.authorId) : null);
    
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_INITIAL_LOAD);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

    const canInteract = user && profile?.kycStatus === 'Verified';
    const isGuest = !user;
    const isOwner = user?.uid === post?.authorId;

    useEffect(() => {
        if(user && authorProfile) {
            // In a real app, this would check a `followers` subcollection or a field on the user profile.
            // For now, we mock it based on a local storage flag to persist the "Follow" button state.
            const isFollowed = localStorage.getItem(`follow_${authorProfile.uid}`) === 'true';
            setIsFollowing(isFollowed);
        }
    }, [user, authorProfile]);

    useEffect(() => {
        if (post?.videos?.some(url => url.includes('tiktok.com'))) {
            const script = document.createElement('script');
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);

            return () => {
              if (document.body.contains(script)) {
                document.body.removeChild(script);
              }
            }
        }
    }, [post?.videos]);

    useEffect(() => {
        if (firestore && id) {
            const postRef = doc(firestore, 'bbs', id);
            updateDoc(postRef, {
                views: increment(1)
            }).catch(err => {
                console.warn("Failed to increment view count:", err);
            });
        }
    }, [firestore, id]);


    const handleInteractionNotAllowed = () => {
        toast({
            variant: 'destructive',
            title: isGuest ? t('common.loginToInteract') : t('common.verifyToInteract'),
        });
    }

    const handleFollowToggle = async () => {
        if (!canInteract || !authorProfile || !firestore) {
            handleInteractionNotAllowed();
            return;
        }

        const currentUserRef = doc(firestore, 'users', user.uid);
        const targetUserRef = doc(firestore, 'users', authorProfile.uid);
        
        try {
            if (isFollowing) {
                // Unfollow
                await updateDoc(currentUserRef, { followingCount: increment(-1) });
                await updateDoc(targetUserRef, { followersCount: increment(-1) });
            } else {
                // Follow
                await updateDoc(currentUserRef, { followingCount: increment(1) });
                await updateDoc(targetUserRef, { followersCount: increment(1) });
            }
            
            // Toggle local state and persist for mock UI
            setIsFollowing(prev => {
                const newState = !prev;
                localStorage.setItem(`follow_${authorProfile.uid}`, String(newState));
                toast({ title: newState ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess') });
                return newState;
            });

        } catch (error) {
            console.error("Failed to update follow status:", error);
            toast({ variant: 'destructive', title: 'Action failed. Please try again.' });
        }
    };

    const handlePostComment = () => {
        if (!newComment.trim() || !user || !firestore || !post || !postRef) return;

        if (!canInteract) {
            handleInteractionNotAllowed();
            return;
        }

        setIsSubmitting(true);

        const commentData = {
            authorId: user.uid,
            text: newComment,
            createdAt: serverTimestamp(),
            parentId: replyingTo?.id === 'root' ? null : replyingTo.id,
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
        };
        const commentsRef = collection(firestore, 'bbs', post.id, 'comments');
        
        addDoc(commentsRef, commentData).then(() => {
            updateDoc(postRef, { replies: increment(1) })
                .catch((serverError) => {
                     const permissionError = new FirestorePermissionError({
                        path: postRef.path,
                        operation: 'update',
                        requestResourceData: { replies: increment(1) },
                    });
                    errorEmitter.emit('permission-error', permissionError);
                });
            
            setNewComment('');
            setReplyingTo(null);
            toast({
                title: t('productComments.commentPosted'),
                description: t('productComments.replyNotification'),
            });
            setIsSubmitting(false);

        }).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: commentsRef.path,
                operation: 'create',
                requestResourceData: commentData,
            });
            errorEmitter.emit('permission-error', permissionError);
            setIsSubmitting(false);
        });
    };
    
    const handleDeleteComment = async () => {
        if (!commentToDelete || !firestore || !post || !postRef) return;
        const commentRef = doc(firestore, 'bbs', post.id, 'comments', commentToDelete);
        
        deleteDoc(commentRef)
            .then(() => {
                updateDoc(postRef, { replies: increment(-1) })
                    .catch((serverError) => {
                        console.warn("Failed to decrement post reply count, but comment was deleted.", serverError);
                        const permissionError = new FirestorePermissionError({
                            path: postRef.path,
                            operation: 'update',
                            requestResourceData: { replies: increment(-1) },
                        });
                        errorEmitter.emit('permission-error', permissionError);
                    });
                setCommentToDelete(null);
                toast({ title: t('productComments.commentDeleted') });
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: commentRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({ variant: 'destructive', title: 'Failed to delete comment.' });
            });
    };

    const handleConfirmCancelReply = () => {
        setReplyingTo(null);
        setNewComment('');
        setIsCancelDialogOpen(false);
    };
    
    const handleLoadMoreComments = () => {
        setVisibleCommentsCount(prev => prev + COMMENTS_LOAD_MORE);
    };

    const handleEditPost = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push(`/bbs/edit/${id}`);
    };

    const handleDeletePost = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!firestore || !post || !postRef) return;
        try {
            await deleteDoc(postRef);
            toast({ title: t('bbsPage.postDeleted') });
            router.push('/bbs');
        } catch (error) {
            console.error("Failed to delete post:", error);
            toast({ variant: 'destructive', title: 'Failed to delete post.' });
        }
    };

    const handleLikeDislike = async (commentId: string, isLiked: boolean, isDisliked: boolean, type: 'like' | 'dislike') => {
        if (!canInteract || !firestore || !user || !post) {
            handleInteractionNotAllowed();
            return;
        }

        const commentRef = doc(firestore, 'bbs', post.id, 'comments', commentId);
        let likeIncrement = 0;
        let dislikeIncrement = 0;

        if (type === 'like') {
            if (isLiked) {
                likeIncrement = -1;
            } else {
                likeIncrement = 1;
                if (isDisliked) dislikeIncrement = -1;
            }
        } else { // dislike
            if (isDisliked) {
                dislikeIncrement = -1;
            } else {
                dislikeIncrement = 1;
                if (isLiked) likeIncrement = -1;
            }
        }

        try {
            await updateDoc(commentRef, {
                likedBy: type === 'like' && !isLiked ? arrayUnion(user.uid) : arrayRemove(user.uid),
                dislikedBy: type === 'dislike' && !isDisliked ? arrayUnion(user.uid) : arrayRemove(user.uid),
                ...(likeIncrement !== 0 && { likes: increment(likeIncrement) }),
                ...(dislikeIncrement !== 0 && { dislikes: increment(dislikeIncrement) }),
            });
        } catch (error) {
            console.error("Failed to update comment interaction:", error);
        }
    };
    
     const handlePostInteraction = async (type: 'like' | 'favorite') => {
        if (!canInteract || !firestore || !post || !user) {
            handleInteractionNotAllowed();
            return;
        }
        
        const isLiked = post.likedBy?.includes(user.uid);
        const isFavorited = post.favoritedBy?.includes(user.uid);
        const postRef = doc(firestore, 'bbs', post.id);

        try {
            if (type === 'like') {
                await updateDoc(postRef, {
                    likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                    likes: increment(isLiked ? -1 : 1)
                });
            } else if (type === 'favorite') {
                await updateDoc(postRef, {
                    favoritedBy: isFavorited ? arrayRemove(user.uid) : arrayUnion(user.uid),
                    favorites: increment(isFavorited ? -1 : 1)
                });
                if (!isFavorited) {
                    toast({ title: t('productCardActions.addedToFavorites') });
                }
            }
        } catch(error) {
            console.error(`Failed to update ${type}:`, error);
            toast({ variant: 'destructive', title: `Failed to update ${type}` });
        }
    };

    const nestedComments = useMemo(() => {
        if (!comments) return [];
        const commentMap: { [key: string]: NestedComment } = {};
        comments.forEach(comment => {
            commentMap[comment.id] = { ...comment, replies: [] };
        });
    
        const topLevelComments: NestedComment[] = [];
        comments.forEach(comment => {
            if (comment.parentId && commentMap[comment.parentId]) {
                commentMap[comment.parentId].replies.push(commentMap[comment.id]);
            } else {
                topLevelComments.push(commentMap[comment.id]);
            }
        });
        
        topLevelComments.forEach(comment => {
            if (comment.replies) {
              comment.replies.sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
            }
        });
    
        return topLevelComments;
    }, [comments]);


    if (postLoading || commentsLoading) {
        return <PostPageSkeleton />;
    }
    
    if (!post || postError) {
        return notFound();
    }
    
    const postDate = post.createdAt?.toDate();
    
    const renderComments = (commentList: NestedComment[]) => {
      return commentList.map(comment => (
        <div key={comment.id}>
          <CommentItem
            comment={comment}
            user={user}
            canInteract={canInteract}
            handleInteractionNotAllowed={handleInteractionNotAllowed}
            handleLikeDislike={handleLikeDislike}
            setReplyingTo={setReplyingTo}
            setCommentToDelete={setCommentToDelete}
          />
          {replyingTo?.id === comment.id && (
            <div className="mt-4 ml-11 pl-4 border-l-2">
              <CommentForm
                isSubmitting={isSubmitting}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onSubmit={handlePostComment}
                onCancelClick={() => newComment ? setIsCancelDialogOpen(true) : handleConfirmCancelReply()}
              />
            </div>
          )}
          {comment.replies.length > 0 && (
            <div className="ml-8 mt-4 space-y-4 border-l-2 pl-4">
              {renderComments(comment.replies)}
            </div>
          )}
        </div>
      ));
    };

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <Card className="w-full overflow-hidden shadow-2xl shadow-primary/10">
                    
                    {/* Author Header */}
                    <div className="p-4 border-b flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Avatar className="h-20 w-20 cursor-pointer">
                                        <AvatarImage src={authorProfile?.photoURL} alt={authorProfile?.displayName} />
                                        <AvatarFallback>{authorProfile?.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </DialogTrigger>
                                <DialogContent className="p-0 border-0 max-w-lg bg-transparent shadow-none">
                                    <DialogHeader>
                                        <DialogTitle className="sr-only">Enlarged avatar for {authorProfile?.displayName}</DialogTitle>
                                    </DialogHeader>
                                    <Image src={authorProfile?.photoURL || ''} alt={authorProfile?.displayName || ''} width={512} height={512} className="rounded-lg" />
                                </DialogContent>
                            </Dialog>
                            <div className="flex flex-col gap-1 pt-1">
                                <div className="flex items-baseline gap-4">
                                     <Link href={`/user/${post.authorId}`} className="hover:underline">
                                        <h2 className="font-bold text-xl">{authorProfile?.displayName}</h2>
                                    </Link>
                                    <p className="text-sm font-semibold text-red-400">
                                        {authorProfile?.creditLevel || t('userProfile.noVerifications')}
                                        {authorProfile?.location && (
                                            <>
                                                <span className="mx-2 text-muted-foreground font-normal">&middot;</span>
                                                <span className="text-muted-foreground font-normal">{authorProfile.location}</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-x-3 text-sm text-muted-foreground">
                                    <Link href={`/user/${post.authorId}/followers`} className="hover:underline">
                                        {t('userProfile.followers')} <span className="font-bold text-foreground">{authorProfile?.followersCount || 0}</span>
                                    </Link>
                                    <span>&middot;</span>
                                    <Link href={`/user/${post.authorId}/following`} className="hover:underline">
                                        {t('userProfile.following')} <span className="font-bold text-foreground">{authorProfile?.followingCount || 0}</span>
                                    </Link>
                                    <span>&middot;</span>
                                    <Link href={`/user/${post.authorId}/listings`} className="hover:underline">
                                        {t('userProfile.posts')} <span className="font-bold text-foreground">{authorProfile?.postsCount || 0}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isOwner && (
                                 <Button
                                    size="sm"
                                    onClick={handleFollowToggle}
                                    disabled={!canInteract}
                                    variant={'default'}
                                    className={cn("rounded-md", isFollowing && 'bg-yellow-400 text-black hover:bg-yellow-500')}
                                >
                                    {isFollowing ? (
                                        <><Check className="mr-2 h-4 w-4" /> {t('userProfile.alreadyFollowing')}</>
                                    ) : (
                                        <><Plus className="mr-2 h-4 w-4" /> {t('userProfile.follow')}</>
                                    )}
                                </Button>
                            )}
                             {isOwner && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={handleEditPost}><Edit className="mr-2 h-4 w-4" />{t('bbsPage.editPost')}</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:bg-destructive focus:text-destructive-foreground"><Trash2 className="mr-2 h-4 w-4" />{t('bbsPage.deletePost')}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                     {/* Content */}
                    <div className="p-6">
                        <h1 className="font-headline text-3xl font-bold mb-4">{post.title}</h1>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{postDate ? format(postDate, 'PPP') : '...'}</span>
                            </div>
                            {authorProfile?.location && (
                                <div className="flex items-center gap-2">
                                    <span>&middot;</span>
                                    <span>{authorProfile.location}</span>
                                </div>
                            )}
                        </div>

                        {post.images && post.images.length > 0 && (
                            <div className="my-6">
                                <BbsPostImageGallery 
                                    post={post}
                                    onLikeToggle={() => handlePostInteraction('like')}
                                    onFavoriteToggle={() => handlePostInteraction('favorite')}
                                />
                            </div>
                        )}
                        
                        {post.videos && post.videos.length > 0 && (
                            <div className="my-6 space-y-6">
                            {post.videos.map((videoUrl, index) => {
                                if (videoUrl.includes('youtube.com/embed')) {
                                return (
                                    <div key={index} className="aspect-video w-full max-w-3xl mx-auto overflow-hidden rounded-lg border">
                                    <iframe width="100%" height="100%" src={videoUrl} title={`Embedded YouTube video ${index + 1}`} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                                    </div>
                                );
                                }
                                if (videoUrl.includes('tiktok.com')) {
                                const videoId = videoUrl.split('video/')[1]?.split('?')[0];
                                return (
                                    <div key={index} className="mx-auto my-4 flex justify-center">
                                        <blockquote className="tiktok-embed" cite={videoUrl} data-video-id={videoId} style={{maxWidth: '340px', minWidth: '325px'}} > <section></section> </blockquote>
                                    </div>
                                );
                                }
                                return null;
                            })}
                            </div>
                        )}

                        <div className="space-y-2 text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {post.content.split('\n').map((line, index) => (
                            <p key={index}>{line}</p>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-6">
                        {post.isFeatured && (
                            <Badge variant="outline" className="text-xs border-amber-400/50 bg-amber-400/10 text-amber-300">
                                <Star className="mr-1 h-3 w-3 fill-amber-300" />
                                {t('bbsPage.featuredBadge')}
                            </Badge>
                        )}
                        {post.tags.map(tag => (
                            <Badge key={tag} variant="secondary">#{tag}</Badge>
                        ))}
                        </div>
                    </div>
                    
                    {/* Comments */}
                     <div id="comments" className="px-6 pb-6 scroll-mt-24">
                        <Separator className="my-6" />
                        <p className="text-lg font-semibold mb-4">{post.replies || 0} 条评论</p>

                        {canInteract && !replyingTo && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center rounded-lg border border-white bg-card p-4 text-lg font-semibold text-yellow-400 h-auto mb-6 animate-glow-yellow-text transition-all hover:brightness-125"
                                            onClick={() => setReplyingTo({ id: 'root', authorName: 'Post' })}
                                        >
                                            {t('productComments.placeholder')}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('productComments.tooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {!user && (
                            <div className="text-center text-sm text-muted-foreground p-4 border border-dashed rounded-md mb-6">
                                <p>{isGuest ? t('common.loginToInteract') : t('common.verifyToInteract')}</p>
                            </div>
                        )}
                        
                        {replyingTo?.id === 'root' && (
                             <div className="mb-6">
                                <CommentForm
                                    isSubmitting={isSubmitting}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onSubmit={handlePostComment}
                                    onCancelClick={() => newComment ? setIsCancelDialogOpen(true) : handleConfirmCancelReply()}
                                />
                             </div>
                        )}

                        <div className="space-y-6">
                            {renderComments(nestedComments.slice(0, visibleCommentsCount))}
                        </div>
                        {nestedComments.length > visibleCommentsCount && (
                            <div className="text-center mt-6">
                                <Button variant="outline" onClick={handleLoadMoreComments} disabled={!canInteract}>
                                    {t('bbsPage.loadMoreComments')}
                                </Button>
                            </div>
                        )}
                    </div>

                </Card>
            </div>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('bbsPage.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('bbsPage.deleteConfirmDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>{t('bbsPage.deleteCancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">{t('bbsPage.deleteConfirmAction')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('productComments.cancelConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('productComments.cancelConfirmDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                         <Button onClick={() => setIsCancelDialogOpen(false)} variant="default">{t('productComments.continueEditing')}</Button>
                        <Button onClick={handleConfirmCancelReply} variant="outline" className="border-primary text-primary bg-primary/10 hover:bg-primary/20">
                            {t('productComments.cancelConfirmAction')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{t('productComments.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('productComments.deleteConfirmDescription')}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setCommentToDelete(null)}>{t('productComments.deleteCancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteComment}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {t('productComments.deleteConfirmAction')}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
