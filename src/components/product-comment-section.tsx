
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Loader2, MessageSquare, Reply, X, ThumbsDown, Trash2, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Separator } from './ui/separator';
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { collection, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion, arrayRemove, doc } from 'firebase/firestore';
import type { Comment as CommentType, UserProfile } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';

type NestedComment = CommentType & {
    replies: NestedComment[];
};

const COMMENTS_INITIAL_LOAD = 5;
const COMMENTS_LOAD_MORE = 10;
const locales = { en: enUS, zh: zhCN, th: th };

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
        maxLength={500}
        rows={3}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{value.length} / 500</p>
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
  setCommentToDelete,
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
  const authorName = author?.displayName || comment.authorId.slice(0, 6);
  const profileUrl = `/@${author?.loginId || author?.uid}`;

  return (
    <div className="flex items-start gap-3">
        <Link href={profileUrl}>
            <Avatar className="h-10 w-10">
                {author?.photoURL && <AvatarImage src={author.photoURL} alt={authorName} />}
                <AvatarFallback>{authorName.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
        </Link>
        <div className="flex-1">
            <div className="flex items-center justify-between">
                <div>
                    <span className="font-headline font-semibold text-foreground">{authorName}</span>
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
            <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto p-1 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: authorName }) : handleInteractionNotAllowed()}
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


export function ProductCommentSection({ productId }: { productId: string }) {
    const { t, language } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const commentsQuery = useMemo(() => 
        firestore && productId
        ? query(collection(firestore, 'products', productId, 'comments'), orderBy('createdAt', 'desc'))
        : null
    , [firestore, productId]);

    const { data: comments, loading: commentsLoading } = useCollection<CommentType>(commentsQuery);
    
    const [newComment, setNewComment] = useState('');
    const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_INITIAL_LOAD);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    
    const canInteract = user && profile?.kycStatus === 'Verified';
    const isGuest = !user;

    const handleInteractionNotAllowed = () => {
        toast({
            variant: 'destructive',
            title: isGuest ? t('common.loginToInteract') : t('common.verifyToInteract'),
        });
    }
    
    const handleConfirmCancelReply = () => {
        setReplyingTo(null);
        setNewComment('');
        setIsCancelDialogOpen(false);
    };

    const handlePostComment = async () => {
        if (!newComment.trim() || !firestore || !user) return;

        if (!canInteract) {
            handleInteractionNotAllowed();
            return;
        }

        setIsSubmitting(true);
        
        try {
            await addDoc(collection(firestore, 'products', productId, 'comments'), {
                authorId: user.uid,
                text: newComment,
                createdAt: serverTimestamp(),
                parentId: replyingTo?.id === 'root' ? null : replyingTo.id,
                likes: 0,
                dislikes: 0,
                likedBy: [],
                dislikedBy: [],
            });
            setNewComment('');
            setReplyingTo(null);
            toast({
                title: t('productComments.commentPosted'),
            });
        } catch(e) {
            console.error(e);
            toast({
                title: 'Error',
                description: 'Failed to post comment.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteComment = async () => {
        if (!commentToDelete || !firestore) return;
        
        try {
            await deleteDoc(doc(firestore, 'products', productId, 'comments', commentToDelete));
            setCommentToDelete(null);
            toast({ title: t('productComments.commentDeleted') });
        } catch (e) {
            console.error(e);
            toast({ title: 'Failed to delete comment', variant: 'destructive'});
        }
    };

    const handleLoadMore = () => {
        setVisibleCommentsCount(prev => prev + COMMENTS_LOAD_MORE);
    };

    const handleLikeDislike = async (commentId: string, isLiked: boolean, isDisliked: boolean, type: 'like' | 'dislike') => {
        if (!canInteract || !firestore || !user) {
            handleInteractionNotAllowed();
            return;
        }

        const commentRef = doc(firestore, 'products', productId, 'comments', commentId);
        
        let updateData: any = {};
        
        if (type === 'like') {
            updateData.likedBy = isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid);
            updateData.likes = increment(isLiked ? -1 : 1);
            if (isDisliked) {
                updateData.dislikedBy = arrayRemove(user.uid);
                updateData.dislikes = increment(-1);
            }
        } else { // dislike
            updateData.dislikedBy = isDisliked ? arrayRemove(user.uid) : arrayUnion(user.uid);
            updateData.dislikes = increment(isDisliked ? -1 : 1);
            if (isLiked) {
                updateData.likedBy = arrayRemove(user.uid);
                updateData.likes = increment(-1);
            }
        }

        try {
            await updateDoc(commentRef, updateData);
        } catch (e) {
             console.error(e);
             toast({
                title: 'Error',
                description: 'Failed to update like/dislike status.',
                variant: 'destructive'
            });
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
            <div className="mt-4 ml-12 pl-4 border-l-2">
              <CommentForm
                isSubmitting={isSubmitting}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onSubmit={handlePostComment}
                onCancelClick={() => newComment ? setIsCancelDialogOpen(true) : setReplyingTo(null)}
              />
            </div>
          )}
          {comment.replies.length > 0 && (
            <div className="ml-10 mt-4 space-y-4 border-l-2 pl-4">
              {renderComments(comment.replies)}
            </div>
          )}
        </div>
      ));
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{t('productComments.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {canInteract ? (
                        (!replyingTo || replyingTo.id !== 'root') && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center rounded-lg border border-white bg-card p-4 text-lg font-semibold text-yellow-400 h-auto mb-6 animate-glow-yellow-text transition-all hover:brightness-125"
                                            onClick={() => setReplyingTo({id: 'root', authorName: 'Post'})}
                                        >
                                            {t('productComments.placeholder')}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{t('productComments.tooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    ) : (
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
                    
                    {nestedComments.length > 0 && <Separator />}

                    {commentsLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : nestedComments.length > 0 ? (
                        <div className="space-y-6">
                            {renderComments(nestedComments.slice(0, visibleCommentsCount))}
                        </div>
                    ) : (
                         <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                            <p>{t('productComments.noComments')}</p>
                            <p className="text-xs">{t('productComments.beTheFirst')}</p>
                        </div>
                    )}
                    
                    {comments && comments.length > visibleCommentsCount && (
                        <div className="text-center mt-6">
                            <Button variant="outline" onClick={handleLoadMore}>
                                {t('bbsPage.loadMoreComments')}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

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
        </>
    );
}
