'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { getUsers } from '@/lib/data';
import type { User } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Comment = {
  id: string;
  authorId: string;
  text: string;
  date: Date;
};

const allMockComments: Comment[] = [
    { id: 'c7', authorId: 'user4', text: 'Looks great but how is the battery life?', date: new Date(Date.now() - 2 * 60 * 1000) },
    { id: 'c6', authorId: 'user5', text: 'Just ordered one, can\'t wait!', date: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'c5', authorId: 'user6', text: 'This would be perfect for my setup.', date: new Date(Date.now() - 45 * 60 * 1000) },
    { id: 'c4', authorId: 'user1', text: 'Does it come with international warranty?', date: new Date(Date.now() - 55 * 60 * 1000) },
    { id: 'c3', authorId: 'user2', text: 'Awesome! I have a similar one and I love it.', date: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 'c2', authorId: 'user3', text: 'Is the price negotiable?', date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 'c1', authorId: 'user10', text: 'Is this item still available?', date: new Date(Date.now() - 5 * 60 * 60 * 1000) },
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
        // Simulate network delay
        setTimeout(() => {
            const newCommentObject: Comment = {
                id: `c${Date.now()}`,
                authorId: user.uid,
                text: newComment,
                date: new Date(),
            };
            setComments(prev => [newCommentObject, ...prev]);
            setNewComment('');
            setIsSubmitting(false);
            toast({ title: t('productComments.commentPosted') });
            
            // If collapsed, expand to show the new comment
            if (!isExpanded) {
                setIsExpanded(true);
            }
            // Go to the first page to see the new comment
            setCurrentPage(1);

        }, 500);
    };

    const totalPages = Math.ceil(comments.length / COMMENTS_PER_PAGE);

    const displayedComments = useMemo(() => {
        const sortedComments = [...comments].sort((a, b) => b.date.getTime() - a.date.getTime());
        if (isExpanded) {
            const start = (currentPage - 1) * COMMENTS_PER_PAGE;
            const end = start + COMMENTS_PER_PAGE;
            return sortedComments.slice(start, end);
        }
        return sortedComments.slice(0, 5);
    }, [comments, isExpanded, currentPage]);
    
    const getUserById = (userId: string) => users.find(u => u.id === userId);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('productComments.title')}</CardTitle>
            </CardHeader>
            <CardContent>
                {comments.length > 0 ? (
                    <div className="space-y-6">
                        {displayedComments.map(comment => {
                             const author = comment.authorId === user?.uid 
                                ? { id: user.uid, name: profile?.displayName || user.displayName, avatarUrl: profile?.photoURL || user.photoURL } 
                                : getUserById(comment.authorId);

                            return (
                                <div key={comment.id} className="flex items-start gap-4">
                                    <Avatar className="h-10 w-10">
                                       {author?.avatarUrl && <AvatarImage src={author.avatarUrl} alt={author.name} />}
                                       <AvatarFallback>{author?.name?.charAt(0) || '?'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-baseline gap-2">
                                                <p className="font-semibold text-sm">{author?.name || 'User'}</p>
                                                <p className="text-xs text-muted-foreground">ID: {comment.id}</p>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(comment.date, { addSuffix: true, locale: locales[language] })}
                                            </p>
                                        </div>
                                        <p className="text-sm mt-1">{comment.text}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                        <p>{t('productComments.noComments')}</p>
                        <p className="text-xs">{t('productComments.beTheFirst')}</p>
                    </div>
                )}
                
                {comments.length > 5 && (
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
            <CardFooter className="flex flex-col items-stretch gap-2 pt-6 border-t">
                 {canComment ? (
                     <>
                        <Textarea 
                            placeholder={t('productComments.placeholder')}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            rows={3}
                        />
                        <Button onClick={handlePostComment} disabled={isSubmitting || !newComment.trim()} className="self-end">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('productComments.submit')}
                        </Button>
                    </>
                 ) : (
                     <div className="text-center text-sm text-muted-foreground">
                        <Link href="/login" className="text-primary underline">{t('productComments.loginToComment_link')}</Link>
                        {' '}{t('productComments.loginToComment_text')}
                    </div>
                 )}
            </CardFooter>
        </Card>
    );
}
