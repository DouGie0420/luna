'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { Loader2, Plus, MessageSquare, Calendar, X, MoreHorizontal, Edit, Trash2, Check, Reply, ThumbsUp, ThumbsDown, MapPin, Star, Heart, Zap, Users } from 'lucide-react';
import { doc, collection, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, increment, arrayUnion, arrayRemove, writeBatch, limit } from 'firebase/firestore';
import type { BbsPost, UserProfile, Comment as CommentType } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { motion, AnimatePresence } from 'framer-motion';

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

type NestedComment = CommentType & { replies: NestedComment[]; };

const COMMENTS_INITIAL_LOAD = 50; // 🚀 严格遵守 50 条安全底线
const COMMENTS_LOAD_MORE = 50;

function PostPageSkeleton() {
    return (
        <div className="min-h-screen bg-[#020202] text-white">
        <div className="absolute top-0 left-0 w-full z-50 bg-transparent">
            <PageHeaderWithBackAndClose />
        </div>
            <div className="container mx-auto px-4 py-32 max-w-5xl">
                <Card className="bg-black/40 border-white/5 rounded-[40px] p-8 space-y-8 backdrop-blur-xl">
                    <div className="flex items-start gap-6 border-b border-white/10 pb-8">
                        <Skeleton className="h-20 w-20 rounded-full bg-white/5" />
                        <div className="flex-1 space-y-4 pt-2">
                            <Skeleton className="h-8 w-48 bg-white/5 rounded-full" />
                            <Skeleton className="h-4 w-32 bg-white/5 rounded-full" />
                        </div>
                    </div>
                    <div className="space-y-6 pt-4">
                        <Skeleton className="h-10 w-3/4 bg-white/5 rounded-2xl" />
                        <Skeleton className="aspect-video w-full rounded-[32px] bg-white/5" />
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full bg-white/5" />
                            <Skeleton className="h-4 w-full bg-white/5" />
                            <Skeleton className="h-4 w-2/3 bg-white/5" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

const CommentForm = ({ isSubmitting, value, onChange, onSubmit, onCancelClick }: any) => {
    const { t } = useTranslation();
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 bg-white/[0.02] p-4 rounded-3xl border border-white/10">
            <Textarea
                value={value}
                onChange={onChange}
                placeholder={t('productComments.placeholder')}
                maxLength={2000}
                rows={3}
                className="bg-black/50 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 rounded-2xl resize-none"
            />
            <div className="flex items-center justify-between px-2">
                <p className="text-[10px] font-mono tracking-widest text-white/30 uppercase">{value.length} / 2000 CHARS</p>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onCancelClick} className="text-white/50 hover:text-white rounded-full">
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isSubmitting || !value.trim()} className="rounded-full bg-primary text-black hover:bg-primary/80 font-bold px-6 shadow-[0_0_15px_rgba(var(--primary),0.4)] transition-all">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        TRANSMIT
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};

