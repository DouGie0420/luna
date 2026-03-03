'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc, useCollection } from '@/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
    Loader2, Plus, MessageSquare, Calendar, X, MoreHorizontal, Edit, 
    Trash2, Check, Reply, ThumbsUp, ThumbsDown, MapPin, Star, Heart, 
    Zap, Users, Sparkles, ArrowLeft, Home 
} from 'lucide-react';
import { 
    doc, collection, query, orderBy, addDoc, updateDoc, deleteDoc, 
    serverTimestamp, increment, arrayUnion, arrayRemove, writeBatch, limit 
} from 'firebase/firestore';
import type { BbsPost, UserProfile, Comment as CommentType } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils'; 

import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { BbsPostImageGallery } from '@/components/bbs-post-image-gallery';

const locales = { en: enUS, zh: zhCN, th: th };
type NestedComment = CommentType & { replies: NestedComment[]; };

const COMMENTS_INITIAL_LOAD = 50; 
const COMMENTS_LOAD_MORE = 50;

// 🚀 终极美学：孤寂的深空 + 纯粹的高亮流体对撞
const somniaStyles = `
  .abyss-void {
    position: fixed; inset: 0;
    background-color: #030305;
    z-index: -10;
  }
  .fluid-cyan {
    position: fixed;
    top: -10%; left: -10%;
    width: 60vw; height: 60vw;
    background: radial-gradient(circle, rgba(0, 240, 255, 0.25) 0%, transparent 60%);
    filter: blur(100px);
    animation: float-cyan 20s ease-in-out infinite alternate;
    z-index: -9;
    pointer-events: none;
  }
  .fluid-magenta {
    position: fixed;
    bottom: -10%; right: -10%;
    width: 70vw; height: 70vw;
    background: radial-gradient(circle, rgba(255, 0, 100, 0.2) 0%, transparent 60%);
    filter: blur(120px);
    animation: float-magenta 25s ease-in-out infinite alternate;
    z-index: -8;
    pointer-events: none;
  }
  @keyframes float-cyan { 
    0% { transform: translate(0, 0) scale(1); } 
    100% { transform: translate(5%, 10%) scale(1.1); } 
  }
  @keyframes float-magenta { 
    0% { transform: translate(0, 0) scale(1); } 
    100% { transform: translate(-10%, -5%) scale(1.2); } 
  }
  .grain-noise {
    position: fixed; inset: 0;
    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
    opacity: 0.15; mix-blend-mode: overlay; pointer-events: none;
    z-index: -1;
  }
  .font-somnia { font-family: 'Playfair Display', serif; }
  .somnia-title-glow { text-shadow: 0 0 50px rgba(255, 255, 255, 0.3); }
`;

function PostPageSkeleton() {
    return (
        <div className="min-h-screen bg-black">
            <div className="container mx-auto px-4 py-32 max-w-5xl"><Skeleton className="h-[400px] w-full rounded-[40px] bg-white/5" /></div>
        </div>
    );
}

