'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { BbsPostCard } from '@/components/bbs-post-card';
import { Button } from '@/components/ui/button';
import type { BbsPost, UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { 
    Plus, Flame, Sparkles, Star, MapPin, Loader2, 
    Search, ArrowLeft, Home, X, Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { 
    collection, query, where, orderBy, limit, getDocs, 
    startAfter, DocumentData, QueryDocumentSnapshot, doc 
} from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

// 流星数据：[top%, left%, delay(s), duration(s), trailWidth(px)] — 慢速、短尾、分散
const METEORS = [
    [4,  18,  0,   5.5, 0.8], [12, 62,  7,   6.5, 0.6], [2,  85,  14,  5,   0.9],
    [20,  8,  3,   7,   0.7], [8,  45, 20,   6,   0.8], [16, 78,  10,  5.8, 0.6],
    [6,  33, 17,   6.2, 0.7], [24, 55,  1.5, 7.5, 0.6], [10, 92,  9,   5.5, 0.8],
];
// 星星数据：[top%, left%, size(px), opacity, twinkleDuration(s), delay(s)]
const STARS = Array.from({ length: 80 }, (_, i) => [
    Math.floor((i * 137.5) % 100),
    Math.floor((i * 97.3)  % 100),
    i % 8 === 0 ? 2 : i % 4 === 0 ? 1.5 : 1,
    0.2 + (i % 6) * 0.08,
    3 + (i % 5),
    (i * 1.1) % 8,
]);

// 🚀 物理级视觉定义：Somnia Mesh (梦境之湖)
const somniaArtStyles = `
  .font-somnia { font-family: 'Playfair Display', serif; }

  /* 流体网格 */
  .page-grid-pattern {
    background-image:
      linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px);
    background-size: 60px 60px;
  }

  /* 噪点质感 */
  .noise-overlay {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.05; mix-blend-mode: overlay; pointer-events: none;
  }

  /* 流体光球 */
  @keyframes orb-float-a { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(100px,-80px) scale(1.2)} 66%{transform:translate(-60px,50px) scale(0.88)} }
  @keyframes orb-float-b { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-90px,60px) scale(1.15)} 66%{transform:translate(70px,-45px) scale(1.25)} }
  @keyframes orb-float-c { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(50px,90px) scale(0.82)} }
  @keyframes orb-float-d { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-80px,-70px) scale(1.15)} 80%{transform:translate(60px,40px) scale(0.9)} }
  .page-orb-a { animation: orb-float-a 18s ease-in-out infinite; }
  .page-orb-b { animation: orb-float-b 24s ease-in-out infinite; }
  .page-orb-c { animation: orb-float-c 30s ease-in-out infinite; }
  .page-orb-d { animation: orb-float-d 22s ease-in-out infinite; }

  /* 旋转锥形光 */
  @keyframes conic-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .conic-slow { animation: conic-spin 45s linear infinite; }
  .conic-reverse { animation: conic-spin 60s linear infinite reverse; }

  /* 星星闪烁 */
  @keyframes star-twinkle {
    0%,100% { opacity: var(--star-base-opacity); transform: scale(1); }
    50% { opacity: calc(var(--star-base-opacity) * 2.5); transform: scale(1.4); }
  }
  .star-dot { animation: star-twinkle var(--star-dur, 3s) ease-in-out infinite; animation-delay: var(--star-delay, 0s); }

  /* 流星 — 慢速、轻盈、短尾 */
  @keyframes meteor-fall {
    0%   { transform: translateX(0) translateY(0); opacity: 0; }
    8%   { opacity: 0.7; }
    85%  { opacity: 0.4; }
    100% { transform: translateX(-260px) translateY(260px); opacity: 0; }
  }
  .meteor {
    position: absolute; width: 1px; height: 1px;
    animation: meteor-fall var(--meteor-dur, 6s) ease-in infinite;
    animation-delay: var(--meteor-delay, 0s);
  }
  .meteor::after {
    content: ''; position: absolute; top: 0; left: 0;
    width: 45px; height: var(--meteor-size, 0.7px);
    background: linear-gradient(to left, transparent, rgba(255,255,255,0.75), rgba(196,168,255,0.5));
    border-radius: 999px;
    transform: rotate(-45deg) translateX(-22px);
    filter: blur(0.3px);
  }
`;

function haversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
    const R = 6371; 
    const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
    const dLon = (coords2.lng - coords1.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coords1.lat * (Math.PI / 180)) * Math.cos(coords2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function BbsPageContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const authorId = searchParams.get('author');

    const [posts, setPosts] = useState<BbsPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const [activeFilter, setActiveFilter] = useState<'newest' | 'trending' | 'featured' | 'nearest'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    const { data: authorProfile, loading: authorLoading } = useDoc<UserProfile>(
        firestore && authorId ? doc(firestore, 'users', authorId) : null
    );
    
    const buildQuery = useCallback((startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'bbs'), where('status', '==', 'active'));
        if (authorId) q = query(q, where('authorId', '==', authorId));
        if (activeFilter === 'featured' && !authorId) q = query(q, where('isFeatured', '==', true));
        q = query(q, orderBy('createdAt', 'desc'));
        if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
        q = query(q, limit(PAGE_SIZE));
        return q;
    }, [firestore, authorId, activeFilter]);
    
    useEffect(() => {
        (async () => {
            const q = buildQuery();
            if (!q) return;
            setLoading(true);
            try {
                const snap = await getDocs(q);
                setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost));
                setLastVisible(snap.docs[snap.docs.length - 1] || null);
                setHasMore(snap.docs.length === PAGE_SIZE);
            } finally { setLoading(false); }
        })();
    }, [buildQuery]);

    const handleLoadMore = async () => {
        const q = buildQuery(lastVisible);
        if (!q) return;
        setLoadingMore(true);
        try {
            const snap = await getDocs(q);
            setPosts(prev => [...prev, ...snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost)]);
            setLastVisible(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } finally { setLoadingMore(false); }
    };

    const handleNearestFilter = () => {
        setActiveFilter('nearest');
        if (userLocation) return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { toast({ variant: 'destructive', title: t('bbsNewPost.locationBlocked') }); setActiveFilter('newest'); }
            );
        }
    };

    const filteredAndSortedPosts = useMemo(() => {
        let processed = posts ? [...posts] : [];
        if (debouncedSearchTerm) {
            const lower = debouncedSearchTerm.toLowerCase();
            processed = processed.filter(p => 
                p.title?.toLowerCase().includes(lower) || p.content?.toLowerCase().includes(lower) || p.tags?.some(tag => tag.toLowerCase().includes(lower))
            );
        }
        if (activeFilter === 'trending') processed.sort((a, b) => ((b.likes || 0) + (b.replies * 2)) - ((a.likes || 0) + (a.replies * 2)));
        else if (activeFilter === 'nearest' && userLocation) {
            processed.sort((a, b) => (a.location ? haversineDistance(userLocation, a.location) : Infinity) - (b.location ? haversineDistance(userLocation, b.location) : Infinity));
        }
        return processed;
    }, [debouncedSearchTerm, activeFilter, posts, userLocation]);

    if (loading || (authorId && authorLoading)) return <BbsPageSkeleton />;

    return (
        <div className="min-h-screen bg-[#020203] relative z-10 selection:bg-primary/30 pt-0 pb-32">
            <style dangerouslySetInnerHTML={{ __html: somniaArtStyles }} />

            {/* Full-page ambient background */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                {/* 深色基底 — 深宇宙紫而非纯黑 */}
                <div className="absolute inset-0 bg-[#04010e]" />

                {/* 旋转锥形底层色彩 */}
                <div className="conic-slow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] opacity-[0.07]"
                    style={{ background: 'conic-gradient(from 0deg, #9333ea, #06b6d4, #ec4899, #eab308, #4f46e5, #9333ea)' }} />
                <div className="conic-reverse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vw] h-[140vw] opacity-[0.05]"
                    style={{ background: 'conic-gradient(from 90deg, #00ffff, #8b5cf6, #f43f5e, #00ffff)' }} />

                {/* 星星 */}
                {STARS.map(([top, left, size, opacity, dur, delay], i) => (
                    <div key={i} className="star-dot absolute rounded-full bg-white"
                        style={{
                            top: `${top}%`, left: `${left}%`,
                            width: `${size}px`, height: `${size}px`,
                            '--star-base-opacity': opacity,
                            '--star-dur': `${dur}s`,
                            '--star-delay': `${delay}s`,
                        } as React.CSSProperties}
                    />
                ))}

                {/* 流星雨 */}
                {METEORS.map(([top, left, delay, duration, size], i) => (
                    <div key={i} className="meteor absolute"
                        style={{
                            top: `${top}%`, left: `${left}%`,
                            '--meteor-delay': `${delay}s`,
                            '--meteor-dur': `${duration}s`,
                            '--meteor-size': `${size}px`,
                        } as React.CSSProperties}
                    />
                ))}

                {/* 流体光球 — 柔和、不抢视觉 */}
                <div className="page-orb-a absolute top-[0%] left-[0%] w-[600px] h-[600px] rounded-full opacity-[0.13]"
                    style={{ background: 'radial-gradient(circle, #9333ea 0%, #4f46e5 45%, transparent 70%)', filter: 'blur(120px)' }} />
                <div className="page-orb-b absolute top-[10%] right-[-5%] w-[520px] h-[520px] rounded-full opacity-[0.12]"
                    style={{ background: 'radial-gradient(circle, #ec4899 0%, #be185d 40%, transparent 70%)', filter: 'blur(120px)' }} />
                <div className="page-orb-c absolute top-[55%] left-[20%] w-[500px] h-[500px] rounded-full opacity-[0.10]"
                    style={{ background: 'radial-gradient(circle, #06b6d4 0%, #0ea5e9 40%, transparent 70%)', filter: 'blur(130px)' }} />
                <div className="page-orb-d absolute bottom-[0%] right-[15%] w-[440px] h-[440px] rounded-full opacity-[0.11]"
                    style={{ background: 'radial-gradient(circle, #eab308 0%, #d97706 40%, transparent 70%)', filter: 'blur(110px)' }} />
                <div className="page-orb-a absolute top-[35%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.09]"
                    style={{ background: 'radial-gradient(circle, #00ffff 0%, #6366f1 55%, transparent 100%)', filter: 'blur(100px)' }} />

                {/* 网格 */}
                <div className="absolute inset-0 page-grid-pattern" />
                {/* 噪点质感 */}
                <div className="noise-overlay" />

                {/* 边缘压暗，保内容可读 */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 50%, rgba(4,1,14,0.6) 100%)' }} />
            </div>
            
            {/* 🚀 修正2：top-[64px] 对齐标准全局导航栏高度，瞬间吸附零延迟 */}
            <header className="sticky top-[80px] z-[40] w-full border-b border-t border-white/5 bg-black/80 backdrop-blur-2xl h-24 flex items-center mb-8 shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
                <div className="w-full px-4 md:px-8 flex items-center justify-between gap-4 md:gap-8">
                    
                    {/* 左侧：BACK */}
                    <motion.button onClick={() => router.back()} whileHover={{ scale: 1.05 }} className="flex items-center gap-3 group shrink-0">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-all duration-300" />
                            <div className="relative p-3 rounded-full bg-white/10 border border-white/20 text-white/80 group-hover:text-white group-hover:bg-purple-500/20 group-hover:border-purple-400/50 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                                <ArrowLeft size={20}/>
                            </div>
                        </div>
                        <span className="hidden lg:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/60 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all">[ BACK ]</span>
                    </motion.button>
                    
                    {/* 中央：高能爆改版搜索栏 */}
                    <div className="flex-1 max-w-3xl relative group mx-2 md:mx-6">
                        {/* 加强版脉冲呼吸光效 */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600/40 via-cyan-500/40 to-fuchsia-600/40 rounded-full blur-md opacity-70 group-hover:opacity-100 group-hover:animate-pulse transition duration-500 pointer-events-none" />
                        <div className="relative h-14 w-full bg-[#05000a]/90 border border-fuchsia-500/30 group-hover:border-fuchsia-400 rounded-full flex items-center px-8 shadow-[0_0_25px_rgba(255,0,255,0.15)] group-hover:shadow-[0_0_40px_rgba(255,0,255,0.3)] transition-all duration-300">
                            <Search className="w-5 h-5 text-fuchsia-400 mr-4 shrink-0" />
                            <input 
                                type="text" 
                                placeholder="ACCESS_LOG_DATABASE // INITIATE QUERY..." 
                                className="flex-1 bg-transparent border-none outline-none text-white text-[12px] md:text-[13px] font-mono tracking-[0.2em] uppercase placeholder:text-white/30 min-w-0"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 右侧：HOME */}
                    <Link href="/" className="flex items-center gap-3 group shrink-0">
                        <span className="hidden lg:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/60 group-hover:text-cyan-300 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all">[ HOME ]</span>
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md opacity-0 group-hover:opacity-100 transition-all duration-300" />
                            <div className="relative p-3 rounded-full bg-white/10 border border-white/20 text-white/80 group-hover:text-cyan-300 group-hover:bg-cyan-500/20 group-hover:border-cyan-400/50 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                                <Home size={20}/>
                            </div>
                        </div>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10 isolation-auto">
                
                {/* 🌌 HERO SECTION: “梦境之湖”极致视觉重塑 */}
                {!authorId && (
                    <div className="relative w-full h-[540px] mb-24 rounded-[5.5rem] overflow-hidden border border-white/10 shadow-[0_60px_150px_rgba(0,0,0,1)] flex flex-col items-center justify-center isolate bg-black">
                        <div className="somnia-bg-canvas" />
                        <div className="noise-overlay" />
                        
                        <div className="relative z-20 text-center px-10">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }}>
                                <Sparkles className="w-12 h-12 text-fuchsia-400/50 animate-pulse mx-auto mb-10" />
                                <h1 className="text-7xl md:text-9xl font-black bg-gradient-to-b from-white via-white/80 to-white/30 bg-clip-text text-transparent tracking-tighter" style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 60px rgba(255,255,255,0.2)' }}>
                                    COMING SOON
                                </h1>
                                <div className="h-[1px] w-64 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mt-12" />
                                <p className="mt-12 text-[12px] md:text-sm text-white/30 font-mono uppercase tracking-[1.2em] max-w-2xl leading-relaxed italic opacity-60">
                                    SOMNIA . {t('bbsPage.description')}
                                </p>
                            </motion.div>
                        </div>

                        {/* 底部无缝融合遮罩 */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-transparent to-transparent opacity-95" />
                    </div>
                )}

                {authorId && (
                    <div className="mb-20 px-10 border-l-2 border-primary/40">
                        <h1 className="text-5xl md:text-7xl font-black italic text-white uppercase tracking-tighter drop-shadow-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                            NODE_SYNC :: <span className="text-primary/80">{authorProfile?.displayName}</span>
                        </h1>
                    </div>
                )}

                {/* 🎛️ 筛选控制面板：悬浮高透机甲 */}
                <div className="flex flex-wrap justify-between items-center gap-8 mb-24 px-6 relative z-20">
                    <div className="flex items-center gap-3 p-2.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-3xl shadow-2xl">
                        {['newest', 'trending', 'featured', 'nearest'].map((id) => (
                            <button 
                                key={id} 
                                onClick={() => id === 'nearest' ? handleNearestFilter() : setActiveFilter(id as any)} 
                                className={cn(
                                    "flex items-center gap-2.5 h-12 px-9 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-700 border",
                                    activeFilter === id 
                                        ? "bg-primary text-black border-transparent shadow-[0_0_30px_#ec4899] scale-105" 
                                        : "bg-transparent text-white/20 border-transparent hover:text-white hover:bg-white/5"
                                )}
                            >
                                {t(`bbsPage.filter${id.charAt(0).toUpperCase() + id.slice(1)}`)}
                            </button>
                        ))}
                    </div>

                    <Button asChild className="rounded-full bg-white text-black font-black italic uppercase tracking-[0.2em] h-16 px-14 hover:scale-[1.1] hover:rotate-[-2deg] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                        <Link href="/bbs/new"><Plus className="mr-3 h-6 w-6" /> {t('bbsPage.newPost')}</Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 px-4">
                    <AnimatePresence mode="popLayout">
                        {filteredAndSortedPosts.map((post, idx) => (
                            <motion.div 
                                key={post.id} 
                                initial={{ opacity: 0, y: 40 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                transition={{ delay: idx * 0.03, duration: 0.8 }} 
                                className="transform-gpu"
                            >
                                <BbsPostCard post={post} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                
                {hasMore && (
                    <div className="mt-40 text-center">
                        <button onClick={handleLoadMore} disabled={loadingMore} className="group relative px-32 py-10 rounded-full border border-white/10 text-white/20 font-black uppercase tracking-[0.6em] text-[10px] hover:text-primary hover:border-primary/50 transition-all overflow-hidden bg-black shadow-3xl">
                            <span className="relative z-10">{loadingMore ? t('bbsPage.loadingMore') : t('bbsPage.syncMoreArchives')}</span>
                            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity" />
                        </button>
                    </div>
                )}
            </main>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,900;1,900&display=swap');
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}

function BbsPageSkeleton() {
    return <div className="container mx-auto px-4 py-32"><Skeleton className="h-[500px] w-full rounded-[5rem] bg-white/5 mb-12" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-[2.5rem] bg-white/5" />)}</div></div>;
}

export default function BbsPage() {
    return <Suspense fallback={<BbsPageSkeleton />}><BbsPageContent /></Suspense>;
}