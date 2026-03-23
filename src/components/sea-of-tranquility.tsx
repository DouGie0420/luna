'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Heart, Edit, MoreHorizontal, Globe, MapPin, Clock, AlignLeft, Star } from 'lucide-react';
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

// ✅ 顶级视觉定义：加入液态流光按钮动画
const intenseArtStyles = `
  .astral-pink-orbit { position: absolute; border-radius: 50%; filter: blur(140px); background: #ff00ff; opacity: 0.12; width: 30vw; height: 30vw; top: -15%; left: -10%; z-index: 0; pointer-events: none; }
  .astral-cyan-orbit { position: absolute; border-radius: 50%; filter: blur(140px); background: #00ffff; opacity: 0.08; width: 20vw; height: 20vw; bottom: -10%; right: -10%; z-index: 0; pointer-events: none; }
  .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
  
  @keyframes border-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .liquid-border-active::before {
    content: ''; position: absolute; inset: -2px;
    background: conic-gradient(from 0deg, transparent, #ff00ff, #00ffff, transparent);
    animation: border-rotate 4s linear infinite; border-radius: 9999px; z-index: -1;
  }
`;

/**
 * 🚀 子组件：侧边小卡片 (逻辑完全保留)
 */
const SmallPostCard = React.memo(({ post }: { post: BbsPost }) => {
    const { t, language } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const canInteract = !!user;
    const hasAdminAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!canInteract || !firestore || !user) { toast({ variant: 'destructive', title: t('common.loginToInteract') }); return; }
        const isLiked = post.likedBy?.includes(user.uid);
        await updateDoc(doc(firestore, 'bbs', post.id), {
            likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
            likes: increment(isLiked ? -1 : 1)
        });
    };

    const handleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!canInteract || !firestore || !user) { toast({ variant: 'destructive', title: t('common.loginToInteract') }); return; }
        const isFavorited = post.favoritedBy?.includes(user.uid);
        await updateDoc(doc(firestore, 'bbs', post.id), {
            favoritedBy: isFavorited ? arrayRemove(user.uid) : arrayUnion(user.uid),
            favorites: increment(isFavorited ? -1 : 1)
        });
    };

    return (
        <Card className="relative flex flex-col justify-between bg-[#0a0a0a]/60 backdrop-blur-3xl transition-all duration-500 hover:bg-[#111111]/95 border border-white/10 hover:border-[#ff00ff]/60 group/card shadow-2xl overflow-hidden h-full min-h-[160px]">
            {hasAdminAccess && (
                <div className="absolute top-3 right-3 z-20">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/60 text-white hover:bg-[#ff00ff]">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white">
                            <DropdownMenuItem className="focus:bg-[#ff00ff] cursor-pointer" onClick={() => router.push(`/bbs/edit/${post.id}`)}><Edit className="mr-2 h-4 w-4" /> 編輯</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
            
            <Link href={`/bbs/${post.id}`} className="block flex-grow">
                <CardContent className="p-5 flex flex-col h-full text-white">
                    <div className="flex items-start gap-5">
                        <div className="w-24 h-24 relative overflow-hidden rounded-xl shrink-0 border border-white/10 shadow-lg">
                            <img src={post.images?.[0] || 'https://picsum.photos/seed/luna/200/200'} className="object-cover w-full h-full group-hover/card:scale-110 transition-transform duration-700" alt="p" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-sans text-sm font-bold leading-tight line-clamp-1 group-hover/card:text-[#ff00ff] transition-colors uppercase tracking-tight">{post.title || t(post.titleKey || '')}</h3>
                            <div className="flex items-start gap-1.5 opacity-40 group-hover/card:opacity-80 transition-opacity">
                                <AlignLeft size={12} className="mt-0.5 shrink-0 text-cyan-400" />
                                <p className="text-[11px] line-clamp-2 leading-relaxed">{post.content || 'Decrypting transmission...'}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-white/5 mt-1 text-[10px] font-mono text-white/30">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="text-[#ff00ff]" />
                                    <span>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Live'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 uppercase">
                                    <MapPin size={10} className="text-cyan-400" />
                                    <span className="truncate max-w-[80px]">{post.location?.city || 'ORBIT'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Link>

            <CardFooter className="px-6 py-4 pt-0 flex justify-between items-center border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <UserAvatar profile={post.author || {}} className="h-6 w-6 border border-[#ff00ff]/30" />
                    <p className="text-[10px] font-black uppercase text-white/50">{post.author?.name || 'NODE'}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleFavorite} className="hover:scale-125 transition-all">
                        <Star size={14} className={cn("transition-all text-white/10", user && post.favoritedBy?.includes(user.uid) ? "text-yellow-400 fill-yellow-400" : "")} />
                    </button>
                    <button onClick={handleLike} className="hover:scale-125 transition-all">
                        <Heart size={14} className={cn("transition-all text-white/10", user && post.likedBy?.includes(user.uid) ? "text-[#ff00ff] fill-[#ff00ff]" : "")} />
                    </button>
                </div>
            </CardFooter>
        </Card>
    );
});

export function SeaOfTranquility() {
    const firestore = useFirestore();
    const postsQuery = useMemo(() => firestore ? query(collection(firestore, 'bbs'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(8)) : null, [firestore]);
    const { data: posts, loading } = useCollection<BbsPost>(postsQuery);

    if (loading) return <div className="p-20 text-center opacity-10 font-mono tracking-widest animate-pulse text-[#ff00ff]">ORBIT_LINKING...</div>;

    return (
        <section className="container mx-auto px-4 py-12 md:py-24 relative overflow-visible">
            <style dangerouslySetInnerHTML={{ __html: intenseArtStyles }} />
            <div className="astral-pink-orbit" /><div className="astral-cyan-orbit" />
            
            <div className="flex justify-between items-end mb-12 relative z-10 border-l-4 border-[#ff00ff] pl-8">
                <div>
                    <div className="flex items-center gap-2 text-[#ff00ff] font-mono text-[11px] font-black uppercase tracking-[0.5em] mb-2 drop-shadow-[0_0_10px_rgba(255,0,255,0.4)]">
                        <Globe className="w-3.5 h-3.5 animate-spin-slow" /> Orbit_Sync_Active
                    </div>
                    <h2 className="font-headline text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white">LUNA <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-cyan-400">ORBIT</span></h2>
                </div>
                
                {/* 🚀 重新设计的 DISCOVER 按钮：液态流光版本 */}
                <div className="relative group/btn">
                    <div className="absolute inset-0 bg-primary blur-xl opacity-0 group-hover/btn:opacity-40 transition-opacity duration-500" />
                    <Button asChild className="relative overflow-hidden group/btn-inner rounded-full bg-black/60 border border-white/20 text-white hover:border-transparent transition-all duration-500 font-black uppercase tracking-[0.3em] text-[11px] px-12 h-14 backdrop-blur-2xl">
                        <Link href="/bbs" className="flex items-center gap-3 relative z-10">
                            DISCOVER <ArrowRight className="h-4 w-4 transition-transform group-hover/btn-inner:translate-x-2" />
                            {/* 内部液态流光层 */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn-inner:translate-x-full transition-transform duration-1000" />
                        </Link>
                    </Button>
                    {/* 外圈旋转霓虹边框 */}
                    <div className="absolute inset-[-1px] rounded-full opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700 liquid-border-active pointer-events-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
                <div className="lg:col-span-2 flex flex-col gap-10">
                    {posts?.slice(0, 2).map((post) => (
                        /* 🚀 修正：解决“穿模” Bug，通过 relative z-10 提升悬停层级，并杜绝溢出切割 */
                        <div key={post.id} className="relative z-10 hover:z-50 hover:scale-[1.03] transition-all duration-700 transform-gpu will-change-transform">
                            <BbsPostCard post={post} />
                        </div>
                    ))}
                </div>
                <div className="lg:col-span-1 grid grid-cols-1 gap-6">
                    {posts?.slice(2, 8).map(post => (
                        <div key={post.id} className="h-full relative z-10 hover:z-20 transition-all duration-500"><SmallPostCard post={post} /></div>
                    ))}
                </div>
            </div>
        </section>
    );
}