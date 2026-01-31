'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Loader2, MessageSquare, Reply, X, ThumbsUp, Meh, ThumbsDown, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { getUsers } from '@/lib/data';
import type { User } from '@/lib/types';
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

type Comment = {
  id: string;
  authorId: string;
  text: string;
  date: Date;
  parentId?: string;
};

type NestedComment = Comment & {
    replies: NestedComment[];
};

const allMockComments: Comment[] = [
    { id: 'c7', authorId: 'user4', text: 'Looks great but how is the battery life?', date: new Date(Date.now() - 2 * 60 * 1000) },
    { id: 'c6', authorId: 'user5', text: 'Just ordered one, can\'t wait!', date: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'c5', authorId: 'user6', text: 'This would be perfect for my setup.', date: new Date(Date.now() - 45 * 60 * 1000) },
    { id: 'c4', authorId: 'user1', text: 'Does it come with international warranty?', date: new Date(Date.now() - 55 * 60 * 1000) },
    { id: 'c9', authorId: 'user3', text: 'Great question, I was wondering the same.', date: new Date(Date.now() - 50 * 60 * 1000), parentId: 'c4' },
    { id: 'c3', authorId: 'user2', text: 'Awesome! I have a similar one and I love it.', date: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 'c2', authorId: 'user3', text: 'Is the price negotiable?', date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 'c1', authorId: 'user10', text: 'Is this item still available?', date: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { id: 'c8', authorId: 'user1', text: 'Yes, it is!', date: new Date(Date.now() - 4 * 60 * 60 * 1000), parentId: 'c1' },
];


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
           <Button variant="outline" onClick={onCancelClick}>
            {t('productComments.cancelReply')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ProductCommentSection({ productId }: { productId: string }) {
    const { t, language } = useTranslation();
    const { user, profile } = useUser();
    const { toast } = useToast();
    
    const [users, setUsers] = useState<User[]>([]);
    const [comments, setComments] = useState<Comment[]>(allMockComments);
    const [newComment, setNewComment] = useState('');
    const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_INITIAL_LOAD);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);


    const canInteract = user && profile?.kycStatus === 'Verified';
    const isGuest = !user;

    useEffect(() => {
        getUsers().then(setUsers);
    }, []);
    
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

    const handlePostComment = () => {
        if (!newComment.trim() || !canInteract) {
            handleInteractionNotAllowed();
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            const newCommentObject: Comment = {
                id: `c${Date.now()}`,
                authorId: user.uid,
                text: newComment,
                date: new Date(),
                parentId: replyingTo?.id === 'root' ? undefined : replyingTo?.id,
            };
            setComments(prev => [newCommentObject, ...prev]);
            setNewComment('');
            setReplyingTo(null);
            setIsSubmitting(false);
            toast({ title: t('productComments.commentPosted') });
            if(visibleCommentsCount < COMMENTS_INITIAL_LOAD) setVisibleCommentsCount(COMMENTS_INITIAL_LOAD);

        }, 500);
    };

    const handleDeleteComment = () => {
        if (!commentToDelete) return;
        setComments(prev => prev.filter(c => c.id !== commentToDelete && c.parentId !== commentToDelete));
        setCommentToDelete(null);
        toast({ title: t('productComments.commentDeleted') });
    };

    const handleLoadMore = () => {
        setVisibleCommentsCount(prev => prev + COMMENTS_LOAD_MORE);
    };

    const nestedComments = useMemo(() => {
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
        
        topLevelComments.sort((a, b) => b.date.getTime() - a.date.getTime());
        topLevelComments.forEach(comment => {
            comment.replies.sort((a, b) => a.date.getTime() - b.date.getTime());
        });
    
        return topLevelComments;
    }, [comments]);
    
    const getUserById = (userId: string) => {
        if (userId === user?.uid) {
            const fullProfile = users.find(u => u.id === 'user1'); // mock a full profile
            return {
                id: user.uid,
                name: profile?.displayName || user.displayName,
                avatarUrl: profile?.photoURL || user.photoURL,
                ...fullProfile
            };
        }
        return users.find(u => u.id === userId);
    };

    const renderComment = (comment: NestedComment, isReply: boolean = false) => {
        const author = getUserById(comment.authorId);
        const timeAgo = formatDistanceToNow(comment.date, { addSuffix: true, locale: locales[language] });

        return (
             <div key={comment.id}>
                <div className="flex items-start gap-3">
                    <Link href={`/user/${author?.id || comment.authorId}`}>
                        <Avatar className="h-10 w-10">
                            {author?.avatarUrl && <AvatarImage src={author.avatarUrl} alt={author.name} />}
                            <AvatarFallback>{author?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center flex-wrap gap-x-2">
                                 <Link href={`/user/${author?.id || comment.authorId}`} className="font-semibold text-sm hover:underline">
                                    {author?.name || 'User'}
                                </Link>
                                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 text-green-400"><ThumbsUp className="h-3 w-3" /> {author?.goodReviews ?? 0}</span>
                                    <span className="flex items-center gap-1 text-yellow-400"><Meh className="h-3 w-3" /> {author?.neutralReviews ?? 0}</span>
                                    <span className="flex items-center gap-1 text-red-400"><ThumbsDown className="h-3 w-3" /> {author?.badReviews ?? 0}</span>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">{timeAgo}</p>
                        </div>
                        <p className="text-sm mt-1">{comment.text}</p>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-1 h-auto p-1 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: author?.name || 'User' }) : handleInteractionNotAllowed()}
                            >
                                <Reply className="mr-1 h-3 w-3" />
                                {t('productComments.reply')}
                            </Button>
                            {user?.uid === comment.authorId && (
                                 <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="mt-1 h-auto p-1 text-xs text-destructive hover:text-destructive"
                                    onClick={() => setCommentToDelete(comment.id)}
                                >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    {t('productComments.delete')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {replyingTo?.id === comment.id && (
                    <div className="mt-4 ml-12 pl-4 border-l-2">
                        <p className="text-sm text-muted-foreground mb-2">
                            {t('productComments.replyTo')} {replyingTo.authorName}...
                        </p>
                        <CommentForm
                            isSubmitting={isSubmitting}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onSubmit={handlePostComment}
                            onCancelClick={() => setIsCancelDialogOpen(true)}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{t('productComments.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                     {/* Comment Form Trigger / Area */}
                    {canInteract ? (
                         replyingTo?.id === 'root' ? (
                            <div className="mb-8">
                                <CommentForm
                                    isSubmitting={isSubmitting}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onSubmit={handlePostComment}
                                    onCancelClick={() => setIsCancelDialogOpen(true)}
                                />
                            </div>
                        ) : !replyingTo && (
                            <div className="mb-8">
                                <Button variant="outline" className="w-full" onClick={() => setReplyingTo({id: 'root', authorName: 'Post'})}>
                                    {t('productComments.placeholder')}
                                </Button>
                            </div>
                        )
                    ) : (
                        <div className="text-center text-sm text-muted-foreground p-4 border border-dashed rounded-md mb-8">
                            <p>{isGuest ? t('common.loginToInteract') : t('common.verifyToInteract')}</p>
                        </div>
                    )}
                    
                    {nestedComments.length > 0 && <Separator />}

                    {/* Comments List */}
                    {nestedComments.length > 0 ? (
                        <div className="space-y-6">
                            {nestedComments.slice(0, visibleCommentsCount).map(comment => (
                                <div key={comment.id}>
                                    {renderComment(comment)}
                                    {comment.replies.length > 0 && (
                                        <div className="ml-10 mt-4 space-y-4 border-l-2 pl-4">
                                            {comment.replies.map(reply => renderComment(reply, true))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                            <p>{t('productComments.noComments')}</p>
                            <p className="text-xs">{t('productComments.beTheFirst')}</p>
                        </div>
                    )}
                    
                    {nestedComments.length > visibleCommentsCount && (
                        <div className="text-center mt-6">
                            <Button variant="outline" onClick={handleLoadMore} disabled={isGuest}>
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
                        <AlertDialogCancel>{t('productComments.continueEditing')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmCancelReply} variant="destructive">
                            {t('productComments.cancelConfirmAction')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