const CommentForm = ({ isSubmitting, value, onChange, onSubmit, onCancelClick }: any) => {
    const { t } = useTranslation();
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-white/[0.03] p-6 rounded-[32px] border border-white/10 backdrop-blur-3xl">
            <Textarea value={value} onChange={onChange} placeholder={t('productComments.placeholder')} maxLength={2000} rows={3} className="bg-black/50 border-white/10 text-white focus-visible:ring-primary/50 rounded-2xl resize-none p-5" />
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono tracking-[0.2em] text-white/20 uppercase">{value.length} / 2000</p>
                <div className="flex gap-3">
                    <Button variant="ghost" onClick={onCancelClick} className="text-white/40 hover:text-white rounded-full text-xs font-black uppercase">Cancel</Button>
                    <Button onClick={onSubmit} disabled={isSubmitting || !value.trim()} className="rounded-full bg-primary text-black font-black px-8 shadow-[0_0_20px_#ec4899]">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "TRANSMIT"}
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

    return (
        <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-4 p-5 rounded-[28px] hover:bg-white/[0.02] transition-colors group/item">
            <Link href={`/@${author?.loginId || author?.uid}`} className="shrink-0">
                <Avatar className="h-10 w-10 border border-white/10 bg-black">
                    <AvatarImage src={author?.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-[#111] text-primary">{(author?.displayName || "?").charAt(0)}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-sm text-white/90">{author?.displayName || 'Protocol User'}</span>
                        <span className="text-[9px] font-mono text-white/20 uppercase">{timeAgo}</span>
                    </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">{comment.text}</p>
                <div className="flex items-center gap-6">
                    <div className="flex gap-2 p-1 bg-black/40 rounded-full border border-white/5">
                        <button onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'like')} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all", isLiked ? "bg-primary/20 text-primary" : "text-white/20 hover:text-white")}><Heart className={cn("h-3 w-3", isLiked && "fill-primary")} /> {comment.likes || 0}</button>
                        <button onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'dislike')} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black transition-all", isDisliked ? "bg-red-500/20 text-red-500" : "text-white/20 hover:text-white")}><ThumbsDown className="h-3 w-3" /> {comment.dislikes || 0}</button>
                    </div>
                    <button onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: author?.displayName || 'User' }) : handleInteractionNotAllowed()} className="text-[10px] font-black text-white/30 hover:text-primary uppercase tracking-widest transition-colors">Reply</button>
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

    const [commentLimit, setCommentLimit] = useState(COMMENTS_INITIAL_LOAD);
    const commentsQuery = useMemo(() => firestore && id ? query(collection(firestore, 'bbs', id, 'comments'), orderBy('createdAt', 'desc'), limit(commentLimit)) : null, [firestore, id, commentLimit]);
    const { data: comments, loading: commentsLoading } = useCollection<CommentType>(commentsQuery);
    const { data: authorProfile } = useDoc<UserProfile>(firestore && post ? doc(firestore, 'users', post.authorId) : null);
    
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    const canInteract = user && profile?.kycStatus === 'Verified';
    const isOwner = user?.uid === post?.authorId;

    useEffect(() => { if (profile && post) setIsFollowing(profile.following?.includes(post.authorId) || false); }, [profile, post]);

    useEffect(() => {
        if (firestore && id) updateDoc(doc(firestore, 'bbs', id), { views: increment(1) }).catch(() => {});
        if (post?.videos?.some(url => url.includes('tiktok.com'))) {
            const script = document.createElement('script'); script.src = "https://www.tiktok.com/embed.js"; script.async = true;
            document.body.appendChild(script);
            return () => { if (document.body.contains(script)) document.body.removeChild(script); }
        }
    }, [firestore, id, post?.videos]);

    const handleFollowToggle = async () => {
        if (!user || !profile || !post || !firestore) return toast({ variant: 'destructive', title: t('common.loginToInteract') });
        const newS = !isFollowing; setIsFollowing(newS);
        const batch = writeBatch(firestore);
        try {
            batch.update(doc(firestore, 'users', user.uid), { following: newS ? arrayUnion(post.authorId) : arrayRemove(post.authorId), followingCount: increment(newS ? 1 : -1) });
            batch.update(doc(firestore, 'users', post.authorId), { followers: newS ? arrayUnion(user.uid) : arrayRemove(user.uid), followersCount: increment(newS ? 1 : -1) });
            await batch.commit();
            toast({ title: newS ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess') });
        } catch (e) { setIsFollowing(!newS); }
    };

    const handlePostComment = () => {
        if (!newComment.trim() || !user || !firestore || !post || !postRef) return;
        if (!canInteract) return toast({ variant: 'destructive', title: t('common.verifyToInteract') });
        setIsSubmitting(true);
        const data = { authorId: user.uid, text: newComment, createdAt: serverTimestamp(), parentId: replyingTo?.id === 'root' ? null : replyingTo?.id, likes: 0, dislikes: 0, likedBy: [], dislikedBy: [] };
        addDoc(collection(firestore, 'bbs', post.id, 'comments'), data).then(() => {
            updateDoc(postRef, { replies: increment(1) }).catch(() => {});
            setNewComment(''); setReplyingTo(null); setIsSubmitting(false);
            toast({ title: 'LOG_APPENDED' });
        }).catch(() => setIsSubmitting(false));
    };

    const handleLikeDislike = async (cid: string, liked: boolean, disliked: boolean, type: 'like' | 'dislike') => {
        if (!canInteract || !firestore || !user || !post) return toast({ variant: 'destructive', title: t('common.verifyToInteract') });
        const uData: any = {};
        if (type === 'like') {
            uData.likedBy = liked ? arrayRemove(user.uid) : arrayUnion(user.uid); uData.likes = increment(liked ? -1 : 1);
            if (disliked) { uData.dislikedBy = arrayRemove(user.uid); uData.dislikes = increment(-1); }
        } else {
            uData.dislikedBy = disliked ? arrayRemove(user.uid) : arrayUnion(user.uid); uData.dislikes = increment(disliked ? -1 : 1);
            if (liked) { uData.likedBy = arrayRemove(user.uid); uData.likes = increment(-1); }
        }
        updateDoc(doc(firestore, 'bbs', post.id, 'comments', cid), uData);
    };

    const nestedComments = useMemo(() => {
        if (!comments) return [];
        const map: { [key: string]: NestedComment } = {};
        comments.forEach(c => { map[c.id] = { ...c, replies: [] }; });
        const top: NestedComment[] = [];
        comments.forEach(c => {
            if (c.parentId && map[c.parentId]) map[c.parentId].replies.push(map[c.id]);
            else top.push(map[c.id]);
        });
        top.forEach(c => c.replies.sort((a, b) => (a.createdAt?.toDate().getTime() || 0) - (b.createdAt?.toDate().getTime() || 0)));
        return top;
    }, [comments]);

    if (postLoading) return <PostPageSkeleton />;
    if (!post || postError) return <div className="min-h-screen bg-[#030305] flex items-center justify-center font-mono text-primary animate-pulse">STREAM_CORRUPTED</div>;

    const postDate = post.createdAt?.toDate();
    const renderComments = (list: NestedComment[]) => list.map(c => (
        <div key={c.id} className="relative">
            <CommentItem comment={c} user={user} canInteract={canInteract} handleLikeDislike={handleLikeDislike} setReplyingTo={setReplyingTo} handleInteractionNotAllowed={() => toast({ variant: 'destructive', title: t('common.verifyToInteract') })} />
            {replyingTo?.id === c.id && <div className="mt-4 ml-14"><CommentForm isSubmitting={isSubmitting} value={newComment} onChange={(e: any) => setNewComment(e.target.value)} onSubmit={handlePostComment} onCancelClick={() => setReplyingTo(null)} /></div>}
            {c.replies.length > 0 && <div className="ml-8 sm:ml-14 mt-2 border-l border-white/5 pl-4">{renderComments(c.replies)}</div>}
        </div>
    ));

    return (
        <div className="min-h-screen relative text-white selection:bg-cyan-500/30 pt-0 pb-32 isolate">
            <style dangerouslySetInnerHTML={{ __html: somniaStyles }} />
            
            {/* 🌌 背景引擎：纯净孤寂 + 高亮流体对撞，完全抛弃几何图案 */}
            <div className="abyss-void" />
            <div className="fluid-cyan" />
            <div className="fluid-magenta" />
            <div className="grain-noise" />

            {/* 🚀 物理对齐：w-full px-4 md:px-8 完美匹配全局导航栏边缘 */}
            <header className="sticky top-[64px] z-[100] w-full border-b border-t border-white/5 bg-black/80 backdrop-blur-2xl h-24 flex items-center shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
                <div className="w-full px-4 md:px-8 flex items-center justify-between gap-4">
                    
                    {/* 左侧：BACK */}
                    <motion.button onClick={() => router.back()} whileHover={{ scale: 1.05 }} className="flex items-center gap-3 group shrink-0">
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-white group-hover:border-white/30 transition-all shadow-lg"><ArrowLeft size={20}/></div>
                        <span className="hidden md:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-all drop-shadow-md">[ BACK ]</span>
                    </motion.button>
                    
                    {/* 中央：空出呼吸感 */}
                    <div className="flex-1"></div>

                    {/* 右侧：HOME */}
                    <Link href="/" className="flex items-center gap-3 group shrink-0">
                        <span className="hidden md:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-cyan-400 transition-all drop-shadow-md">[ HOME ]</span>
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-cyan-400 group-hover:border-cyan-400/40 transition-all shadow-lg"><Home size={20}/></div>
                    </Link>

                </div>
            </header>

            {/* 主内容区依然居中 */}
            <main className="container mx-auto max-w-5xl px-4 pt-12 relative z-10">
                <Card className="w-full bg-[#05050A]/70 backdrop-blur-3xl border-white/10 rounded-[48px] overflow-hidden shadow-2xl isolate">
                    
                    {/* 🌌 HERO SECTION */}
                    <div className="relative h-[420px] flex items-center justify-center overflow-hidden border-b border-white/10">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#05050A] z-10" />
                        
                        <div className="relative z-20 text-center px-8 space-y-8">
                            <Sparkles className="w-10 h-10 text-cyan-400/60 animate-pulse mx-auto" />
                            <h1 className="font-somnia text-4xl md:text-6xl lg:text-7xl font-black italic bg-gradient-to-b from-white via-white/90 to-white/50 bg-clip-text text-transparent somnia-title-glow tracking-tighter leading-tight uppercase relative">
                                {post.title}
                            </h1>
                            <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
                            <div className="flex items-center justify-center gap-6 text-[10px] md:text-xs font-mono text-white/40 uppercase tracking-[0.5em] italic">
                                <span>{postDate ? format(postDate, 'MMM dd, yyyy') : '...'}</span>
                                <span className="w-1.5 h-1.5 bg-cyan-400/50 rounded-full" />
                                <span>{post.location?.city || 'ORBIT'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12 space-y-16">
                        {/* 👤 优化作者栏 */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 bg-white/[0.02] p-8 rounded-[40px] border border-white/5 ring-1 ring-white/5">
                            <div className="flex items-center gap-6">
                                <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400 to-fuchsia-500 blur-md opacity-40 animate-pulse" />
                                    <div className="relative h-[72px] w-[72px] rounded-full bg-black ring-[4px] ring-[#05050A] overflow-hidden z-10">
                                        <Avatar className="h-full w-full"><AvatarImage src={authorProfile?.photoURL} className="object-cover" /><AvatarFallback className="bg-black text-cyan-400 font-black uppercase text-xl">{authorProfile?.displayName?.charAt(0)}</AvatarFallback></Avatar>
                                    </div>
                                    {authorProfile?.isPro && <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-2.5 py-0.5 rounded-md font-black text-[10px] shadow-[0_0_15px_rgba(250,204,21,0.5)] z-20 uppercase tracking-widest">PRO</div>}
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-white/90">{authorProfile?.displayName}</h3>
                                    <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {authorProfile?.followersCount || 0} Nodes</span>
                                        <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {authorProfile?.postsCount || 0} Logs</span>
                                    </div>
                                </div>
                            </div>
                            {user && !isOwner && (
                                <Button onClick={handleFollowToggle} className={cn("rounded-full px-12 h-14 font-black tracking-widest text-xs transition-all uppercase relative z-10", isFollowing ? "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10" : "bg-cyan-500 text-black hover:bg-cyan-400 hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)]")}>
                                    {isFollowing ? 'Synced' : 'Sync Node'}
                                </Button>
                            )}
                        </div>

                        {/* 📝 正文与媒体 */}
                        <div className="space-y-12">
                            <div className="font-sans text-lg md:text-xl text-white/80 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/40 p-2">
                                {post.content}
                            </div>
                            {post.images && post.images.length > 0 && <div className="rounded-[40px] overflow-hidden border border-white/5 shadow-2xl"><BbsPostImageGallery post={post} onLikeToggle={() => {}} onFavoriteToggle={() => {}} /></div>}
                            
                            <div className="flex flex-wrap gap-3 pt-6">
                                {post.tags.map(t => <Badge key={t} className="bg-white/5 border border-white/10 text-white/60 font-mono text-[10px] uppercase px-5 py-2 rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50 transition-all">#{t}</Badge>)}
                            </div>
                        </div>

                        {/* 💬 评论系统 */}
                        <div className="pt-16 border-t border-white/10 space-y-12">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                                    <Zap className="h-8 w-8 text-fuchsia-500 animate-pulse" /> Feedback_Stream <span className="text-white/20 text-2xl">[{post.replies || 0}]</span>
                                </h3>
                            </div>
                            
                            {canInteract && !replyingTo && (
                                <Button variant="outline" className="w-full py-12 rounded-[32px] border-2 border-dashed border-white/10 bg-black/20 font-mono text-white/30 hover:text-fuchsia-400 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all uppercase tracking-[0.5em] text-xs" onClick={() => setReplyingTo({ id: 'root', authorName: 'Post' })}>_INITIATE_TRANSMISSION...</Button>
                            )}
                            
                            {replyingTo?.id === 'root' && <CommentForm isSubmitting={isSubmitting} value={newComment} onChange={(e: any) => setNewComment(e.target.value)} onSubmit={handlePostComment} onCancelClick={() => setReplyingTo(null)} />}
                            
                            <div className="space-y-6">{renderComments(nestedComments)}</div>
                        </div>
                    </div>
                </Card>
            </main>

            <style jsx global>{`
                .font-somnia { font-family: 'Playfair Display', serif; }
            `}</style>
        </div>
    );
}