const CommentItem = ({ comment, user, canInteract, handleLikeDislike, setReplyingTo, handleInteractionNotAllowed, setCommentToDelete }: any) => {
    const firestore = useFirestore();
    const { t, language } = useTranslation();
    const { data: author } = useDoc<UserProfile>(firestore ? doc(firestore, 'users', comment.authorId) : null);
    const timeAgo = comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: locales[language as keyof typeof locales] || enUS }) : '';
    const isLiked = user ? comment.likedBy?.includes(user.uid) : false;
    const isDisliked = user ? comment.dislikedBy?.includes(user.uid) : false;
    const profileUrl = `/@${author?.loginId || author?.uid}`;

    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4 group hover:bg-white/[0.02] p-4 -mx-4 rounded-3xl transition-colors duration-500">
            <Link href={profileUrl} className="relative shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-tr from-primary/50 to-blue-500/50 rounded-full opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
                <Avatar className="h-12 w-12 border border-white/10 relative z-10 bg-black">
                    {author?.photoURL && <AvatarImage src={author.photoURL} alt={author.displayName} className="object-cover" />}
                    <AvatarFallback className="bg-[#111] text-primary font-mono">{author?.displayName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                 <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3 truncate">
                        <Link href={profileUrl} className="font-bold text-white hover:text-primary transition-colors truncate">
                            {author?.displayName || 'Unknown Node'}
                        </Link>
                        {author?.location && <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest hidden sm:inline-block"><MapPin className="inline h-3 w-3 mr-1" />{author.location}</span>}
                    </div>
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest shrink-0">{timeAgo}</span>
                </div>
                <p className="text-sm text-white/80 leading-relaxed mb-3 whitespace-pre-wrap break-words">{comment.text}</p>
                
                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 border border-white/5 rounded-full p-1">
                        <button 
                            onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'like')}
                            className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all", isLiked ? "bg-primary/20 text-primary" : "text-white/40 hover:text-white hover:bg-white/5")}
                        >
                            <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-primary")} /> {comment.likes || 0}
                        </button>
                        <button 
                            onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'dislike')}
                            className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all", isDisliked ? "bg-red-500/20 text-red-500" : "text-white/40 hover:text-white hover:bg-white/5")}
                        >
                            <ThumbsDown className={cn("h-3.5 w-3.5", isDisliked && "fill-red-500")} /> {comment.dislikes || 0}
                        </button>
                    </div>
                    
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-full text-xs font-mono text-white/40 hover:text-primary hover:bg-primary/10 h-8"
                        onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: author?.displayName || 'User' }) : handleInteractionNotAllowed()}
                    >
                        <Reply className="mr-2 h-3 w-3 -scale-x-100" /> REPLY
                    </Button>

                     {user?.uid === comment.authorId && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-full text-xs font-mono text-white/20 hover:text-red-400 hover:bg-red-400/10 h-8 ml-auto"
                            onClick={() => setCommentToDelete(comment.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};


export default function BbsPostPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    const firestore = useFirestore();

    const { user, profile } = useUser();
    const id = typeof params.id === 'string' ? params.id : '';

    const postRef = useMemo(() => firestore && id ? doc(firestore, 'bbs', id) : null, [firestore, id]);
    const { data: post, loading: postLoading, error: postError } = useDoc<BbsPost>(postRef);

    // 🚀 核心分页状态：初始 50 条，避免本地缓存树状结构断裂
    const [commentLimit, setCommentLimit] = useState(COMMENTS_INITIAL_LOAD);
    const commentsQuery = useMemo(() => firestore && id ? query(collection(firestore, 'bbs', id, 'comments'), orderBy('createdAt', 'desc'), limit(commentLimit)) : null, [firestore, id, commentLimit]);
    const { data: comments, loading: commentsLoading } = useCollection<CommentType>(commentsQuery);

    const { data: authorProfile } = useDoc<UserProfile>(firestore && post ? doc(firestore, 'users', post.authorId) : null);
    
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [shouldNavigateAfterDelete, setShouldNavigateAfterDelete] = useState(false);
    
    const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    // 鼠标视差背景追踪
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX - window.innerWidth / 2, y: e.clientY - window.innerHeight / 2 });
    };

    const canInteract = user && profile?.kycStatus === 'Verified';
    const isGuest = !user;
    const isOwner = user?.uid === post?.authorId;
    const hasAdminAccess = profile && ['staff', 'ghost', 'admin', 'support'].includes(profile.role || '');

    useEffect(() => { window.scrollTo(0, 0); }, []);

    useEffect(() => {
        if (profile && post) setIsFollowing(profile.following?.includes(post.authorId) || false);
    }, [profile, post]);
    
    useEffect(() => {
        if (shouldNavigateAfterDelete) router.push('/bbs');
    }, [shouldNavigateAfterDelete, router]);

    useEffect(() => {
        if (post?.videos?.some(url => url.includes('tiktok.com'))) {
            const script = document.createElement('script');
            script.src = "https://www.tiktok.com/embed.js";
            script.async = true;
            document.body.appendChild(script);
            return () => { if (document.body.contains(script)) document.body.removeChild(script); }
        }
    }, [post?.videos]);

    useEffect(() => {
        if (firestore && id) {
            updateDoc(doc(firestore, 'bbs', id), { views: increment(1) }).catch(() => {});
        }
    }, [firestore, id]);

    const handleInteractionNotAllowed = () => {
        toast({ variant: 'destructive', title: isGuest ? t('common.loginToInteract') : t('common.verifyToInteract') });
    }
    
    const handleFollowToggle = async () => {
        if (!user || !profile || !post || !firestore) return handleInteractionNotAllowed();
        const newFollowingState = !isFollowing;
        setIsFollowing(newFollowingState);
        const batch = writeBatch(firestore);
        try {
            batch.update(doc(firestore, 'users', user.uid), { following: newFollowingState ? arrayUnion(post.authorId) : arrayRemove(post.authorId), followingCount: increment(newFollowingState ? 1 : -1) });
            batch.update(doc(firestore, 'users', post.authorId), { followers: newFollowingState ? arrayUnion(user.uid) : arrayRemove(user.uid), followersCount: increment(newFollowingState ? 1 : -1) });
            await batch.commit();
            toast({ title: newFollowingState ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess') });
        } catch (error) { setIsFollowing(!newFollowingState); }
    };

    const handlePostComment = () => {
        if (!newComment.trim() || !user || !firestore || !post || !postRef) return;
        if (!canInteract) return handleInteractionNotAllowed();

        setIsSubmitting(true);
        const commentData = {
            authorId: user.uid,
            text: newComment,
            createdAt: serverTimestamp(),
            parentId: replyingTo?.id === 'root' ? null : replyingTo.id,
            likes: 0, dislikes: 0, likedBy: [], dislikedBy: [],
        };
        
        addDoc(collection(firestore, 'bbs', post.id, 'comments'), commentData).then(() => {
            updateDoc(postRef, { replies: increment(1) }).catch(() => {});
            setNewComment('');
            setReplyingTo(null);
            toast({ title: 'LOG_APPENDED', description: 'Your message has been added to the stream.' });
            setIsSubmitting(false);
        }).catch(() => setIsSubmitting(false));
    };
    
    const handleDeleteComment = async () => {
        if (!commentToDelete || !firestore || !post || !postRef) return;
        deleteDoc(doc(firestore, 'bbs', post.id, 'comments', commentToDelete)).then(() => {
            updateDoc(postRef, { replies: increment(-1) }).catch(() => {});
            setCommentToDelete(null);
            toast({ title: 'LOG_EXPUNGED' });
        });
    };

    const handleConfirmCancelReply = () => { setReplyingTo(null); setNewComment(''); setIsCancelDialogOpen(false); };
    
    // 🚀 动态拉伸窗口分页
    const handleLoadMoreComments = () => { setCommentLimit(prev => prev + COMMENTS_LOAD_MORE); };

    const handleDeletePost = async () => {
        if (!postRef) return;
        setIsSubmittingDelete(true);
        try {
            await updateDoc(postRef, { status: 'under_review' as const });
            toast({ title: "STREAM_PAUSED", description: "Node content submitted for manual review." });
            setShouldNavigateAfterDelete(true);
        } catch(e) {} finally { setIsSubmittingDelete(false); setIsDeleteDialogOpen(false); }
    };

    const handleLikeDislike = async (commentId: string, isLiked: boolean, isDisliked: boolean, type: 'like' | 'dislike') => {
        if (!canInteract || !firestore || !user || !post) return handleInteractionNotAllowed();
        const updateData: any = {};
        if (type === 'like') {
            updateData.likedBy = isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid);
            updateData.likes = increment(isLiked ? -1 : 1);
            if (isDisliked) { updateData.dislikedBy = arrayRemove(user.uid); updateData.dislikes = increment(-1); }
        } else {
            updateData.dislikedBy = isDisliked ? arrayRemove(user.uid) : arrayUnion(user.uid);
            updateData.dislikes = increment(isDisliked ? -1 : 1);
            if (isLiked) { updateData.likedBy = arrayRemove(user.uid); updateData.likes = increment(-1); }
        }
        updateDoc(doc(firestore, 'bbs', post.id, 'comments', commentId), updateData).catch(() => {});
    };
    
    const handlePostInteraction = async (type: 'like' | 'favorite') => {
        if (!canInteract || !firestore || !post || !user) return handleInteractionNotAllowed();
        const isLiked = post.likedBy?.includes(user.uid);
        const isFavorited = post.favoritedBy?.includes(user.uid);
        const postRef = doc(firestore, 'bbs', post.id);
        try {
            if (type === 'like') {
                await updateDoc(postRef, { likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid), likes: increment(isLiked ? -1 : 1) });
            } else if (type === 'favorite') {
                await updateDoc(postRef, { favoritedBy: isFavorited ? arrayRemove(user.uid) : arrayUnion(user.uid), favorites: increment(isFavorited ? -1 : 1) });
                if (!isFavorited) toast({ title: 'ADDED_TO_VAULT' });
            }
        } catch(e) {}
    };

    const nestedComments = useMemo(() => {
        if (!comments) return [];
        const commentMap: { [key: string]: NestedComment } = {};
        comments.forEach(c => { commentMap[c.id] = { ...c, replies: [] }; });
        const topLevelComments: NestedComment[] = [];
        comments.forEach(c => {
            if (c.parentId && commentMap[c.parentId]) commentMap[c.parentId].replies.push(commentMap[c.id]);
            else topLevelComments.push(commentMap[c.id]);
        });
        topLevelComments.forEach(c => {
            if (c.replies) c.replies.sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
        });
        return topLevelComments;
    }, [comments]);


    if (postLoading) return <PostPageSkeleton />;
    if (!post || postError) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono text-primary text-2xl tracking-widest animate-pulse">STREAM_CORRUPTED</div>;
    
    const postDate = post.createdAt?.toDate();
    const authorProfileUrl = `/@${authorProfile?.loginId || post.authorId}`;
    
    const renderComments = (commentList: NestedComment[]) => {
      return commentList.map(comment => (
        <div key={comment.id} className="relative">
          <CommentItem comment={comment} user={user} canInteract={canInteract} handleInteractionNotAllowed={handleInteractionNotAllowed} handleLikeDislike={handleLikeDislike} setReplyingTo={setReplyingTo} setCommentToDelete={setCommentToDelete} />
          {replyingTo?.id === comment.id && (
            <div className="mt-4 ml-14 pl-4 border-l-2 border-primary/30">
              <CommentForm isSubmitting={isSubmitting} value={newComment} onChange={(e: any) => setNewComment(e.target.value)} onSubmit={handlePostComment} onCancelClick={() => newComment ? setIsCancelDialogOpen(true) : handleConfirmCancelReply()} />
            </div>
          )}
          {comment.replies.length > 0 && (
            <div className="ml-6 sm:ml-12 mt-4 space-y-2 border-l-2 border-white/10 pl-4 sm:pl-6 relative before:absolute before:inset-y-0 before:-left-[2px] before:w-[2px] before:bg-gradient-to-b before:from-primary/50 before:to-transparent">
              {renderComments(comment.replies)}
            </div>
          )}
        </div>
      ));
    };

    return (
        <div onMouseMove={handleMouseMove} className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-48 lg:pb-64 font-sans">
            
            {/* 🚀 Parallax 背景 */}
            <motion.div animate={{ x: mousePos.x * -0.015, y: mousePos.y * -0.015 }} transition={{ type: "spring", stiffness: 40, damping: 20 }} className="fixed inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:50px_50px]" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen" />
            </motion.div>

            <PageHeaderWithBackAndClose />

            <div className="container mx-auto max-w-4xl px-4 pt-28 lg:pt-32 relative z-10">
                <Card className="w-full bg-[#050505]/80 backdrop-blur-2xl border-white/10 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                    
                    {/* 👤 极客风作者头部 */}
                    <div className="p-6 md:p-8 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                        
                        <div className="flex items-center gap-5 relative z-10">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="relative group cursor-pointer shrink-0">
                                        <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-500 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500" />
                                        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-white/10 relative z-10 bg-black">
                                            <AvatarImage src={authorProfile?.photoURL} className="object-cover" />
                                            <AvatarFallback className="bg-[#111] text-primary font-mono text-xl">{authorProfile?.displayName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="p-0 border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden max-w-md">
                                    <Image src={authorProfile?.photoURL || ''} alt={authorProfile?.displayName || ''} width={512} height={512} className="w-full h-auto" />
                                </DialogContent>
                            </Dialog>
                            
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <Link href={authorProfileUrl} className="hover:text-primary transition-colors">
                                        <h2 className="font-black text-2xl md:text-3xl italic tracking-tighter uppercase">{authorProfile?.displayName}</h2>
                                    </Link>
                                    <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-[10px] uppercase font-mono tracking-widest px-2 py-0.5">
                                        <Zap className="h-3 w-3 mr-1" /> {authorProfile?.creditLevel || 'NODE'}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-xs font-mono text-white/40 uppercase tracking-widest">
                                    <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><Users className="h-3.5 w-3.5" /> {authorProfile?.followersCount || 0} Followers</span>
                                    <span>|</span>
                                    <span className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"><MessageSquare className="h-3.5 w-3.5" /> {authorProfile?.postsCount || 0} Logs</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
                             {user && !isOwner && (
                                <Button onClick={handleFollowToggle} className={cn("rounded-full w-full sm:w-auto font-bold tracking-widest text-xs transition-all", isFollowing ? "bg-white/10 text-white hover:bg-white/20" : "bg-primary text-black hover:bg-primary/80 hover:shadow-[0_0_15px_rgba(var(--primary),0.5)]")}>
                                    {isFollowing ? <Check className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                                    {isFollowing ? 'SYNCED' : 'SYNC NODE'}
                                </Button>
                             )}
                             {(isOwner || hasAdminAccess) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon" className="rounded-full bg-transparent border-white/10 hover:bg-white/10 shrink-0"><MoreHorizontal className="h-5 w-5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10 rounded-2xl p-2 font-mono uppercase text-xs">
                                        {isOwner && <DropdownMenuItem onClick={() => router.push(`/bbs/edit/${id}`)} className="focus:bg-white/10 rounded-xl cursor-pointer py-3"><Edit className="mr-3 h-4 w-4 text-primary" /> Edit Log</DropdownMenuItem>}
                                        {(isOwner || hasAdminAccess) && <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="focus:bg-red-500/20 text-red-500 rounded-xl cursor-pointer py-3"><Trash2 className="mr-3 h-4 w-4" /> Purge Data</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>

                    {/* 📝 帖子正文区 */}
                    <div className="p-6 md:p-10 relative">
                        {/* 装饰性背景水印 */}
                        <div className="absolute right-10 top-10 text-[120px] font-black italic text-white/[0.02] pointer-events-none select-none tracking-tighter leading-none z-0">
                            STREAM
                        </div>

                        <div className="relative z-10">
                            <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter mb-6 leading-tight uppercase drop-shadow-lg">{post.title}</h1>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-white/40 mb-10 border-l-2 border-primary/50 pl-4">
                                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> {postDate ? format(postDate, 'MMM dd, yyyy - HH:mm') : '...'}</span>
                                {authorProfile?.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {authorProfile.location}</span>}
                            </div>

                            <div className="font-sans text-base md:text-lg text-white/80 whitespace-pre-wrap leading-relaxed space-y-4 mb-10">
                                {post.content.split('\n').map((line, index) => <p key={index}>{line}</p>)}
                            </div>

                            {/* 媒体流渲染 */}
                            {post.images && post.images.length > 0 && (
                                <div className="mb-10 rounded-[32px] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                    <BbsPostImageGallery post={post} onLikeToggle={() => handlePostInteraction('like')} onFavoriteToggle={() => handlePostInteraction('favorite')} />
                                </div>
                            )}
                            
                            {post.videos && post.videos.length > 0 && (
                                <div className="mb-10 space-y-6">
                                {post.videos.map((videoUrl, index) => {
                                    if (videoUrl.includes('youtube.com/embed')) return <div key={index} className="aspect-video w-full max-w-4xl mx-auto overflow-hidden rounded-[32px] border border-white/10 shadow-2xl"><iframe width="100%" height="100%" src={videoUrl} frameBorder="0" allowFullScreen></iframe></div>;
                                    if (videoUrl.includes('tiktok.com')) return <div key={index} className="mx-auto flex justify-center"><blockquote className="tiktok-embed rounded-3xl overflow-hidden" cite={videoUrl} data-video-id={videoUrl.split('video/')[1]?.split('?')[0]} style={{maxWidth: '340px'}}><section></section></blockquote></div>;
                                    return null;
                                })}
                                </div>
                            )}

                            {/* 标签 */}
                            <div className="flex flex-wrap gap-2">
                            {post.isFeatured && (
                                <Badge variant="outline" className="text-xs border-amber-400 bg-amber-400/10 text-amber-400 font-mono py-1 px-3 shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                                    <Star className="mr-1.5 h-3.5 w-3.5 fill-amber-400" /> SYSTEM_FEATURED
                                </Badge>
                            )}
                            {post.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="bg-white/5 hover:bg-white/10 text-white/60 font-mono py-1 px-3 border border-white/5 transition-colors">
                                    #{tag.toUpperCase()}
                                </Badge>
                            ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* 💬 流体评论区 */}
                     <div id="comments" className="bg-[#020202]/80 border-t border-white/5 p-6 md:p-10 scroll-mt-32">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                                <MessageSquare className="h-6 w-6 text-primary" /> 
                                FEEDBACK LOGS <span className="text-primary text-xl">[{post.replies || 0}]</span>
                            </h3>
                        </div>

                        {canInteract && !replyingTo && (
                            <Button
                                variant="outline"
                                className="w-full justify-center rounded-3xl border-2 border-dashed border-white/10 bg-black/40 p-8 text-lg font-mono text-white/40 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 mb-10 group"
                                onClick={() => setReplyingTo({ id: 'root', authorName: 'Post' })}
                            >
                                <span className="group-hover:animate-pulse">_INITIATE_NEW_TRANSMISSION...</span>
                            </Button>
                        )}
                        
                        {replyingTo?.id === 'root' && (
                             <div className="mb-10">
                                <CommentForm isSubmitting={isSubmitting} value={newComment} onChange={(e: any) => setNewComment(e.target.value)} onSubmit={handlePostComment} onCancelClick={() => newComment ? setIsCancelDialogOpen(true) : handleConfirmCancelReply()} />
                             </div>
                        )}

                        <div className="space-y-6 relative">
                            {/* 评论左侧的极客连接线 */}
                            <div className="absolute left-6 sm:left-12 top-0 bottom-0 w-[1px] bg-gradient-to-b from-white/10 via-white/5 to-transparent pointer-events-none -z-10" />
                            
                            <AnimatePresence>
                                {commentsLoading && nestedComments.length === 0 ? (
                                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
                                ) : (
                                    renderComments(nestedComments)
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* 🚀 动态加载更多评论 */}
                        {comments && comments.length >= commentLimit && (
                            <div className="text-center mt-12 relative z-10">
                                <Button 
                                    onClick={handleLoadMoreComments} 
                                    disabled={!canInteract}
                                    className="rounded-full bg-black border border-primary/30 text-primary hover:bg-primary hover:text-black hover:shadow-[0_0_20px_rgba(var(--primary),0.6)] px-10 py-6 font-bold tracking-widest uppercase transition-all duration-500"
                                >
                                    DECRYPT_MORE_LOGS
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* 对话框保持极客深色风格 */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!isSubmittingDelete) { setIsDeleteDialogOpen(open); if (!open) setShouldNavigateAfterDelete(false); } }}>
                <AlertDialogContent className="bg-black/95 border border-red-500/30 rounded-3xl backdrop-blur-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-500 font-mono font-bold text-xl flex items-center gap-2"><Trash2 className="h-5 w-5"/> SYSTEM_WARNING</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60 text-base">You are about to purge this data stream. This will hide the log and submit it for admin review. Proceed?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel disabled={isSubmittingDelete} className="rounded-xl border-white/10 hover:bg-white/5 text-white">ABORT</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePost} disabled={isSubmittingDelete} className="bg-red-500 text-black font-bold rounded-xl hover:bg-red-600">
                            {isSubmittingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} PURGE
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent className="bg-black/95 border border-white/10 rounded-3xl backdrop-blur-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-mono text-white text-xl">DISCARD_TRANSMISSION?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">Your current input stream will be lost.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                        <Button onClick={() => setIsCancelDialogOpen(false)} variant="ghost" className="rounded-xl text-white/60 hover:text-white">KEEP TYPING</Button>
                        <Button onClick={handleConfirmCancelReply} className="bg-white/10 text-white border border-white/20 rounded-xl hover:bg-red-500 hover:text-black hover:border-red-500 transition-colors">DISCARD</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
                <AlertDialogContent className="bg-black/95 border border-red-500/30 rounded-3xl backdrop-blur-xl">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-500 font-mono font-bold text-xl flex items-center gap-2"><Trash2 className="h-5 w-5"/> EXPUNGE_LOG?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60 text-base">This action is irreversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel onClick={() => setCommentToDelete(null)} className="rounded-xl border-white/10 hover:bg-white/5 text-white">ABORT</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteComment} className="bg-red-500 text-black font-bold rounded-xl hover:bg-red-600">CONFIRM</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}