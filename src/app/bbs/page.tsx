'use client';

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { BbsPostCard } from '@/components/bbs-post-card';
import { Button } from '@/components/ui/button';
import type { BbsPost, UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { 
    Plus, Flame, Sparkles, Star, MapPin, Loader2, 
    Search, ArrowLeft, Home, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc } from '@/firebase';
import { 
    collection, query, where, orderBy, limit, getDocs, 
    startAfter, DocumentData, QueryDocumentSnapshot, doc 
} from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';

// 🛡️ 严格执行 50 条安全限流协议 [cite: 2026-02-07]
const PAGE_SIZE = 50;

function BbsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="h-[400px] w-full rounded-[4rem] bg-white/5 animate-pulse mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-[2.5rem] bg-white/5" />)}
            </div>
        </div>
    )
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

    const { data: authorProfile } = useDoc<UserProfile>(
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
        const fetchInitialPosts = async () => {
            const q = buildQuery();
            if (!q) return;
            setLoading(true);
            try {
                const snap = await getDocs(q);
                setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost));
                setLastVisible(snap.docs[snap.docs.length - 1] || null);
                setHasMore(snap.docs.length === PAGE_SIZE);
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Data Stream Blocked' });
            } finally {
                setLoading(false);
            }
        };
        fetchInitialPosts();
    }, [buildQuery, toast]);
    
    const handleLoadMore = useCallback(async () => {
        const q = buildQuery(lastVisible);
        if (!q) return;
        setLoadingMore(true);
        try {
            const snap = await getDocs(q);
            const newPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost);
            setPosts(prev => [...prev, ...newPosts]);
            setLastVisible(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } finally {
            setLoadingMore(false);
        }
    }, [buildQuery, lastVisible]);

    const handleNearestFilter = () => {
        setActiveFilter('nearest');
        if (userLocation) return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => { toast({ variant: 'destructive', title: 'GPS_ERROR' }); setActiveFilter('newest'); }
            );
        }
    };

    function haversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
        const R = 6371; 
        const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
        const dLon = (coords2.lng - coords1.lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coords1.lat * (Math.PI / 180)) * Math.cos(coords2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const filteredAndSortedPosts = useMemo(() => {
        let processed = posts ? [...posts] : [];
        if (debouncedSearchTerm) {
            const lower = debouncedSearchTerm.toLowerCase();
            processed = processed.filter(p => p.title?.toLowerCase().includes(lower) || p.content?.toLowerCase().includes(lower));
        }
        if (activeFilter === 'trending') processed.sort((a, b) => ((b.likes || 0) + (b.replies * 2)) - ((a.likes || 0) + (a.replies * 2)));
        else if (activeFilter === 'nearest' && userLocation) {
            processed.sort((a, b) => {
                const distA = a.location ? haversineDistance(userLocation, a.location) : Infinity;
                const distB = b.location ? haversineDistance(userLocation, b.location) : Infinity;
                return distA - distB;
            });
        }
        return processed;
    }, [debouncedSearchTerm, activeFilter, posts, userLocation]);

    if (loading || (authorId && !authorProfile)) return <BbsPageSkeleton />;

    return (
        <div className="min-h-screen relative">
            {/* 🔳 像素格基底素材 */}
            <div className="pixel-matrix-overlay fixed inset-0 pointer-events-none z-0" />

            <main className="container mx-auto px-4 py-16 relative z-10">
                
                {/* 🚀 页面局部功能区：BACK / HOME */}
                <div className="flex justify-between items-center mb-10 px-6">
                    <motion.button onClick={() => router.back()} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:border-primary transition-all group">
                        <ArrowLeft className="w-4 h-4 text-white/50 group-hover:text-primary" />
                        <span className="text-[10px] font-pixel text-white/50 group-hover:text-white uppercase">[ BACK ]</span>
                    </motion.button>

                    {/* BBS 内部搜索 */}
                    <div className="flex-1 max-w-lg mx-12 relative group h-12">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-full blur opacity-40 group-hover:opacity-100 transition-all" />
                        <div className="relative h-full w-full bg-black border border-white/10 rounded-full flex items-center px-6">
                            <Search className="w-4 h-4 text-primary mr-3" />
                            <input type="text" placeholder="SEARCH_DATABASE..." className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 font-mono text-xs tracking-widest uppercase" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <motion.button onClick={() => router.push('/')} whileHover={{ scale: 1.05 }} className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400 transition-all group">
                        <Home className="w-4 h-4 text-white/50 group-hover:text-cyan-400" />
                        <span className="text-[10px] font-pixel text-white/50 group-hover:text-white uppercase">[ HOME ]</span>
                    </motion.button>
                </div>

                {/* 🎨 BBS Hero 内容区 */}
                {authorId ? (
                     <div className="flex items-center gap-8 mb-16 px-6">
                        <div className="w-3 h-20 bg-primary rounded-full shadow-[0_0_30px_rgba(var(--primary),0.8)] animate-pulse" />
                        <h1 className="font-pixel text-3xl md:text-5xl text-white">
                            LOGS_BY:: <span className="text-primary">{authorProfile?.displayName}</span>
                        </h1>
                    </div>
                ) : (
                    <div className="relative w-full h-[400px] mb-20 overflow-hidden rounded-[5rem] border-2 border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex items-center justify-center group/hero bg-black/20 backdrop-blur-sm">
                        <div className="relative z-20 text-center px-10">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/30 backdrop-blur-3xl border border-white/10 p-20 rounded-[4.5rem] shadow-2xl transition-colors duration-1000 group-hover/hero:border-primary/40">
                                <h1 className="font-pixel text-3xl md:text-5xl text-white leading-none drop-shadow-[0_0_30px_rgba(168,85,247,0.4)] uppercase">{t('bbsPage.title')}</h1>
                                <p className="mt-10 text-sm md:text-base text-white/50 font-mono uppercase tracking-[0.6em] max-w-2xl mx-auto leading-relaxed italic">{t('bbsPage.description')}</p>
                            </motion.div>
                        </div>
                    </div>
                )}

                {/* 筛选面板 */}
                <div className="flex flex-wrap justify-between items-center gap-8 mb-20 px-6">
                    <div className="flex items-center gap-4">
                        {[
                            { id: 'newest', icon: Sparkles, label: t('bbsPage.filterNewest') },
                            { id: 'trending', icon: Flame, label: t('bbsPage.filterTrending') },
                            { id: 'featured', icon: Star, label: t('bbsPage.filterFeatured') },
                            { id: 'nearest', icon: MapPin, label: t('bbsPage.filterNearest'), action: handleNearestFilter }
                        ].map((f) => (
                            <Button key={f.id} variant={activeFilter === f.id ? 'default' : 'outline'} onClick={() => f.action ? f.action() : setActiveFilter(f.id as any)} className={`rounded-full h-14 px-10 font-black italic uppercase text-xs tracking-widest transition-all duration-500 ${activeFilter === f.id ? 'bg-primary text-black scale-105 shadow-[0_0_30px_rgba(168,85,247,0.5)]' : 'bg-white/5 text-white/40 border-white/10 hover:text-white'}`}>
                                <f.icon className="mr-3 h-5 w-5" /> {f.label}
                            </Button>
                        ))}
                    </div>
                    <Button asChild className="rounded-full bg-white text-black font-black italic uppercase tracking-[0.2em] h-16 px-14 hover:scale-[1.1] transition-all">
                        <Link href="/bbs/new"><Plus className="mr-3 h-6 w-6" /> {t('bbsPage.newPost')}</Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 px-4">
                    <AnimatePresence mode="popLayout">
                        {filteredAndSortedPosts.map((post, idx) => (
                            <motion.div key={post.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="hover:z-10">
                                <BbsPostCard post={post} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                
                {hasMore && (
                    <div className="mt-32 text-center pb-20">
                        <Button onClick={handleLoadMore} disabled={loadingMore} className="group relative rounded-full bg-black border-2 border-white/10 text-white/30 font-black italic uppercase tracking-[0.5em] px-32 h-24 hover:text-primary hover:border-primary transition-all shadow-3xl text-xl overflow-hidden">
                            <span className="relative z-10">{loadingMore ? <Loader2 className="animate-spin mr-3" /> : "EXECUTE_DATA_SYNC"}</span>
                        </Button>
                    </div>
                )}
            </main>

            <style jsx global>{`
                /* 🚀 只保留核心动画和网格素材，彻底切除字体污染源 */
                .animate-fluid-flow { background-size: 200% 200%; animation: fluid-flow 10s ease infinite; will-change: background-position; }
                @keyframes fluid-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }

                /* 🔳 像素素材回归：白色线条、40% 透明度、28px 尺寸 */
                .pixel-matrix-overlay {
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), 
                        linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px);
                    background-size: 28px 28px;
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 100%);
                }
            `}</style>
        </div>
    )
}

export default function BbsPage() {
    return <Suspense fallback={<BbsPageSkeleton />}><BbsPageContent /></Suspense>;
}