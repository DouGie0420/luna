// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { FileText, Plus, Loader2, Package, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import type { BbsPost } from '@/lib/types';

const PAGE_SIZE = 20;

function PostCard({ post, index }: { post: BbsPost; index: number }) {
    const cover = post.images?.[0];
    const commentCount = post.comments ?? 0;
    const likeCount = post.likes ?? 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
        >
            <Link href={`/bbs/${post.id}`} className="group flex gap-4 p-4 rounded-2xl border border-white/8 bg-[#0d0715]/80 hover:border-purple-500/35 hover:shadow-[0_4px_20px_rgba(168,85,247,0.1)] transition-all duration-300 block">
                {cover && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/8">
                        <Image src={cover} alt="cover" fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug group-hover:text-purple-300 transition-colors mb-1.5">
                        {post.title || post.content?.slice(0, 60) || '无标题'}
                    </h3>
                    {post.content && post.title && (
                        <p className="text-xs text-white/35 line-clamp-2 mb-2">{post.content}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-white/30 font-mono">
                        <span>{post.createdAt?.toDate ? format(post.createdAt.toDate(), 'MM/dd HH:mm') : '—'}</span>
                        <span className="flex items-center gap-1">❤️ {likeCount}</span>
                        <span className="flex items-center gap-1">💬 {commentCount}</span>
                        {post.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400/70 border border-purple-500/15"># {tag}</span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center shrink-0">
                    <Link
                        href={`/bbs/edit/${post.id}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 h-8 px-3 rounded-xl bg-white/5 border border-white/8 text-white/40 hover:text-purple-400 hover:border-purple-500/30 transition-all text-[11px] font-semibold"
                    >
                        编辑 <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
            </Link>
        </motion.div>
    );
}

export default function MyPostsPage() {
    const { user, loading: authLoading } = useUser();
    const db = useFirestore();

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const [posts, setPosts] = useState<BbsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchPosts = useCallback(async (isNextPage = false) => {
        if (!user?.uid || !db) return;
        if (isNextPage && !lastVisible) return;
        isNextPage ? setLoadingMore(true) : setLoading(true);
        try {
            let q = query(
                collection(db, 'bbs'),
                where('authorId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            );
            if (isNextPage && lastVisible) q = query(q, startAfter(lastVisible));
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as BbsPost));
            setPosts(prev => isNextPage ? [...prev, ...items] : items);
            setLastVisible(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) { console.error(err); }
        finally { isNextPage ? setLoadingMore(false) : setLoading(false); }
    }, [user?.uid, db, lastVisible]);

    useEffect(() => { if (mounted && user?.uid && db) fetchPosts(); }, [user?.uid, db, mounted]);

    if (!mounted || authLoading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-7 w-7 animate-spin text-purple-400" />
        </div>
    );
    if (!user) return null;

    return (
        <div suppressHydrationWarning className="p-4 md:p-5">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/12 border border-purple-500/25 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-none">我的帖子</h1>
                        <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest mt-0.5">My Posts</p>
                    </div>
                </div>
                <Link href="/bbs/new">
                    <Button size="sm" className="h-8 px-4 bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 hover:text-white text-xs font-bold rounded-xl">
                        <Plus className="w-3.5 h-3.5 mr-1" />发新帖
                    </Button>
                </Link>
            </motion.div>

            {/* Stats */}
            {!loading && posts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border border-purple-500/20 bg-purple-500/8"
                >
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/40 to-transparent hidden" />
                    <span className="text-3xl font-black text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">{posts.length}{hasMore ? '+' : ''}</span>
                    <span className="text-sm text-purple-400/60 font-bold">篇帖子</span>
                    <span className="text-white/15 mx-1">|</span>
                    <span className="text-sm text-purple-400 font-bold">❤️ {posts.reduce((s, p) => s + (p.likes ?? 0), 0)}</span>
                    <span className="text-xs text-white/30">总点赞</span>
                </motion.div>
            )}

            {/* Loading skeletons */}
            {loading && (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl bg-white/[0.03]" />)}
                </div>
            )}

            {/* Empty */}
            {!loading && posts.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="py-24 text-center border border-dashed border-white/8 rounded-2xl">
                    <Package className="mx-auto h-10 w-10 mb-3 text-white/12" />
                    <p className="text-sm font-bold uppercase tracking-widest text-white/25 mb-4">还没有发布过帖子</p>
                    <Link href="/bbs/new">
                        <Button size="sm" className="bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25 text-xs rounded-xl">
                            <Plus className="w-3.5 h-3.5 mr-1" />去发第一篇帖子
                        </Button>
                    </Link>
                </motion.div>
            )}

            {/* Post list */}
            {!loading && posts.length > 0 && (
                <div className="space-y-3">
                    {posts.map((post, i) => (
                        <PostCard key={post.id} post={post} index={i} />
                    ))}
                </div>
            )}

            {/* Load more */}
            {hasMore && !loading && posts.length > 0 && (
                <div className="mt-6 text-center">
                    <Button onClick={() => fetchPosts(true)} disabled={loadingMore} variant="ghost"
                        className="text-white/35 hover:text-purple-400 text-[11px] font-bold uppercase tracking-widest border border-white/8 hover:border-purple-500/30 py-4 px-8 rounded-full transition-all">
                        {loadingMore ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : null}
                        加载更多
                    </Button>
                </div>
            )}
        </div>
    );
}
