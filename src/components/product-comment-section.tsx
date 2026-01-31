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


const COMMENTS_PER_PAGE = 5;
const locales = { en: enUS, zh: zhCN, th: th };


export function ProductCommentSection({ productId }: { productId: string }) {
    const { t, language } = useTranslation();
    const { user, profile } = useUser();
    const { toast } = useToast();
    
    const [users, setUsers] = useState<User[]>([]);
    const [comments, setComments] = useState<Comment[]>(allMockComments);
    const [newComment, setNewComment] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

    useEffect(() => {
        getUsers().then(setUsers);
    }, []);

    const canComment = user && profile?.kycStatus === 'Verified';

    const handlePostComment = () => {
        if (!newComment.trim()) return;
        if (!canComment || !user) {
            toast({
                variant: 'destructive',
                title: t('productComments.cannotCommentTitle'),
                description: t('productComments.cannotCommentDescription'),
            });
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            const newCommentObject: Comment = {
                id: `c${Date.now()}`,
                authorId: user.uid,
                text: newComment,
                date: new Date(),
                parentId: replyingTo?.id,
            };
            setComments(prev => [newCommentObject, ...prev]);
            setNewComment('');
            setReplyingTo(null);
            setIsSubmitting(false);
            toast({ title: t('productComments.commentPosted') });
            
            if (!isExpanded) setIsExpanded(true);
            setCurrentPage(1);

        }, 500);
    };

    const handleDeleteComment = () => {
        if (!commentToDelete) return;
        setComments(prev => prev.filter(c => c.id !== commentToDelete && c.parentId !== commentToDelete));
        setCommentToDelete(null);
        toast({ title: t('productComments.commentDeleted') });
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


    const totalPages = Math.ceil(nestedComments.length / COMMENTS_PER_PAGE);

    const displayedComments = useMemo(() => {
        const paginated = nestedComments.slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE);
        if (isExpanded) {
            return paginated;
        }
        return nestedComments.slice(0, 5);
    }, [nestedComments, isExpanded, currentPage]);
    
    const getUserById = (userId: string) => {
        if (userId === user?.uid) {
            // A bit of a hack to get the current user's full profile data from `useUser`
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

    const placeholderText = replyingTo 
        ? `${t('productComments.replyTo')} ${replyingTo.authorName}...` 
        : t('productComments.placeholder');

    const renderComment = (comment: NestedComment, isReply: boolean = false) => {
        const author = getUserById(comment.authorId);
        const timeAgo = formatDistanceToNow(comment.date, { addSuffix: true, locale: locales[language] });

        return (
            <div key={comment.id} className="flex items-start gap-3">
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
                            onClick={() => setReplyingTo({ id: comment.id, authorName: author?.name || 'User' })}
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
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{t('productComments.title')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    {/* Comment Form */}
                    <div>
                    {canComment ? (
                        <div className="space-y-2">
                            {replyingTo && (
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <p className="text-muted-foreground">{`${t('productComments.replyTo')} ${replyingTo.authorName}`}</p>
                                    <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => setReplyingTo(null)}>
                                        <X className="mr-1 h-3 w-3" />
                                        {t('productComments.cancelReply')}
                                    </Button>
                                </div>
                            )}
                            <Textarea 
                                placeholder={placeholderText}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                rows={3}
                                maxLength={500}
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">{newComment.length} / 500</p>
                                <Button onClick={handlePostComment} disabled={isSubmitting || !newComment.trim()}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('productComments.submit')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-muted-foreground p-4 border border-dashed rounded-md">
                            <Link href="/login" className="text-primary underline">{t('productComments.loginToComment_link')}</Link>
                            {' '}{t('productComments.loginToComment_text')}
                        </div>
                    )}
                    </div>

                    <Separator />

                    {/* Comments List */}
                    {nestedComments.length > 0 ? (
                        <div className="space-y-6">
                            {(isExpanded ? displayedComments : nestedComments.slice(0,5)).map(comment => (
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
                    
                    {nestedComments.length > 5 && (
                        <div className="text-center mt-6">
                            <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
                                {isExpanded ? t('productComments.collapse') : t('productComments.showMore')}
                                <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                            </Button>
                        </div>
                    )}

                    {isExpanded && totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                            <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                            {t('productComments.previous')}
                            </Button>
                            <span className="flex items-center px-4 text-sm font-medium">
                                {currentPage} / {totalPages}
                            </span>
                            <Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                {t('productComments.next')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!commentToDelete} onOpenChange={setCommentToDelete}>
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
