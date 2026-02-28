'use client';

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, startAfter } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useFirestore } from "@/firebase";
import { UserProfile, Product, BbsPost } from "@/lib/types";
import { cn } from "@/lib/utils";

// UI Components
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { ProductCard } from "@/components/product-card";
import { BbsPostCard } from "@/components/bbs-post-card";
import { SellerProfileCard } from "@/components/seller-profile-card";

// Icons
import { 
    LayoutGrid, ScrollText, Bookmark, Gamepad2, X, ShieldCheck, 
    Globe, Activity, Cpu, History, Home, ShoppingBag, Sparkles
} from "lucide-react";

const safeNum = (val: any, fallback = 0): number => (val === undefined || val === null || isNaN(Number(val))) ? fallback : Number(val);

const getNodeLevel = (score: number) => {
    if (score <= 200) return { id: 'CRISIS', label: 'CRISIS_NODE', color: 'text-red-500 border-red-500/50 bg-red-500/10 animate-pulse' };
    if (score <= 500) return { id: 'STABLE', label: 'STABLE_NODE', color: 'text-white/40 border-white/10 bg-white/5' };
    if (score <= 800) return { id: 'TRUSTED', label: 'TRUSTED_NODE', color: 'text-primary border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]' };
    return { id: 'APEX', label: 'APEX_NODE', color: 'text-purple-400 border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.3)]' };
};

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    
    // 🚀 核心修复：根据你的文件夹名 [loginId] 匹配参数名
    const identifier = params.loginId as string; 
    
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'marketplace' | 'posts' | 'reputation' | 'collections'>('marketplace');
    const [showSnake, setShowSnake] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const [products, setProducts] = useState<Product[]>([]);
    const [lastProduct, setLastProduct] = useState<any>(null);
    const [hasMoreProducts, setHasMoreProducts] = useState(false);

    const [userPosts, setUserPosts] = useState<BbsPost[]>([]);
    const [lastPost, setLastPost] = useState<any>(null);
    const [hasMorePosts, setHasMorePosts] = useState(false);

    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [lastFeedback, setLastFeedback] = useState<any>(null);
    const [hasMoreFeedbacks, setHasMoreFeedbacks] = useState(false);

    const [collections, setCollections] = useState<Product[]>([]);
    const [lastCollection, setLastCollection] = useState<any>(null);
    const [hasMoreCollections, setHasMoreCollections] = useState(false);

    // 🛡️ 1. 获取核心用户信息
    useEffect(() => {
        if (!firestore || !identifier) return;
        (async () => {
            setLoading(true);
            try {
                let userDoc;
                if (/^\d{3,}$/.test(identifier)) {
                    const q = query(collection(firestore, 'users'), where('loginId', '==', identifier), limit(1));
                    const snap = await getDocs(q);
                    userDoc = snap.docs[0];
                } else {
                    userDoc = await getDoc(doc(firestore, 'users', identifier));
                }
                if (userDoc?.exists()) setUser({ id: userDoc.id, ...userDoc.data() } as UserProfile);
            } catch (e) { console.error("Identity retrieval error:", e); } finally { setLoading(false); }
        })();
    }, [firestore, identifier]);

    // 🛡️ 2. 初始化各选项卡数据 (严格遵循 50 条上限协议 [cite: 2026-02-07])
    useEffect(() => {
        if (!firestore || !user) return;
        const fetchInitial = async () => {
            try {
                const [pS, bS, rS, cS] = await Promise.all([
                    getDocs(query(collection(firestore, 'products'), where('sellerId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(50))),
                    getDocs(query(collection(firestore, 'bbs'), where('authorId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(50))),
                    getDocs(query(collection(firestore, 'reviews'), where('targetUserId', '==', user.id), orderBy('createdAt', 'desc'), limit(50))),
                    getDocs(query(collection(firestore, 'products'), where('favoritedBy', 'array-contains', user.id), limit(50)))
                ]);

                setProducts(pS.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
                setLastProduct(pS.docs[pS.docs.length - 1]); setHasMoreProducts(pS.docs.length === 50);

                setUserPosts(bS.docs.map(d => ({ id: d.id, ...d.data() } as BbsPost)));
                setLastPost(bS.docs[bS.docs.length - 1]); setHasMorePosts(bS.docs.length === 50);

                setFeedbacks(rS.docs.map(d => ({ id: d.id, ...d.data() })));
                setLastFeedback(rS.docs[rS.docs.length - 1]); setHasMoreFeedbacks(rS.docs.length === 50);

                setCollections(cS.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
                setLastCollection(cS.docs[cS.docs.length - 1]); setHasMoreCollections(cS.docs.length === 50);
            } catch (e) { console.warn("Data sync partially failed."); }
        };
        fetchInitial();
    }, [firestore, user]);

    // 分页加载逻辑
    const handleLoadMore = async (tab: string) => {
        if (!firestore || !user) return;
        const commonRef = collection(firestore, tab === 'reputation' ? 'reviews' : tab === 'posts' ? 'bbs' : 'products');
        
        if (tab === 'marketplace' && lastProduct) {
            const s = await getDocs(query(commonRef, where('sellerId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), startAfter(lastProduct), limit(50)));
            setProducts(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() } as Product))]);
            setLastProduct(s.docs[s.docs.length - 1]); setHasMoreProducts(s.docs.length === 50);
        } else if (tab === 'reputation' && lastFeedback) {
            const s = await getDocs(query(commonRef, where('targetUserId', '==', user.id), orderBy('createdAt', 'desc'), startAfter(lastFeedback), limit(50)));
            setFeedbacks(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() }))]);
            setLastFeedback(s.docs[s.docs.length - 1]); setHasMoreFeedbacks(s.docs.length === 50);
        } else if (tab === 'posts' && lastPost) {
            const s = await getDocs(query(commonRef, where('authorId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), startAfter(lastPost), limit(50)));
            setUserPosts(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() } as BbsPost))]);
            setLastPost(s.docs[s.docs.length - 1]); setHasMorePosts(s.docs.length === 50);
        } else if (tab === 'collections' && lastCollection) {
            const s = await getDocs(query(commonRef, where('favoritedBy', 'array-contains', user.id), startAfter(lastCollection), limit(50)));
            setCollections(p => [...p, ...s.docs.map(d => ({ id: d.id, ...d.data() } as Product))]);
            setLastCollection(s.docs[s.docs.length - 1]); setHasMoreCollections(s.docs.length === 50);
        }
    };

    const displayScore = useMemo(() => (user?.creditScore === undefined || user?.creditScore === 0) ? 500 : safeNum(user.creditScore), [user]);
    const nodeInfo = useMemo(() => getNodeLevel(displayScore), [displayScore]);

    if (loading) return <UserProfileSkeleton />;
    if (!user) return <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono text-primary animate-pulse tracking-[0.5em]">PROTOCOL_SYNC_ERROR<Button onClick={() => router.push('/')} variant="ghost" className="mt-8 text-white/40 hover:text-white uppercase tracking-[0.2em]">Force_Return_Home</Button></div>;

    return (
      <div onMouseMove={(e) => setMousePos({ x: e.clientX - window.innerWidth/2, y: e.clientY - window.innerHeight/2 })} className="min-h-screen bg-[#050508] text-white relative overflow-hidden font-sans selection:bg-primary/30">
        
        {/* 🌌 Apple 级 Nebula Pulse 动态流体背景 */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[#050508]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1a1025_0%,#050508_70%)]" />
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]" />
            
            <motion.div animate={{ x: mousePos.x * -0.05, y: mousePos.y * -0.05 }} className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-primary/10 blur-[150px] rounded-full animate-blob" />
            <motion.div animate={{ x: mousePos.x * 0.04, y: mousePos.y * 0.04 }} className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-purple-600/10 blur-[150px] rounded-full animate-blob animation-delay-2000" />
        </div>

        {/* 🚀 物理级修正：显式传入 backPath 防止跳转至 404 */}
        <PageHeaderWithBackAndClose backPath="/" />
        
        <div className="h-screen w-full overflow-y-auto relative z-10 no-scrollbar pb-32">
            <main className="container mx-auto px-4 pt-40">
                <div className="max-w-6xl mx-auto space-y-16">
                    
                    {/* 用户名片区 - 强制锁定圆角 */}
                    <div className="relative group isolate overflow-hidden rounded-[40px] shadow-2xl" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-[40px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <SellerProfileCard seller={user} className="relative z-10 bg-white/[0.03] border-white/10 p-10 backdrop-blur-3xl ring-1 ring-white/10" />
                        <div className="absolute top-8 right-10 flex gap-3 z-20">
                            {user.web3Verified && <div className="flex items-center gap-2 bg-[#A855F7]/20 border border-[#A855F7]/40 px-4 py-2 rounded-full text-[#A855F7] font-black italic text-[10px] uppercase shadow-[0_0_15px_rgba(168,85,247,0.3)]"><Globe className="h-4 w-4" /> WEB3</div>}
                            {user.kycVerified && <div className="flex items-center gap-2 bg-[#22C55E]/20 border border-[#22C55E]/40 px-4 py-2 rounded-full text-[#22C55E] font-black italic text-[10px] uppercase shadow-[0_0_15px_rgba(34,197,94,0.3)]"><ShieldCheck className="h-4 w-4" /> KYC</div>}
                        </div>
                    </div>

                    {/* 仪表盘数据区 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Card className="bg-black/40 backdrop-blur-3xl border-white/10 rounded-[40px] p-10 flex flex-col items-center justify-center space-y-6 ring-1 ring-white/10 overflow-hidden isolate" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                            <div className="relative w-44 h-44 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-white/5 animate-spin-slow opacity-20" />
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                    <motion.circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="10" fill="transparent" initial={{ strokeDashoffset: 502 }} animate={{ strokeDashoffset: 502 - (502 * displayScore) / 1000 }} strokeDasharray={502} className={displayScore <= 200 ? "text-red-500" : "text-primary"} strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center text-white">
                                    <span className="text-5xl font-black italic tracking-tighter">{displayScore}</span>
                                    <span className="text-[9px] font-mono text-white/40 uppercase mt-1 tracking-widest">Trust_Index</span>
                                </div>
                            </div>
                            <div className={cn("px-6 py-2 rounded-full border text-[11px] font-mono font-black tracking-[0.2em] uppercase shadow-inner", nodeInfo.color)}>{nodeInfo.label}</div>
                        </Card>

                        <Card className="bg-black/40 backdrop-blur-3xl border-white/10 rounded-[40px] p-10 md:col-span-2 space-y-8 relative overflow-hidden ring-1 ring-white/10 isolate" style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
                            <div className="flex items-center gap-6 border-b border-white/5 pb-6">
                                <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
                                    <Cpu className={cn("h-8 w-8", displayScore <= 200 && "text-red-500 animate-pulse")} />
                                </div>
                                <div>
                                    <h4 className="text-4xl font-black italic uppercase tracking-tighter text-white">Trust_Aggregator</h4>
                                    <p className="text-white/30 text-[11px] font-mono uppercase tracking-widest">Operational History: {safeNum(user.reviewsCount)} Deployments</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-8">
                                {[
                                    { l: 'POSITIVE', c: user.goodReviews, color: 'from-green-500 to-emerald-400' }, 
                                    { l: 'NEUTRAL', c: user.neutralReviews, color: 'from-white/30 to-white/10' }, 
                                    { l: 'NEGATIVE', c: user.badReviews, color: 'from-red-500 to-orange-500' }
                                ].map(i => (
                                    <div key={i.l} className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-mono font-black uppercase text-white/40 tracking-widest">
                                            <span>{i.l}</span>
                                            <span className="text-white">{safeNum(i.c)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className={cn("h-full rounded-full bg-gradient-to-r", i.color)} style={{ width: `${(safeNum(i.c) / (safeNum(user.reviewsCount) || 1)) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* 动态选项卡 */}
                    <div className="space-y-12 pb-24">
                        <div className="flex items-center gap-10 border-b border-white/5 pb-0">
                            {[ 
                                {id:'marketplace', label:'Market', icon:LayoutGrid}, 
                                {id:'posts', label:'Social', icon:ScrollText}, 
                                {id:'reputation', label:'Reputation', icon:ShieldCheck}, 
                                {id:'collections', label:'Vault', icon:Bookmark} 
                            ].map((t) => (
                                <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={cn("relative flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.3em] pb-6 transition-all duration-300", activeTab === t.id ? "text-primary" : "text-white/20 hover:text-white/60")}>
                                    <t.icon className="h-4 w-4" /> {t.label}
                                    {activeTab === t.id && <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary shadow-[0_0_20px_#ec4899]" />}
                                </button>
                            ))}
                        </div>

                        <div className="min-h-[600px]">
                            <AnimatePresence mode="wait">
                                <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                    {activeTab === 'marketplace' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                            {products.map(p => <ProductCard key={p.id} product={p} />)}
                                            {products.length === 0 && <EmptyState icon={LayoutGrid} text="SYSTEM_EMPTY: NO_ASSETS_DEPLOYED" />}
                                            {hasMoreProducts && <Button onClick={() => handleLoadMore('marketplace')} className="col-span-full mx-auto mt-16 rounded-full border-white/10 bg-white/5 py-8 px-12 font-black">LOAD_MORE_MARKET_DATA</Button>}
                                        </div>
                                    )}
                                    {activeTab === 'posts' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {userPosts.map(p => <BbsPostCard key={p.id} post={p} />)}
                                            {userPosts.length === 0 && <EmptyState icon={ScrollText} text="CONNECTION_IDLE: NO_TRANSMISSIONS" />}
                                            {hasMorePosts && <Button onClick={() => handleLoadMore('posts')} className="col-span-full mx-auto mt-16 rounded-full border-white/10 bg-white/5 py-8 px-12 font-black">SYNC_ARCHIVED_LOGS</Button>}
                                        </div>
                                    )}
                                    {activeTab === 'reputation' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-white">
                                            {feedbacks.map(f => (
                                                <Card key={f.id} className={cn("bg-white/[0.03] border-l-[6px] p-8 rounded-[32px] backdrop-blur-3xl border-white/5 relative transition-all hover:bg-white/[0.05]", f.type === 'positive' ? "border-l-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]" : f.type === 'negative' ? "border-l-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-l-white/20")}>
                                                    <div className="flex justify-between items-start mb-6 font-mono text-[11px] uppercase text-white/60"><span>{f.type}_FEEDBACK</span><span>{f.createdAt?.seconds ? new Date(f.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</span></div>
                                                    <p className="text-base text-white/80 italic mb-6 leading-relaxed font-medium">"{f.comment || 'Transaction finalized.'}"</p>
                                                    <div className="flex items-center gap-4 py-4 px-4 bg-white/5 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/5"><div className="h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-inner"><img src={f.itemImage || '/placeholder.png'} className="object-cover w-full h-full" alt="asset" /></div><div className="overflow-hidden space-y-1"><p className="text-[10px] text-white/40 uppercase font-mono truncate">{f.itemName || 'Asset_Unknown'}</p><p className="text-[9px] text-primary font-black">REF_ID: {f.orderId?.substring(0,8).toUpperCase()}</p></div></div>
                                                </Card>
                                            ))}
                                            {feedbacks.length === 0 && <EmptyState icon={ShieldCheck} text="CLEAN_RECORD: NO_FEEDBACK_DETECTED" />}
                                        </div>
                                    )}
                                    {activeTab === 'collections' && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                            {collections.map(c => <ProductCard key={c.id} product={c} />)}
                                            {collections.length === 0 && <EmptyState icon={Bookmark} text="VAULT_SECURED: NO_COLLECTIONS" />}
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <button onClick={() => setShowSnake(true)} className="fixed bottom-12 left-8 z-[60] text-white/10 hover:text-primary transition-all"><Gamepad2 className="h-6 w-6" /></button>
        <AnimatePresence>{showSnake && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><CyberSnakeGame onClose={() => setShowSnake(false)} /></motion.div>}</AnimatePresence>

        <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1); filter: blur(150px); }
                33% { transform: translate(50px, -70px) scale(1.2); filter: blur(120px); }
                66% { transform: translate(-40px, 40px) scale(0.8); filter: blur(180px); }
                100% { transform: translate(0px, 0px) scale(1); filter: blur(150px); }
            }
            .animate-blob { animation: blob 15s infinite alternate ease-in-out; }
            .animate-spin-slow { animation: spin 12s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
}

function EmptyState({ icon: Icon, text }: any) {
    return (
        <div className="col-span-full h-96 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[40px] bg-white/[0.01] animate-in fade-in zoom-in">
            <div className="p-6 rounded-full bg-white/[0.02] border border-white/5 mb-8"><Icon className="h-10 w-10 text-white/10" /></div>
            <p className="font-mono text-primary/60 text-[10px] uppercase tracking-[0.5em] font-black">{text}</p>
        </div>
    );
}

function UserProfileSkeleton() {
    return (
        <div className="min-h-screen bg-[#050508] p-8 pt-48 space-y-12">
            <Skeleton className="h-96 w-full max-w-6xl mx-auto rounded-[40px] bg-white/5" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                <Skeleton className="h-64 rounded-[40px] bg-white/5" />
                <Skeleton className="h-64 md:col-span-2 rounded-[40px] bg-white/5" />
            </div>
        </div>
    );
}

function CyberSnakeGame({ onClose }: any) {
    const [snake, setSnake] = useState([[10, 10]]);
    const [food, setFood] = useState([5, 5]);
    const [dir, setDir] = useState([0, -1]);
    const [gameOver, setGameOver] = useState(false);
    const move = useCallback(() => {
        if (gameOver) return;
        setSnake((prev) => {
            const h = [prev[0][0] + dir[0], prev[0][1] + dir[1]];
            if (h[0]<0||h[0]>=20||h[1]<0||h[1]>=20||prev.some(s=>s[0]===h[0]&&s[1]===h[1])) {setGameOver(true); return prev;}
            const n = [h, ...prev];
            if (h[0]===food[0]&&h[1]===food[1]) setFood([Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)]);
            else n.pop();
            return n;
        });
    }, [dir, food, gameOver]);
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key==='ArrowUp') setDir([0,-1]); else if (e.key==='ArrowDown') setDir([0,1]);
            else if (e.key==='ArrowLeft') setDir([-1,0]); else if (e.key==='ArrowRight') setDir([1,0]);
        };
        window.addEventListener('keydown', h);
        const i = setInterval(move, 120);
        return () => { window.removeEventListener('keydown', h); clearInterval(i); };
    }, [move]);
    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#0A0A0C] border border-primary/30 p-10 rounded-[40px] relative shadow-[0_0_100px_rgba(236,72,153,0.1)]">
                <button onClick={onClose} className="absolute top-8 right-8 text-white/30 hover:text-white transition-all"><X className="h-6 w-6" /></button>
                <div className="mb-8 flex justify-between font-mono text-primary uppercase text-xs tracking-widest font-black"><span>Luna_Snake_v1.0</span><span>Score: {snake.length-1}</span></div>
                <div className="w-[320px] h-[320px] bg-black/50 border border-white/5" style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gridTemplateRows: 'repeat(20, 1fr)' }}>
                    {snake.map((s, i) => <div key={i} className={cn("bg-primary", i === 0 && "bg-white shadow-[0_0_15px_#fff]")} style={{ gridColumnStart: s[0]+1, gridRowStart: s[1]+1 }} />)}
                    <div className="bg-red-500 animate-pulse shadow-[0_0_15px_red]" style={{ gridColumnStart: food[0]+1, gridRowStart: food[1]+1 }} />
                </div>
                {gameOver && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded-[40px] p-8 text-center animate-in fade-in duration-500"><Activity className="h-12 w-12 text-red-500 mb-4 animate-pulse" /><p className="text-red-500 font-black text-xl mb-6 uppercase tracking-tighter italic">Critical_System_Failure</p><Button onClick={() => {setSnake([[10,10]]); setDir([0,-1]); setGameOver(false);}} className="rounded-full bg-red-500 text-black font-black px-10 h-14 shadow-[0_0_20px_rgba(239,68,68,0.4)]">REBOOT_CORE</Button></div>}
            </div>
        </div>
    );
}