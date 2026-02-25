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
import { useUser, useFirestore, useDoc } from '@/firebase';
import { 
    collection, query, where, orderBy, limit, getDocs, 
    startAfter, DocumentData, QueryDocumentSnapshot, doc 
} from 'firebase/firestore';
import { useSearchParams, useRouter } from 'next/navigation';

const PAGE_SIZE = 50;

// 🚀 优化 1：移出组件外的纯函数，避免每次渲染重复分配内存
function haversineDistance(coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }): number {
    const R = 6371; 
    const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
    const dLon = (coords2.lng - coords1.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coords1.lat * (Math.PI / 180)) * Math.cos(coords2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function BbsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="h-[400px] w-full rounded-[4rem] bg-white/5 animate-pulse mb-12" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-80 w-full rounded-[2.5rem] bg-white/5" />
                ))}
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
    const [fetchError, setFetchError] = useState<any>(null);

    const [activeFilter, setActiveFilter] = useState<'newest' | 'trending' | 'featured' | 'nearest'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // 🚨 修复 1：从 useDoc 解构出 loading 并重命名为 authorLoading，防止带有 author 参数时页面白屏崩溃
    const { data: authorProfile, loading: authorLoading } = useDoc<UserProfile>(
        firestore && authorId ? doc(firestore, 'users', authorId) : null
    );
    
    const buildQuery = useCallback((startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'bbs'), where('status', '==', 'active'));
        if (authorId) q = query(q, where('authorId', '==', authorId));
        if (activeFilter === 'featured' && !authorId) q = query(q, where('isFeatured', '==', true));
        q = query(q, orderBy('createdAt', 'desc'));
        
        // 🚀 严格执行 50 条安全限流协议
        if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
        q = query(q, limit(PAGE_SIZE));
        return q;
    }, [firestore, authorId, activeFilter]);
    
    useEffect(() => {
        const fetchInitialPosts = async () => {
            const q = buildQuery();
            if (!q) return;
            setLoading(true);
            setFetchError(null);
            try {
                const snap = await getDocs(q);
                const newPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as BbsPost);
                setPosts(newPosts);
                setLastVisible(snap.docs[snap.docs.length - 1] || null);
                setHasMore(snap.docs.length === PAGE_SIZE);
            } catch (error: any) {
                setFetchError(error);
                toast({ variant: 'destructive', title: 'Data Feed Blocked' });
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
                () => { toast({ variant: 'destructive', title: 'Location Access Denied' }); setActiveFilter('newest'); }
            );
        }
    };

    const filteredAndSortedPosts = useMemo(() => {
        let processed = posts ? [...posts] : [];
        if (debouncedSearchTerm) {
            const lower = debouncedSearchTerm.toLowerCase();
            processed = processed.filter(p => 
                p.title?.toLowerCase().includes(lower) || 
                p.content?.toLowerCase().includes(lower) ||
                p.tags?.some(tag => tag.toLowerCase().includes(lower))
            );
        }
        if (activeFilter === 'trending') {
            processed.sort((a, b) => ((b.likes || 0) + (b.replies * 2)) - ((a.likes || 0) + (a.replies * 2)));
        } else if (activeFilter === 'nearest' && userLocation) {
            processed.sort((a, b) => {
                const distA = a.location ? haversineDistance(userLocation, a.location) : Infinity;
                const distB = b.location ? haversineDistance(userLocation, b.location) : Infinity;
                return distA - distB;
            });
        }
        return processed;
    }, [debouncedSearchTerm, activeFilter, posts, userLocation]);

    if (loading || (authorId && authorLoading)) return <BbsPageSkeleton />;

    return (
        <div className="min-h-screen relative">
            {/* 🚀 顶栏：高亮流体导航栏 (高对比度设计) */}
            <header className="sticky top-0 z-[100] w-full border-b border-white/10 bg-black/80 backdrop-blur-3xl px-4 md:px-12 h-28 flex items-center shadow-[0_20px_50px_rgba(0,0,0,1)]">
                <div className="w-full flex items-center justify-between gap-6 md:gap-16">
                    
                    {/* 👈 BACK: 增强亮度 */}
                    <motion.button 
                        onClick={() => router.back()}
                        whileHover="hover" initial="initial"
                        className="flex-shrink-0 flex items-center gap-4 group"
                    >
                        <div className="relative">
                            <motion.div 
                                variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }}
                                className="absolute -inset-2 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-full blur-2xl transition-all duration-700"
                            />
                            <div className="relative z-10 w-14 h-14 rounded-full bg-black border-2 border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:border-primary transition-colors">
                                <ArrowLeft className="w-6 h-6 text-white group-hover:text-primary animate-pulse" />
                            </div>
                        </div>
                        <span className="hidden lg:block text-xs font-black italic uppercase tracking-[0.5em] text-white group-hover:text-primary transition-all drop-shadow-md">[ BACK ]</span>
                    </motion.button>

                    {/* 🌊 搜索栏：全场视觉黑洞 */}
                    <div className="flex-1 max-w-3xl relative group h-16">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-blue-400 to-pink-500 rounded-full blur-md opacity-60 group-hover:opacity-100 group-hover:blur-xl transition-all duration-1000 animate-fluid-flow" />
                        <div className="relative h-full w-full bg-black/95 backdrop-blur-2xl border-2 border-white/10 rounded-full flex items-center px-10 shadow-[0_0_60px_rgba(0,0,0,0.8)] transition-all group-hover:border-primary/80">
                            <Search className="w-6 h-6 text-primary mr-5 animate-bounce-slow" />
                            <input 
                                type="text"
                                placeholder="ACCESS_DATABASE :: SEARCH_POSTS..."
                                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 font-mono text-base tracking-[0.2em] uppercase font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="ml-4 p-2 hover:bg-primary/20 rounded-full transition-all">
                                    <X className="w-5 h-5 text-primary" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 👉 HOME: 增强亮度 */}
                    <Link href="/" className="flex-shrink-0 flex flex-row-reverse items-center gap-4 group">
                        <motion.div whileHover="hover" initial="initial" className="flex flex-row-reverse items-center gap-4">
                            <div className="relative">
                                <motion.div 
                                    variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }}
                                    className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur-2xl transition-all duration-700"
                                />
                                <div className="relative z-10 w-14 h-14 rounded-full bg-black border-2 border-white/20 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)] group-hover:border-cyan-400 transition-colors">
                                    <Home className="w-6 h-6 text-white group-hover:text-cyan-400" />
                                </div>
                            </div>
                            <span className="hidden lg:block text-xs font-black italic uppercase tracking-[0.5em] text-white group-hover:text-cyan-400 transition-all drop-shadow-md">[ HOME ]</span>
                        </motion.div>
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-16 relative z-10">
                
                {authorId ? (
                     <div className="flex items-center gap-8 mb-16 px-6">
                        <div className="w-3 h-20 bg-primary rounded-full shadow-[0_0_30px_rgba(var(--primary),0.8)] animate-pulse" />
                        <h1 className="font-headline text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-white">
                            Logs_By:: <span className="text-primary [text-shadow:0_0_30px_rgba(168,85,247,0.5)]">{authorProfile?.displayName}</span>
                        </h1>
                    </div>
                ) : (
                    <>
                        {/* 🎨 异星云朵、流体阴霾：纯 GPU 模糊，零卡顿，告别死板方框 */}
                        <div className="relative w-full h-[400px] mb-24 overflow-hidden rounded-[4rem] border border-white/5 shadow-[0_0_120px_rgba(0,0,0,0.8)] flex items-center justify-center group/hero bg-[#05050A]">
                            
                            {/* 🌌 深空阴霾与异星流体背景 (纯 GPU 模糊，无缝融合) */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                {/* 底层宇宙深渊 */}
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#05050A] to-[#020203]" />
                                
                                {/* 异星云层 - 缓慢游动的极光 */}
                                <motion.div 
                                    animate={{ x: [0, 50, -30, 0], y: [0, -30, 50, 0], scale: [1, 1.2, 0.9, 1] }}
                                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-[-20%] left-[-10%] w-[60%] h-[80%] bg-fuchsia-800/30 rounded-[100%] blur-[120px] will-change-transform"
                                />
                                <motion.div 
                                    animate={{ x: [0, -40, 60, 0], y: [0, 50, -40, 0], scale: [1, 0.8, 1.3, 1] }}
                                    transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[90%] bg-indigo-900/40 rounded-[100%] blur-[140px] will-change-transform"
                                />
                                <motion.div 
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                    className="absolute top-[10%] left-[30%] w-[50%] h-[50%] bg-cyan-900/20 rounded-full blur-[100px] will-change-transform mix-blend-screen"
                                />
                            </div>

                            {/* 📄 悬浮的文字内容，告别生硬黑框 */}
                            <div className="relative z-20 text-center px-10 max-w-4xl">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }}
                                    className="flex flex-col items-center"
                                >
                                    {/* 顶部神秘符号 */}
                                    <div className="mb-6 opacity-70">
                                        <Sparkles className="w-6 h-6 text-fuchsia-400 animate-pulse" />
                                    </div>

                                    <h1 className="font-pixel text-4xl md:text-6xl text-white leading-tight drop-shadow-[0_0_40px_rgba(217,70,239,0.5)]">
                                        {t('bbsPage.title')}
                                    </h1>
                                    
                                    <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-fuchsia-500/50 to-transparent mx-auto mt-10" />
                                    
                                    <p className="mt-8 text-sm md:text-base text-white/60 font-mono uppercase tracking-[0.8em] leading-relaxed italic">
                                        {t('bbsPage.description')}
                                    </p>
                                </motion.div>
                            </div>
                            
                            {/* 顶部/底部暗角遮罩，完美融入页面背景 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-[#020203]/80 via-transparent to-[#020203]/90 pointer-events-none" />
                        </div>

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
                            <Button asChild className="rounded-full bg-white text-black font-black italic uppercase tracking-[0.2em] h-16 px-14 hover:scale-[1.1] hover:rotate-[-2deg] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)]">
                                <Link href="/bbs/new"><Plus className="mr-3 h-6 w-6" /> {t('bbsPage.newPost')}</Link>
                            </Button>
                        </div>
                    </>
                )}

                {/* 帖子矩阵 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 px-4">
                    <AnimatePresence mode="popLayout">
                        {filteredAndSortedPosts.map((post, idx) => (
                            <motion.div key={post.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="hover:z-10">
                                <BbsPostCard post={post} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
                
                {/* 分页加载 */}
                {hasMore && (
                    <div className="mt-32 text-center pb-20">
                        <Button onClick={handleLoadMore} disabled={loadingMore} className="group relative rounded-full bg-black border-2 border-white/10 text-white/20 font-black italic uppercase tracking-[0.5em] px-32 h-24 hover:text-primary hover:border-primary transition-all shadow-3xl text-xl overflow-hidden">
                            <span className="relative z-10">{loadingMore ? <Loader2 className="animate-spin mr-3" /> : "EXECUTE_DATA_SYNC"}</span>
                            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-5 transition-opacity" />
                        </Button>
                    </div>
                )}
            </main>

            {/* 动画部分保持全局生效 */}
            <style jsx global>{`
                @keyframes fluid-flow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-fluid-flow {
                    background-size: 300% 300%;
                    animation: fluid-flow 10s ease infinite;
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
            `}</style>
            
            {/* 🚀 优化 2：将 font-headline 限制为局部生效，防止再次污染全局顶部导航栏 */}
            <style jsx>{`
                .font-headline { font-family: 'Playfair Display', serif; }
            `}</style>
        </div>
    )
}

export default function BbsPage() {
    return (
        <Suspense fallback={<BbsPageSkeleton />}>
            <BbsPageContent />
        </Suspense>
    );
}