'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { getBbsPostById, getUsers } from '@/lib/data';
import type { BbsPost, User } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Plus, MessageSquare, Calendar, X, MoreHorizontal, Edit, Trash2, Check, Reply, ThumbsUp, ThumbsDown, MapPin } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { BbsPostImageGallery } from '@/components/bbs-post-image-gallery';
import { cn } from '@/lib/utils';

const locales = { en: enUS, zh: zhCN, th: th };

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

// Placeholder comments
const initialComments: Comment[] = [
    { id: 'c1', authorId: 'user10', text: '这件商品还有吗？', date: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { id: 'c8', authorId: 'user1', text: '有货！', date: new Date(Date.now() - 4 * 60 * 60 * 1000), parentId: 'c1' },
    { id: 'c2', authorId: 'user3', text: '价格可以商量吗？', date: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 'c3', authorId: 'user2', text: '太棒了！我有一个类似的，非常喜欢。', date: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { id: 'c4', authorId: 'user1', text: '有国际保修吗？', date: new Date(Date.now() - 55 * 60 * 1000) },
    { id: 'c9', authorId: 'user3', text: '问得好，我也想知道。', date: new Date(Date.now() - 50 * 60 * 1000), parentId: 'c4' },
    { id: 'c5', authorId: 'user6', text: '这太适合我的设置了。', date: new Date(Date.now() - 45 * 60 * 1000) },
    { id: 'c6', authorId: 'user5', text: '刚订了一个，等不及了！', date: new Date(Date.now() - 30 * 60 * 1000) },
    { id: 'c7', authorId: 'user4', text: '看起来不错，但电池续航怎么样？', date: new Date(Date.now() - 2 * 60 * 1000) },
];


const COMMENTS_INITIAL_LOAD = 10;
const COMMENTS_LOAD_MORE = 10;

function PostPageSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <Card>
                    <div className="p-4 border-b">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-16 w-16 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-32" />
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
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{value.length} / 2000</p>
        <div className="flex items-center gap-2">
          <Button onClick={onSubmit} disabled={isSubmitting || !value.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('productComments.submit')}
          </Button>
          <Button variant="outline" className="border-primary text-primary bg-primary/10 hover:bg-primary/20" onClick={onCancelClick}>
            {t('productComments.cancelReply')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function BbsPostPage() {
    const params = useParams();
    const router = useRouter();
    const { t, language } = useTranslation();
    const { toast } = useToast();
    const [post, setPost] = useState<BbsPost | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    const { user, profile } = useUser();
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleCommentsCount, setVisibleCommentsCount] = useState(COMMENTS_INITIAL_LOAD);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    
    const [permissionErrorToast, setPermissionErrorToast] = useState(false);
    const [followToast, setFollowToast] = useState<'followed' | 'unfollowed' | null>(null);
    const [likeToast, setLikeToast] = useState(false);
    const [replyToast, setReplyToast] = useState(false);
    
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [commentInteractions, setCommentInteractions] = useState<Record<string, 'liked' | 'disliked' | null>>({});

    const id = typeof params.id === 'string' ? params.id : '';

    const canInteract = user && profile?.kycStatus === 'Verified';
    const isGuest = !user;
    const isOwner = user?.uid === post?.author.id;

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

    useEffect(() => {
        if(user && post) {
            const postAuthorIdNum = parseInt(post.author.id.replace('user', ''));
            if (user.uid === 'test-user-uid' && postAuthorIdNum % 2 === 0) {
                setIsFollowing(true);
            } else {
                setIsFollowing(false);
            }
        }
    }, [user, post]);

    useEffect(() => {
        if (permissionErrorToast) {
            setTimeout(() => {
                toast({
                    variant: 'destructive',
                    title: isGuest ? t('common.loginToInteract') : t('common.verifyToInteract'),
                });
                setPermissionErrorToast(false);
            }, 0);
        }
    }, [permissionErrorToast, isGuest, t, toast]);
    
    useEffect(() => {
        if (followToast) {
            setTimeout(() => {
                toast({
                    title: followToast === 'followed' ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess'),
                });
                setFollowToast(null);
            }, 0);
        }
    }, [followToast, t, toast]);

    useEffect(() => {
        if (likeToast) {
            setTimeout(() => {
                toast({
                    title: t('productComments.likeSuccess'),
                    description: t('productComments.replyNotification'),
                });
                setLikeToast(false);
            }, 0);
        }
    }, [likeToast, t, toast]);
    
    useEffect(() => {
        if (replyToast) {
            setTimeout(() => {
                toast({
                    title: t('productComments.commentPosted'),
                    description: t('productComments.replyNotification'),
                });
                setReplyToast(false);
            }, 0);
        }
    }, [replyToast, t, toast]);

    const handleInteractionNotAllowed = () => {
        setPermissionErrorToast(true);
    }

    const handleFollowToggle = () => {
        if (!canInteract) {
            handleInteractionNotAllowed();
            return;
        }
        setIsFollowing(prev => {
            setFollowToast(!prev ? 'followed' : 'unfollowed');
            return !prev;
        });
    };

    const handlePostComment = () => {
        if (!newComment.trim()) return;

        if (!canInteract) {
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
            setReplyToast(true);
        }, 500);
    };
    
    const handleDeleteComment = () => {
        if (!commentToDelete) return;
        setComments(prev => prev.filter(c => c.id !== commentToDelete && c.parentId !== commentToDelete));
        setCommentToDelete(null);
        toast({ title: t('productComments.commentDeleted') });
    };

    const handleConfirmCancelReply = () => {
        setReplyingTo(null);
        setNewComment('');
        setIsCancelDialogOpen(false);
    };
    
    const handleLoadMoreComments = () => {
        if (isGuest) {
            handleInteractionNotAllowed();
            return;
        }
        setVisibleCommentsCount(prev => prev + COMMENTS_LOAD_MORE);
    };

    const handleEditPost = (e: React.MouseEvent) => {
        e.preventDefault();
        toast({ title: t('bbsPage.editComingSoon') });
    };

    const handleDeletePost = (e: React.MouseEvent) => {
        e.preventDefault();
        toast({ title: t('bbsPage.postDeleted') });
        router.push('/bbs');
    };

    const handleLikeDislike = (commentId: string, type: 'like' | 'dislike') => {
        if (!canInteract) {
            handleInteractionNotAllowed();
            return;
        }
        setCommentInteractions(prev => {
            const currentStatus = prev[commentId];
            let newStatus;
    
            if (type === 'like') {
                newStatus = currentStatus === 'liked' ? null : 'liked';
                if (newStatus === 'liked') {
                    setLikeToast(true);
                }
            } else { // dislike
                newStatus = currentStatus === 'disliked' ? null : 'disliked';
            }
    
            return { ...prev, [commentId]: newStatus };
        });
    };

    const nestedComments = useMemo(() => {
        const commentMap: { [key: string]: NestedComment } = {};
        comments.forEach(comment => {
            commentMap[comment.id] = { ...comment, date: new Date(comment.date), replies: [] };
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
            if (comment.replies) {
              comment.replies.sort((a, b) => a.date.getTime() - b.date.getTime());
            }
        });
    
        return topLevelComments;
    }, [comments]);


    if (loading) {
        return <PostPageSkeleton />;
    }
    
    if (!post) {
        return notFound();
    }
    
    const postDate = new Date(post.createdAt);
    
    const getUserById = (userId: string): User | undefined => {
       if (user && userId === user.uid) {
            const currentUserAsLibUser: User = {
                id: user.uid,
                name: profile?.displayName || user.displayName || 'You',
                avatarUrl: profile?.photoURL || user.photoURL || '',
                rating: profile?.rating || 0,
                reviews: profile?.reviewsCount || 0,
                followersCount: profile?.followersCount || 0,
                followingCount: profile?.followingCount || 0,
                location: { city: 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
                postsCount: 0, 
            };
            return currentUserAsLibUser;
        }
        return users.find(u => u.id === userId);
    };
    
    const renderComment = (comment: NestedComment) => {
        const author = getUserById(comment.authorId);
        const timeAgo = formatDistanceToNow(comment.date, { addSuffix: true, locale: locales[language] });
        const isLiked = commentInteractions[comment.id] === 'liked';
        const isDisliked = commentInteractions[comment.id] === 'disliked';

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
                             <div className="flex items-center flex-wrap gap-x-2 text-sm">
                                <span className="font-semibold text-foreground">{author?.name}</span>
                                {author?.location && <p className="text-muted-foreground">{author.location.city}, {author.location.countryCode}</p>}
                            </div>
                            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
                                <button onClick={() => handleLikeDislike(comment.id, 'like')} className={cn("flex items-center gap-1.5 z-10 hover:text-primary", isLiked && "text-primary fill-primary")}>
                                    <ThumbsUp className="h-4 w-4" /> <span>{author?.goodReviews ?? 0}</span>
                                </button>
                                <button onClick={() => handleLikeDislike(comment.id, 'dislike')} className={cn("flex items-center gap-1.5 z-10 hover:text-destructive", isDisliked && "text-destructive fill-destructive")}>
                                    <ThumbsDown className="h-4 w-4" /> <span>{author?.badReviews ?? 0}</span>
                                </button>
                                <span>{timeAgo}</span>
                            </div>
                        </div>
                        <p className="text-sm my-2 text-foreground/90">{comment.text}</p>
                        <div className="flex items-center justify-start gap-2">
                           <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-auto p-1 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: author?.name || 'User' }) : handleInteractionNotAllowed()}
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
                 {replyingTo?.id === comment.id && (
                    <div className="mt-4 ml-11 pl-4 border-l-2">
                         <div className="space-y-2">
                            <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder={`${t('productComments.replyTo')} ${replyingTo.authorName}...`}
                                maxLength={2000}
                                rows={3}
                                autoFocus
                            />
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{newComment.length} / 2000</p>
                                <div className="flex items-center gap-2">
                                <Button onClick={handlePostComment} disabled={isSubmitting || !newComment.trim()}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('productComments.submit')}
                                </Button>
                                <Button variant="outline" className="border-primary text-primary bg-primary/10 hover:bg-primary/20" onClick={() => newComment ? setIsCancelDialogOpen(true) : handleConfirmCancelReply()}>
                                    {t('productComments.cancelReply')}
                                </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

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
                                        <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                                        <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </DialogTrigger>
                                <DialogContent className="p-0 border-0 max-w-lg bg-transparent shadow-none">
                                    <DialogHeader className="sr-only">
                                        <DialogTitle>Enlarged avatar for {post.author.name}</DialogTitle>
                                    </DialogHeader>
                                    <Image src={post.author.avatarUrl} alt={post.author.name} width={512} height={512} className="rounded-lg" />
                                </DialogContent>
                            </Dialog>
                            <div className="flex flex-col gap-1.5 pt-1">
                                <Link href={`/user/${post.author.id}`} className="hover:underline">
                                    <h2 className="font-bold text-xl">{post.author.name}</h2>
                                </Link>
                                <p className="text-sm font-semibold text-red-400">
                                    {post.author.creditLevel || t('userProfile.noVerifications')}
                                    {post.author.location && (
                                        <>
                                            <span className="mx-2 text-muted-foreground font-normal">&middot;</span>
                                            <span className="text-muted-foreground font-normal">{post.author.location.city}, {post.author.location.countryCode}</span>
                                        </>
                                    )}
                                </p>

                                <div className="flex items-center gap-x-4 text-sm text-muted-foreground">
                                    <Link href={`/user/${post.author.id}/followers`} className="hover:underline">
                                        {t('userProfile.followers')} <span className="font-bold text-foreground">{post.author.followersCount || 0}</span>
                                    </Link>
                                    <Link href={`/user/${post.author.id}/following`} className="hover:underline">
                                        {t('userProfile.following')} <span className="font-bold text-foreground">{post.author.followingCount || 0}</span>
                                    </Link>
                                    <Link href={`/user/${post.author.id}/listings`} className="hover:underline">
                                        {t('userProfile.posts')} <span className="font-bold text-foreground">{post.author.postsCount || 0}</span>
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
                        <h1 className="font-headline text-3xl font-bold mb-4">{t(post.titleKey)}</h1>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(postDate, 'PPP')}</span>
                            </div>
                            {post.author.location && (
                                <div className="flex items-center gap-2">
                                    <span>&middot;</span>
                                    <span>{post.author.location.city}, {post.author.location.countryCode}</span>
                                </div>
                            )}
                        </div>

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
                    </div>
                    
                    {/* Comments */}
                     <div id="comments" className="px-6 pb-6 scroll-mt-24">
                        <Separator className="my-6" />
                        <p className="text-lg font-semibold mb-4">{nestedComments.length} 条评论</p>

                        {canInteract && !replyingTo && (
                            <Button
                                variant="outline"
                                className="w-full justify-start rounded-lg border bg-card p-4 text-muted-foreground hover:border-primary/50 hover:text-foreground h-auto mb-6"
                                onClick={() => setReplyingTo({ id: 'root', authorName: 'Post' })}
                            >
                                {t('productComments.placeholder')}
                            </Button>
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
                            {nestedComments.slice(0, visibleCommentsCount).map((comment) => (
                                <div key={comment.id}>
                                    {renderComment(comment)}
                                    {comment.replies.length > 0 && (
                                        <div className="ml-8 mt-4 space-y-4 border-l-2 pl-4">
                                            {comment.replies.map(reply => renderComment(reply))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {nestedComments.length > visibleCommentsCount && (
                                <div className="text-center mt-6">
                                    <Button variant="outline" onClick={handleLoadMoreComments} disabled={!canInteract}>
                                        {t('bbsPage.loadMoreComments')}
                                    </Button>
                                </div>
                            )}
                        </div>
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
        </>
    );
}
