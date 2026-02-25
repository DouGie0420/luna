'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart, Edit, MoreHorizontal, Globe } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useCollection, useUser } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { BbsPost } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { BbsPostCard } from './bbs-post-card';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN, th } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from './ui/user-avatar';

const locales: Record<string, any> = { en: enUS, zh: zhCN, th: th };

/**
 * 🚀 子组件：侧边小卡片 (保留原有硬核 UI 逻辑)
 */
const SmallPostCard = React.memo(({ post }: { post: BbsPost }) => {
    const { t, language } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const canInteract = !!user;
    const hasAdminAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');

    const handlePostInteraction = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!canInteract || !firestore || !user) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }
        const isLiked = post.likedBy?.includes(user.uid);
        const postRef = doc(firestore, 'bbs', post.id);
        updateDoc(postRef, {
            likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
            likes: increment(isLiked ? -1 : 1)
        });
    };

    return (
        <Card className="relative flex h-full flex-col justify-between bg-card/50 backdrop-blur-md transition-all duration-300 hover:bg-card/80 border-2 border-foreground/60 hover:border-primary">
            {hasAdminAccess && (
                <div className="absolute top-2 right-2 z-20">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-black/50 text-white">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/bbs/edit/${post.id}`)}><Edit className="mr-2 h-4 w-4" /> 編輯</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
            <Link href={`/bbs/${post.id}`} className="group block flex-grow">
                <CardContent className="p-5 flex flex-col h-full text-white">
                    <div className="flex items-start gap-4">
                        <div className="w-24 h-24 relative overflow-hidden rounded-md shrink-0 border border-white/5">
                            <img src={post.images?.[0] || 'https://picsum.photos/seed/luna/200/200'} className="object-cover w-full h-full" alt="post" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-headline text-sm leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                {post.title || t(post.titleKey || '')}
                            </h3>
                            <p className="text-[10px] text-white/20 font-mono uppercase tracking-widest mt-2">Log_Ref: {post.id.substring(0,8)}</p>
                        </div>
                    </div>
                </CardContent>
            </Link>
            <CardFooter className="p-5 pt-0 flex justify-between items-center text-white/40">
                <div className="flex items-center gap-2">
                    <UserAvatar profile={post.author || {}} className="h-5 w-5 border border-white/10" />
                    <p className="text-[10px] truncate font-bold">{post.author?.name || 'User'}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePostInteraction}>
                    <Heart className={cn("h-4 w-4", user && post.likedBy?.includes(user.uid) && "text-yellow-400 fill-yellow-400")} />
                </Button>
            </CardFooter>
        </Card>
    );
});

/**
 * 🪐 主组件：Luna Orbit (原 SeaOfTranquility)
 */
export function SeaOfTranquility() {
    const { t } = useTranslation();
    const firestore = useFirestore();

    // 🛡️ 限制抓取 7 条数据展示
    const postsQuery = useMemo(() => 
        firestore ? query(collection(firestore, 'bbs'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(7)) : null, 
    [firestore]);
    
    const { data: posts, loading: isLoading } = useCollection<BbsPost>(postsQuery);

    if (isLoading) return (
        <section className="container mx-auto px-4 py-16">
            <div className="h-10 w-48 bg-white/5 animate-pulse rounded-lg mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8"><div className="h-80 bg-white/5 rounded-3xl animate-pulse" /></div>
                <div className="lg:col-span-1 space-y-4"><div className="h-32 bg-white/5 rounded-2xl animate-pulse" /></div>
            </div>
        </section>
    );

    return (
        <section className="container mx-auto px-4 py-12 md:py-20">
            {/* 🚀 板块头部：视觉对齐 Moon Market */}
            <div className="flex justify-between items-end mb-10">
                <div>
                    <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-[0.4em] mb-1">
                        <Globe className="w-3 h-3 animate-spin-slow" /> Orbit_Sync_Active
                    </div>
                    <h2 className="font-headline text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                        Luna Orbit
                    </h2>
                </div>
                
                {/* 🚀 补全缺失的箭头 hover 动效：加上 group 和 group-hover:translate-x-1 */}
                <Button asChild className="group rounded-full bg-white/5 border border-primary/20 text-primary hover:bg-primary/10 font-black uppercase tracking-[0.2em] text-xs px-8 h-12 transition-all">
                    <Link href="/bbs" className="flex items-center gap-2">
                        Discover <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </div>

            {/* 🚀 内容网格：2大5小布局 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 左侧：2个大型展示卡片 */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {posts?.slice(0, 2).map((post) => (
                        <BbsPostCard key={post.id} post={post} />
                    ))}
                    {posts?.length === 0 && (
                        <div className="h-full min-h-[400px] border border-dashed border-white/5 rounded-3xl flex items-center justify-center font-mono text-white/10 uppercase tracking-[0.4em]">No_Data_Stream</div>
                    )}
                </div>

                {/* 右侧：5个小型快速浏览卡片 */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    {posts?.slice(2, 7).map(post => (
                        <SmallPostCard key={post.id} post={post} />
                    ))}
                </div>
            </div>
        </section>
    );
}