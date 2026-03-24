'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, Loader2, MessageSquare, Reply, X, ThumbsDown, Trash2, Heart, Sparkles, TerminalSquare, Lock } from 'lucide-react';
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
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <Textarea
        value={value}
        onChange={onChange}
        placeholder={t('productCommentSection.placeholder')}
        maxLength={500}
        rows={3}
        className="bg-black/60 border-purple-500/30 text-white rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all resize-none shadow-inner textarea-scrollbar"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-primary/50">{t('productCommentSection.charLimit').replace('{count}', String(value.length))}</p>
        <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onCancelClick} className="text-white/50 hover:text-white hover:bg-white/5 rounded-xl text-xs uppercase tracking-widest font-bold">
              {t('productComments.cancelReply')}
            </Button>
            {/* 🚀 统一风格：渐变紫发光提交按钮 */}
            <Button 
                onClick={onSubmit} 
                disabled={isSubmitting || !value.trim()} 
                className="h-12 px-8 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-[0.2em] text-xs rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-transform"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('productComments.submit')}
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
    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
        <Link href={profileUrl} className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <Avatar className="h-10 w-10 border border-white/10 shadow-lg relative">
                {author?.photoURL && <AvatarImage src={author.photoURL} alt={authorName} />}
                <AvatarFallback className="bg-black text-primary font-black">{authorName.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
        </Link>
        <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
                <Link href={profileUrl} className="font-black text-sm text-white hover:text-primary transition-colors uppercase tracking-wider">
                    {authorName}
                </Link>
                <div className="flex items-center gap-1 text-xs text-white/40 font-mono">
                    <span>{timeAgo}</span>
                </div>
            </div>
            
            <p className="text-sm text-white/80 leading-relaxed font-medium">{comment.text}</p>
            
            <div className="flex items-center gap-2 pt-2">
                <Button variant="ghost" onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'like')} className={cn("h-8 px-2 rounded-lg text-xs font-bold hover:bg-white/5 transition-all gap-1.5", isLiked ? "text-pink-500" : "text-white/40 hover:text-pink-400")}>
                    <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-pink-500")} /> {comment.likes || 0}
                </Button>
                
                <Button variant="ghost" onClick={() => handleLikeDislike(comment.id, !!isLiked, !!isDisliked, 'dislike')} className={cn("h-8 px-2 rounded-lg text-xs font-bold hover:bg-white/5 transition-all gap-1.5", isDisliked ? "text-purple-400" : "text-white/40 hover:text-purple-400")}>
                    <ThumbsDown className={cn("h-3.5 w-3.5", isDisliked && "fill-purple-400")} /> {comment.dislikes || 0}
                </Button>

                <div className="w-px h-3 bg-white/10 mx-1" />

                <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-lg" onClick={() => canInteract ? setReplyingTo({ id: comment.id, authorName: authorName }) : handleInteractionNotAllowed()}>
                    <Reply className="mr-1 h-3.5 w-3.5 -scale-x-100" /> {t('productComments.reply')}
                </Button>

                {user?.uid === comment.authorId && (
                     <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-red-500/50 hover:text-red-400 hover:bg-red-500/10 rounded-lg ml-auto" onClick={() => setCommentToDelete(comment.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
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
                title: t('productCommentSection.postError'),
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
            toast({ title: t('productCommentSection.deleteError'), variant: 'destructive'});
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
                title: t('productCommentSection.likeError'),
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
        <div key={comment.id} className="animate-in fade-in slide-in-from-bottom-4">
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
            <div className="mt-2 ml-14 pl-4 border-l-2 border-primary/30">
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
            <div className="ml-12 mt-2 space-y-2 border-l-2 border-white/5 pl-2">
              {renderComments(comment.replies)}
            </div>
          )}
        </div>
      ));
    };


    return (
        <div className="relative group rounded-[2rem] overflow-hidden bg-transparent">
            {/* 🚀 极其关键：注入隐藏和美化滚动条的内部 CSS */}
            <style dangerouslySetInnerHTML={{__html: `
                .laser-scrollbar::-webkit-scrollbar { width: 4px; }
                .laser-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .laser-scrollbar::-webkit-scrollbar-thumb { 
                    background: linear-gradient(to bottom, #a855f7, #c026d3); 
                    border-radius: 4px; 
                    box-shadow: 0 0 10px rgba(168,85,247,0.8);
                }
                .laser-scrollbar::-webkit-scrollbar-thumb:hover { background: #d946ef; }
                
                .textarea-scrollbar::-webkit-scrollbar { width: 2px; }
                .textarea-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .textarea-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.4); border-radius: 2px; }
            `}} />

            {/* 底层动态流体呼吸光晕 */}
            <div className="absolute top-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-[80px] opacity-40 group-hover:opacity-80 transition-opacity duration-1000 animate-blob pointer-events-none" />
            <div className="absolute bottom-10 -right-10 w-56 h-56 bg-purple-600/20 rounded-full blur-[80px] opacity-40 group-hover:opacity-80 transition-opacity duration-1000 animate-blob animation-delay-2000 pointer-events-none" />

            {/* 高透玻璃舱主体 */}
            <div className="relative z-10">
                <div className="space-y-8 pt-2">
                    {canInteract ? (
                        (!replyingTo || replyingTo.id !== 'root') && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {/* 🚀 统一风格：渐变紫发光发起留言按钮 */}
                                        <Button
                                            className="w-full h-16 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-[0.3em] shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-[1.02] transition-transform rounded-2xl mb-8"
                                            onClick={() => setReplyingTo({id: 'root', authorName: 'Post'})}
                                        >
                                            <Sparkles className="w-5 h-5 mr-3" /> {t('productCommentSection.shareYourThoughts')}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black/90 border-primary/30 text-primary font-mono text-xs">
                                        <p>{t('productComments.tooltip')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 bg-white/[0.02] rounded-2xl mb-8">
                            <Lock className="w-6 h-6 text-white/30 mb-3" />
                            <p className="text-sm font-bold text-white/50 tracking-wide uppercase">{isGuest ? t('common.loginToInteract') : t('common.verifyToInteract')}</p>
                        </div>
                    )}
                    
                    {replyingTo?.id === 'root' && (
                            <div className="mb-8 p-1 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-600/10">
                                <div className="bg-[#0A0A0C] p-5 rounded-xl border border-white/5">
                                    <CommentForm
                                        isSubmitting={isSubmitting}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onSubmit={handlePostComment}
                                        onCancelClick={() => newComment ? setIsCancelDialogOpen(true) : handleConfirmCancelReply()}
                                    />
                                </div>
                            </div>
                    )}
                    
                    {nestedComments.length > 0 && <Separator className="bg-white/5" />}

                    {commentsLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
                    ) : nestedComments.length > 0 ? (
                        /* 🚀 应用自定义激光滚动条，并限制最大高度触发滚动 */
                        <div className="space-y-4 mt-4 max-h-[500px] overflow-y-auto laser-scrollbar pr-3 pb-4">
                            {renderComments(nestedComments.slice(0, visibleCommentsCount))}
                        </div>
                    ) : (
                         <div className="text-center py-16 text-white/30 flex flex-col items-center">
                            <MessageSquare className="h-10 w-10 mb-4 opacity-50" />
                            <p className="font-bold text-sm tracking-widest uppercase">{t('productCommentSection.noLogsFound')}</p>
                            <p className="text-xs font-mono mt-2">{t('productCommentSection.initiateFirstTransmission')}</p>
                        </div>
                    )}
                    
                    {comments && comments.length > visibleCommentsCount && (
                        <div className="text-center mt-10">
                            <Button variant="outline" onClick={handleLoadMore} className="rounded-full bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 uppercase text-xs tracking-widest font-bold">
                                {t('productCommentSection.loadArchives')} <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* 警告弹窗同样加上紫色系点缀 */}
            <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
                <AlertDialogContent className="bg-[#0A0A0C] border-red-500/30 text-white rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-500 flex items-center gap-2"><Trash2 className="w-5 h-5"/> {t('productComments.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                        {t('productComments.deleteConfirmDescription')}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={() => setCommentToDelete(null)}>{t('productComments.deleteCancel')}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteComment}
                        className="bg-red-500 hover:bg-red-600 text-white"
                    >
                        {t('productComments.deleteConfirmAction')}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                <AlertDialogContent className="bg-[#0A0A0C] border-primary/30 text-white rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.15)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('productComments.cancelConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">{t('productComments.cancelConfirmDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button onClick={() => setIsCancelDialogOpen(false)} variant="default" className="bg-white/10 text-white hover:bg-white/20">{t('productComments.continueEditing')}</Button>
                        <Button onClick={handleConfirmCancelReply} variant="outline" className="border-primary/50 text-primary bg-primary/10 hover:bg-primary/20">
                            {t('productComments.cancelConfirmAction')}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}