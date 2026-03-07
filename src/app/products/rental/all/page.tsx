'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { ProductCard } from '@/components/product-card';
import { Loader2, Box, Search as SearchIcon, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PAGE_SIZE = 50;
const CATEGORIES = [
    { id: 'all', label: 'ALL_ESTATES' },
    { id: '高空公寓 (Apartment)', label: 'APARTMENT' },
    { id: '赛博舱 (Cabin)', label: 'CABIN' },
    { id: '独栋别墅 (Villa)', label: 'VILLA' },
    { id: '豪华庄园 (Mansion)', label: 'MANSION' } 
];

// ==========================================
// 🚀 GPU 级流体背景 & 异形鼠标跟随光晕动画
// ==========================================
const inlineStyles = `
  .fluid-container { position: fixed; inset: 0; background: #020203; overflow: hidden; z-index: 0; }
  .fluid-orb { 
      position: absolute; border-radius: 50%; 
      filter: blur(120px); will-change: transform; mix-blend-mode: screen; 
  }
  
  @keyframes orb-float-1 {
      0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
      33% { transform: translate3d(15vw, 15vh, 0) scale(1.3) rotate(45deg); }
      66% { transform: translate3d(-10vw, 25vh, 0) scale(0.8) rotate(90deg); }
      100% { transform: translate3d(0, 0, 0) scale(1) rotate(180deg); }
  }
  @keyframes orb-float-2 {
      0% { transform: translate3d(0, 0, 0) scale(1) rotate(0deg); }
      33% { transform: translate3d(-15vw, -10vh, 0) scale(0.9) rotate(-45deg); }
      66% { transform: translate3d(20vw, -20vh, 0) scale(1.4) rotate(-90deg); }
      100% { transform: translate3d(0, 0, 0) scale(1) rotate(-180deg); }
  }
  @keyframes orb-float-3 {
      0% { transform: translate3d(0, 0, 0) scale(1); }
      50% { transform: translate3d(5vw, -15vh, 0) scale(1.5); }
      100% { transform: translate3d(0, 0, 0) scale(1); }
  }

  .orb-1 { top: -10%; left: -10%; width: 70vw; height: 70vw; background: rgba(147, 51, 234, 0.35); animation: orb-float-1 30s infinite cubic-bezier(0.4, 0, 0.2, 1); }
  .orb-2 { bottom: -20%; right: -10%; width: 80vw; height: 80vw; background: rgba(30, 58, 138, 0.35); animation: orb-float-2 40s infinite cubic-bezier(0.4, 0, 0.2, 1) reverse; }
  .orb-3 { top: 30%; left: 20%; width: 60vw; height: 60vw; background: rgba(217, 70, 239, 0.2); animation: orb-float-3 25s infinite cubic-bezier(0.4, 0, 0.2, 1); }

  @keyframes alien-morph {
      0% { border-radius: 40% 60% 70% 30% / 40% 40% 60% 50%; transform: rotate(0deg) scale(1); }
      34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: rotate(120deg) scale(1.1); }
      67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: rotate(240deg) scale(0.9); }
      100% { border-radius: 40% 60% 70% 30% / 40% 40% 60% 50%; transform: rotate(360deg) scale(1); }
  }
  .alien-aura {
      animation: alien-morph 12s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
`;

export default function AllRentalPropertiesPage() {
    const db = useFirestore();
    const router = useRouter(); 
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 40, stiffness: 40, mass: 3 }; 
    const auraX = useSpring(mouseX, springConfig);
    const auraY = useSpring(mouseY, springConfig);
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    };

    const fetchProperties = async (isLoadMore = false) => {
        if (!db) return;
        setLoading(true);
        try {
            let constraints: any[] = [
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc')
            ];
            if (activeCategory !== 'all') { constraints.push(where('propertyType', '==', activeCategory)); }
            if (isLoadMore && lastDoc) { constraints.push(startAfter(lastDoc)); }
            constraints.push(limit(PAGE_SIZE));

            const q = query(collection(db, 'rentalProperties'), ...constraints);
            const snap = await getDocs(q);
            const newData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isLoadMore) { setProperties(prev => [...prev, ...newData]); } 
            else { setProperties(newData); }

            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (err) { console.error("Sanctum Sync Error:", err); } 
        finally { setLoading(false); }
    };

    useEffect(() => {
        setProperties([]);
        setLastDoc(null);
        setHasMore(true);
        fetchProperties(false);
    }, [db, activeCategory]);

    const filteredProperties = useMemo(() => {
        let result = properties;
        if (debouncedSearchTerm) {
            const term = debouncedSearchTerm.toLowerCase();
            result = result.filter(p =>
                (p.title?.toLowerCase().includes(term)) ||
                (p.name?.toLowerCase().includes(term)) ||
                (p.description?.toLowerCase().includes(term)) ||
                (p.location?.city?.toLowerCase().includes(term))
            );
        }
        return result;
    }, [properties, debouncedSearchTerm]);

    return (
        <div className="min-h-screen bg-[#020203] text-white pb-32 selection:bg-purple-500/30 relative">
            <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />
            
            <div className="fluid-container pointer-events-none overflow-hidden z-0 fixed inset-0">
                <div className="fluid-orb orb-1" />
                <div className="fluid-orb orb-2" />
                <div className="fluid-orb orb-3" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-[#020203]/40 to-transparent z-10" />
            </div>
            
            {/* 🚀 核心修复：top-[100px] 完美避开全局顶部导航栏，随页面悬浮 */}
            <div className="fixed top-[90px] md:top-[110px] left-0 w-full px-4 md:px-10 flex items-center justify-between z-[90] pointer-events-none">
                
                {/* 👈 BACK */}
                <motion.button 
                    onClick={() => router.back()}
                    whileHover="hover" initial="initial"
                    className="flex-shrink-0 flex items-center gap-4 group cursor-pointer pointer-events-auto"
                >
                    <div className="relative">
                        <motion.div 
                            variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }}
                            className="absolute -inset-2 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full blur-2xl transition-all duration-700"
                        />
                        <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050508] border-2 border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:border-purple-400 group-hover:bg-black transition-colors duration-300">
                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                        </div>
                    </div>
                    <span className="hidden lg:block text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-white/50 group-hover:text-purple-300 transition-all drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
                        [ BACK ]
                    </span>
                </motion.button>

                {/* 👉 HOME */}
                <Link href="/" className="flex-shrink-0 flex flex-row-reverse items-center gap-4 group cursor-pointer pointer-events-auto">
                    <motion.div whileHover="hover" initial="initial" className="flex flex-row-reverse items-center gap-4">
                        <div className="relative">
                            <motion.div 
                                variants={{ hover: { scale: 1.8, opacity: 0.9 }, initial: { scale: 1.2, opacity: 0.3 } }}
                                className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full blur-2xl transition-all duration-700"
                            />
                            <div className="relative z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#050508] border-2 border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.3)] group-hover:border-cyan-400 group-hover:bg-black transition-colors duration-300">
                                <Home className="w-4 h-4 md:w-5 md:h-5 text-white/70 group-hover:text-white transition-colors" />
                            </div>
                        </div>
                        <span className="hidden lg:block text-[10px] font-mono font-black italic uppercase tracking-[0.4em] text-white/50 group-hover:text-cyan-300 transition-all drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                            [ HOME ]
                        </span>
                    </motion.div>
                </Link>
            </div>

            {/* 🚀 主内容区 pt-[160px]，确保即使按钮下移了，也不会挡住 SANCTUM 头部标题 */}
            <main className="container mx-auto px-4 md:px-8 pt-[160px] md:pt-[180px] relative z-20">
                
                {/* 🏛️ 孤傲流体版 SANCTUM (物理悬停 + 高奢画廊文案) */}
                <div 
                    className="w-full max-w-5xl mx-auto mb-10 relative z-20"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative p-8 md:px-10 md:py-8 border border-white/[0.04] bg-[#050508]/60 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                        
                        <motion.div 
                            className="pointer-events-none absolute z-0 mix-blend-screen opacity-0 transition-opacity duration-1000"
                            animate={{ opacity: isHovering ? 1 : 0 }}
                            style={{ 
                                x: auraX, y: auraY, 
                                translateX: '-50%', translateY: '-50%',
                                width: '400px', height: '400px',
                            }}
                        >
                            <div 
                                className="alien-aura w-full h-full opacity-50"
                                style={{ 
                                    background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, rgba(59,130,246,0.05) 50%, transparent 70%)',
                                    filter: 'blur(30px)'
                                }}
                            />
                        </motion.div>

                        <div className="md:col-span-8 relative z-10">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                                <span className="font-sans text-[9px] text-white/40 tracking-[0.4em] uppercase font-semibold">
                                    Private Collection
                                </span>
                            </motion.div>
                            
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
                                className="text-5xl sm:text-6xl md:text-[6.5rem] font-serif font-light text-white uppercase tracking-[0.02em] leading-none mb-4"
                            >
                                SANCTUM<span className="text-white/20">.</span>
                            </motion.h1>
                            
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="flex items-center gap-4 max-w-md">
                                <div className="h-[1px] bg-white/20 w-6" />
                                <h2 className="text-xs sm:text-sm font-serif italic text-white/50 tracking-wide">
                                    An immutable selection of the rarest physical nodes.
                                </h2>
                            </motion.div>
                        </div>
                        
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="md:col-span-4 flex flex-col items-end text-right z-10 hidden md:flex">
                            <div className="font-sans text-[9px] uppercase tracking-[0.25em] space-y-4 w-full text-white/30">
                                <div className="flex justify-between items-end border-b border-white/[0.03] pb-2">
                                    <span>Edition</span>
                                    <span className="text-white/70 font-medium">Genesis</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-white/[0.03] pb-2">
                                    <span>Verification</span>
                                    <span className="text-purple-300/60 font-medium drop-shadow-md">PRO Merchants</span>
                                </div>
                                <div className="flex justify-between items-end pb-1">
                                    <span>Credibility</span>
                                    <span className="text-white/70 font-medium">Verified By Selection</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 🚀 搜索与分类模块 */}
                <div className="max-w-4xl mx-auto mb-12 space-y-6 relative z-20">
                    <div className="relative group mx-auto max-w-2xl">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-md opacity-50 group-hover:opacity-100 transition-all duration-500" />
                        <div className="relative flex items-center bg-[#0a0a0e]/80 backdrop-blur-3xl border border-white/10 hover:border-purple-500/40 rounded-full p-1 shadow-xl transition-all duration-300">
                            <div className="pl-5 pr-3">
                                <SearchIcon className="h-4 w-4 text-purple-400 group-hover:animate-pulse" />
                            </div>
                            <Input 
                                placeholder="SEARCH ARCHIVE // TITLES, CITIES..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-10 w-full bg-transparent border-none outline-none text-white placeholder:text-white/30 font-mono text-xs tracking-widest uppercase pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-5 py-2.5 rounded-full font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 border backdrop-blur-md ${
                                    activeCategory === cat.id 
                                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105' 
                                    : 'bg-white/[0.02] text-white/40 border-white/10 hover:border-white/20 hover:text-white/80 hover:bg-white/[0.05]'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 🚀 数据展示区 */}
                {loading && properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 opacity-50 mt-10 relative z-20">
                        <Loader2 className="animate-spin text-purple-400/50 mb-4" size={28} />
                        <span className="font-mono text-[10px] text-white/30 uppercase tracking-[0.4em]">Decyphering_Node_Data...</span>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 relative z-20">
                            <AnimatePresence>
                                {filteredProperties.map((prop, idx) => (
                                    <motion.div key={prop.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: (idx % 8) * 0.1 }} className="relative group h-full isolate transform-gpu">
                                        <div className="absolute -inset-4 bg-gradient-to-b from-purple-500/0 to-purple-500/10 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                        <div className="relative z-10 h-full">
                                            <ProductCard product={{ 
                                                ...prop, 
                                                id: `rental/${prop.id}`, 
                                                name: prop.title || prop.name,
                                                seller: prop.seller || { id: prop.ownerId, name: prop.ownerDisplayName || prop.ownerName || 'Luna Owner', avatarUrl: prop.ownerAvatarUrl || prop.ownerPhotoURL },
                                                price: prop.pricePerDay || prop.price,
                                                category: prop.propertyType || prop.category || 'Rental',
                                                currency: prop.currency || '₮'
                                            }} />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {filteredProperties.length === 0 && properties.length > 0 && (
                            <div className="flex flex-col items-center justify-center py-24 mt-10 border border-white/5 rounded-[2rem] bg-black/20 backdrop-blur-3xl relative overflow-hidden z-20">
                                <SearchIcon className="text-white/10 mb-4 relative z-10" size={40} />
                                <p className="text-white/30 font-mono text-xs uppercase tracking-[0.4em] relative z-10">NO_MATCHING_RECORDS_FOUND</p>
                            </div>
                        )}

                        {hasMore && !debouncedSearchTerm && (
                            <div className="mt-20 flex justify-center relative z-20 overflow-hidden pointer-events-auto">
                                <Button onClick={() => fetchProperties(true)} disabled={loading} variant="ghost" className="group relative overflow-hidden rounded-full border border-white/10 bg-black/40 backdrop-blur-md px-10 h-12 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-all hover:bg-white/5 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                                    {loading ? <Loader2 className="animate-spin text-purple-400" size={14} /> : <span className="text-white/70 group-hover:text-white transition-colors">Reveal More Nodes</span>}
                                </Button>
                            </div>
                        )}

                        {properties.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-32 mt-10 border border-white/5 rounded-[2rem] bg-black/20 backdrop-blur-md relative overflow-hidden z-20">
                                <Box className="text-white/10 mb-4 relative z-10" size={50} strokeWidth={1} />
                                <p className="text-white/30 font-mono text-xs uppercase tracking-[0.4em] relative z-10">Void: No Nodes Detected</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}