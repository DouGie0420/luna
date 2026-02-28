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

// 🚀 物理级视觉定义：Somnia Mesh (梦境之湖)
const somniaArtStyles = `
  .somnia-bg-canvas {
    position: absolute; inset: 0;
    background: radial-gradient(at 20% 30%, #1e1b4b 0px, transparent 50%),
                radial-gradient(at 80% 20%, #312e81 0px, transparent 50%),
                radial-gradient(at 50% 80%, #581c87 0px, transparent 50%);
    filter: blur(100px); opacity: 0.8;
    animation: somnia-drift 25s infinite alternate ease-in-out;
  }
  @keyframes somnia-drift { from { transform: scale(1); } to { transform: scale(1.2) rotate(3deg); } }
  .noise-overlay {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.15; mix-blend-mode: overlay; pointer-events: none;
  }
  .font-somnia { font-family: 'Playfair Display', serif; }
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
                () => { toast({ variant: 'destructive', title: 'Location Blocked' }); setActiveFilter('newest'); }
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
            {/* 🚀 修正1：pt-0 彻底清除双重间距陷阱，且注释安全地放在了 HTML 标签内部 */}
            <style dangerouslySetInnerHTML={{ __html: somniaArtStyles }} />
            
            {/* 🚀 修正2：top-[64px] 对齐标准全局导航栏高度，瞬间吸附零延迟 */}
            <header className="sticky top-[64px] z-[40] w-full border-b border-t border-white/5 bg-black/80 backdrop-blur-2xl h-24 flex items-center mb-8 shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
                <div className="w-full px-4 md:px-8 flex items-center justify-between gap-4 md:gap-8">
                    
                    {/* 左侧：BACK */}
                    <motion.button onClick={() => router.back()} whileHover={{ scale: 1.05 }} className="flex items-center gap-3 group shrink-0">
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-white group-hover:border-white/30 transition-all shadow-lg"><ArrowLeft size={20}/></div>
                        <span className="hidden lg:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-all drop-shadow-md">[ BACK ]</span>
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
                        <span className="hidden lg:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-cyan-400 transition-all drop-shadow-md">[ HOME ]</span>
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-cyan-400 group-hover:border-cyan-400/40 transition-all shadow-lg"><Home size={20}/></div>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 relative z-10">
                
                {/* 🌌 HERO SECTION: “梦境之湖”极致视觉重塑 */}
                {!authorId && (
                    <div className="relative w-full h-[540px] mb-24 rounded-[5.5rem] overflow-hidden border border-white/10 shadow-[0_60px_150px_rgba(0,0,0,1)] flex flex-col items-center justify-center isolate bg-black">
                        <div className="somnia-bg-canvas" />
                        <div className="noise-overlay" />
                        
                        <div className="relative z-20 text-center px-10">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5 }}>
                                <Sparkles className="w-12 h-12 text-fuchsia-400/50 animate-pulse mx-auto mb-10" />
                                <h1 className="text-7xl md:text-9xl font-black italic bg-gradient-to-b from-white via-white/80 to-white/30 bg-clip-text text-transparent tracking-tighter" style={{ fontFamily: "'Playfair Display', serif", textShadow: '0 0 60px rgba(255,255,255,0.2)' }}>
                                    {t('bbsPage.title')}
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
                                {id.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <Button asChild className="rounded-full bg-white text-black font-black italic uppercase tracking-[0.2em] h-16 px-14 hover:scale-[1.1] hover:rotate-[-2deg] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                        <Link href="/bbs/new"><Plus className="mr-3 h-6 w-6" /> Transmission</Link>
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
                            <span className="relative z-10">{loadingMore ? "LOADING..." : "SYNC_MORE_ARCHIVES"}</span>
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