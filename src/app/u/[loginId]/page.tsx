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
    ThumbsUp, ThumbsDown, Minus, Globe, Activity // 🚀 补全 Activity 定义
} from "lucide-react";

const safeNum = (val: any, fallback = 0): number => (val === undefined || val === null || isNaN(Number(val))) ? fallback : Number(val);

const getNodeLevel = (score: number) => {
    if (score <= 200) return { id: 'CRISIS', label: 'CRISIS_NODE', color: 'text-red-500 border-red-500/50 bg-red-500/10 animate-pulse' };
    if (score <= 500) return { id: 'STABLE', label: 'STABLE_NODE', color: 'text-white/40 border-white/10 bg-white/5' };
    if (score <= 800) return { id: 'TRUSTED', label: 'TRUSTED_NODE', color: 'text-primary border-primary/50 bg-primary/10' };
    return { id: 'APEX', label: 'APEX_NODE', color: 'text-purple-400 border-purple-500/50 bg-purple-500/10' };
};

export default function UserProfilePage() {
    const params = useParams();
    const identifier = params.loginId as string;
    const firestore = useFirestore();
    
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
            } catch (e) { console.error(e); } finally { setLoading(false); }
        })();
    }, [firestore, identifier]);

    useEffect(() => {
        if (!firestore || !user) return;
        const fetchInitial = async () => {
            // 🛡️ 严格 50 条原则 [cite: 2026-02-07]
            const pS = await getDocs(query(collection(firestore, 'products'), where('sellerId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(50)));
            setProducts(pS.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            setLastProduct(pS.docs[pS.docs.length - 1]); setHasMoreProducts(pS.docs.length === 50);

            const bS = await getDocs(query(collection(firestore, 'bbs'), where('authorId', '==', user.id), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(50)));
            setUserPosts(bS.docs.map(d => ({ id: d.id, ...d.data() } as BbsPost)));
            setLastPost(bS.docs[bS.docs.length - 1]); setHasMorePosts(bS.docs.length === 50);

            const rS = await getDocs(query(collection(firestore, 'reviews'), where('targetUserId', '==', user.id), orderBy('createdAt', 'desc'), limit(50)));
            setFeedbacks(rS.docs.map(d => ({ id: d.id, ...d.data() })));
            setLastFeedback(rS.docs[rS.docs.length - 1]); setHasMoreFeedbacks(rS.docs.length === 50);

            const cS = await getDocs(query(collection(firestore, 'products'), where('favoritedBy', 'array-contains', user.id), limit(50)));
            setCollections(cS.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
            setLastCollection(cS.docs[cS.docs.length - 1]); setHasMoreCollections(cS.docs.length === 50);
        };
        fetchInitial();
    }, [firestore, user]);

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

    const displayScore = (user?.creditScore === undefined || user?.creditScore === 0) ? 500 : safeNum(user.creditScore);
    const nodeInfo = useMemo(() => getNodeLevel(displayScore), [displayScore]);

    if (loading) return <UserProfileSkeleton />;
    if (!user) return <div className="min-h-screen bg-black flex items-center justify-center font-mono text-primary animate-pulse">Node_Sync_Failed</div>;

    return (
      <div onMouseMove={(e) => setMousePos({ x: e.clientX - window.innerWidth/2, y: e.clientY - window.innerHeight/2 })} className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden overflow-y-auto pb-48 lg:pb-64 font-sans">
        
        <motion.div animate={{ x: mousePos.x * -0.01, y: mousePos.y * -0.01 }} className="fixed inset-0 z-0 opacity-40">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[180px] rounded-full" />
        </motion.div>

        <PageHeaderWithBackAndClose />
        <button onClick={() => setShowSnake(true)} className="fixed bottom-12 left-8 z-[60] text-white/20 hover:text-primary transition-all"><Gamepad2 className="h-6 w-6" /></button>
        
        <main className="container mx-auto px-4 pt-36 relative z-10">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="relative group">
                    <SellerProfileCard seller={user} className="relative z-10 bg-transparent border-none p-0 shadow-none" />
                    <div className="absolute top-6 right-8 flex gap-4 z-20">
                        {user.web3Verified && <div className="flex items-center gap-1.5 text-[#A855F7] font-black italic text-[10px] uppercase"><Globe className="h-3.5 w-3.5" /> Web3</div>}
                        {user.kycVerified && <div className="flex items-center gap-1.5 text-[#22C55E] font-black italic text-[10px] uppercase"><ShieldCheck className="h-3.5 w-3.5" /> KYC</div>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className={cn("bg-black/40 backdrop-blur-2xl border-white/5 rounded-[32px] p-8 flex flex-col items-center justify-center space-y-4", displayScore <= 200 && "border-red-500/30")}>
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90"><circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" /><motion.circle cx="72" cy="72" r="66" stroke="currentColor" strokeWidth="8" fill="transparent" initial={{ strokeDashoffset: 414 }} animate={{ strokeDashoffset: 414 - (414 * displayScore) / 1000 }} strokeDasharray={414} className={cn(displayScore <= 200 ? "text-red-500 shadow-[0_0_10px_red]" : "text-primary")} /></svg>
                            <span className="absolute text-4xl font-black italic">{displayScore}</span>
                        </div>
                        <div className={cn("px-4 py-1 rounded-full border text-[10px] font-mono font-black tracking-widest uppercase", nodeInfo.color)}>{nodeInfo.label}</div>
                    </Card>

                    <Card className="bg-black/40 backdrop-blur-2xl border-white/5 rounded-[32px] p-8 md:col-span-2 space-y-6">
                        <div className="flex justify-between items-end border-b border-white/5 pb-4">
                            <div className="flex items-center gap-4"><ShieldCheck className={cn("h-10 w-10", displayScore <= 200 ? "text-red-500 animate-pulse" : "text-primary")} /><div><h4 className="text-3xl font-black italic uppercase tracking-tighter">Trust Aggregator</h4><p className="text-white/30 text-[10px] font-mono uppercase">Verified trades: {safeNum(user.reviewsCount)}</p></div></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[{ l: 'POSITIVE', c: user.goodReviews, color: 'bg-green-500', icon: ThumbsUp }, { l: 'NEUTRAL', c: user.neutralReviews, color: 'bg-white/40', icon: Minus }, { l: 'NEGATIVE', c: user.badReviews, color: 'bg-red-500', icon: ThumbsDown }].map(i => (
                                <div key={i.l} className="space-y-2"><div className="flex justify-between text-[9px] font-mono font-bold uppercase text-white/50"><span>{i.l}</span><span>{safeNum(i.c)}</span></div><div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className={cn("h-full", i.color)} style={{ width: `${(safeNum(i.c) / (safeNum(user.reviewsCount) || 1)) * 100}%` }} /></div></div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="space-y-10">
                    <div className="flex items-center gap-8 border-b border-white/10 pb-4">
                        {[ 
                            {id:'marketplace', label:'Marketplace', icon:LayoutGrid}, 
                            {id:'posts', label:'Social Logs', icon:ScrollText}, 
                            {id:'reputation', label:'Reputation Logs', icon:ShieldCheck}, 
                            {id:'collections', label:'Vault', icon:Bookmark} 
                        ].map((t) => (
                            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={cn("relative flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] pb-4 -mb-[18px] transition-all", activeTab === t.id ? "text-primary" : "text-white/30 hover:text-white")}>
                                <t.icon className="h-4 w-4" /> {t.label}
                                {activeTab === t.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_#ec4899]" />}
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[500px]">
                        <AnimatePresence mode="wait">
                            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                                {activeTab === 'marketplace' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {products.map(p => <ProductCard key={p.id} product={p} />)}
                                        {products.length === 0 && <EmptyState icon={LayoutGrid} text="NO_ACTIVE_LISTINGS" />}
                                        {hasMoreProducts && <Button onClick={() => handleLoadMore('marketplace')} className="col-span-full mx-auto mt-10 rounded-full border-white/10 bg-white/5 uppercase tracking-widest text-[10px] py-6 px-10">Decrypt_More_Market</Button>}
                                    </div>
                                )}
                                {activeTab === 'posts' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {userPosts.map(p => <BbsPostCard key={p.id} post={p} />)}
                                        {userPosts.length === 0 && <EmptyState icon={ScrollText} text="RADIO_SILENCE" />}
                                        {hasMorePosts && <Button onClick={() => handleLoadMore('posts')} className="col-span-full mx-auto mt-10 rounded-full border-white/10 bg-white/5 uppercase tracking-widest text-[10px] py-6 px-10">Sync_More_Logs</Button>}
                                    </div>
                                )}
                                {activeTab === 'reputation' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                        {feedbacks.map(f => (
                                            <Card key={f.id} className={cn("bg-white/[0.02] border-l-4 p-6 rounded-[24px] backdrop-blur-md group", f.type === 'positive' ? "border-l-green-500/50" : f.type === 'negative' ? "border-l-red-500/50" : "border-l-white/20")}>
                                                <div className="flex justify-between mb-4"><div className="flex items-center gap-2"><span className="text-[10px] font-mono font-black uppercase">{f.type}_VERDICT</span></div><span className="text-[10px] font-mono text-white/20">{new Date(f.createdAt?.seconds * 1000).toLocaleDateString()}</span></div>
                                                <p className="text-sm text-white/70 italic leading-relaxed">"{f.comment || 'Transaction finalized.'}"</p>
                                                <div className="mt-6 pt-4 border-t border-white/5 text-[9px] font-mono text-white/20 flex justify-between uppercase"><span>TRX_HASH: {f.orderId?.substring(0,12).toUpperCase()}</span><span className={cn(f.type === 'positive' ? "text-green-500" : f.type === 'negative' ? "text-red-500" : "")}>Trust_Mod: {f.type === 'positive' ? '+5' : f.type === 'negative' ? '-20' : '0'}</span></div>
                                            </Card>
                                        ))}
                                        {feedbacks.length === 0 && <EmptyState icon={ShieldCheck} text="NO_REPUTATION_LOGS" />}
                                        {hasMoreFeedbacks && <Button onClick={() => handleLoadMore('reputation')} className="col-span-full mx-auto mt-10 rounded-full border-white/10 bg-white/5 uppercase tracking-widest text-[10px] py-6 px-10">Access_Older_Logs</Button>}
                                    </div>
                                )}
                                {activeTab === 'collections' && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        {collections.map(c => <ProductCard key={c.id} product={c} />)}
                                        {collections.length === 0 && <EmptyState icon={Bookmark} text="VAULT_LOCKED_OR_EMPTY" />}
                                        {hasMoreCollections && <Button onClick={() => handleLoadMore('collections')} className="col-span-full mx-auto mt-10 rounded-full border-white/10 bg-white/5 uppercase tracking-widest text-[10px] py-6 px-10">Access_Vault_Logs</Button>}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </main>
        {showSnake && <CyberSnakeGame onClose={() => setShowSnake(false)} />}
      </div>
    );
}

function EmptyState({ icon: Icon, text }: any) {
    return <div className="col-span-full h-80 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[40px] bg-black/20 animate-in fade-in duration-500"><Icon className="h-12 w-12 text-white/10 mb-6" /><p className="font-mono text-primary text-xs uppercase tracking-[0.4em]">{text}</p></div>;
}

function UserProfileSkeleton() {
    return <div className="min-h-screen bg-[#020202] p-8 pt-40 space-y-12"><Skeleton className="h-72 w-full max-w-6xl mx-auto rounded-[40px] bg-white/5" /></div>;
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
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center">
            <div className="bg-[#050505] border border-primary/30 p-8 rounded-3xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-white/30 hover:text-white"><X className="h-6 w-6" /></button>
                <div className="mb-6 flex justify-between font-mono text-primary uppercase text-xs"><span>Luna_Snake_v1.0</span><span>Score: {snake.length-1}</span></div>
                <div className="w-[320px] h-[320px] bg-black/50 border border-white/5 grid grid-cols-20 grid-rows-20" style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gridTemplateRows: 'repeat(20, 1fr)' }}>
                    {snake.map((s, i) => <div key={i} className={cn("bg-primary", i === 0 && "bg-white shadow-[0_0_10px_#fff]")} style={{ gridColumnStart: s[0]+1, gridRowStart: s[1]+1 }} />)}
                    <div className="bg-red-500 animate-pulse shadow-[0_0_15px_red]" style={{ gridColumnStart: food[0]+1, gridRowStart: food[1]+1 }} />
                </div>
                {gameOver && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-3xl p-8 text-center animate-in fade-in duration-500"><Activity className="h-12 w-12 text-red-500 mb-4 animate-pulse" /><p className="text-red-500 font-black text-xl mb-6 uppercase tracking-tighter italic">Critical_System_Failure</p><Button onClick={() => {setSnake([[10,10]]); setDir([0,-1]); setGameOver(false);}} className="rounded-full bg-red-500 text-black font-black px-10">REBOOT_CORE</Button></div>}
            </div>
        </div>
    );
}