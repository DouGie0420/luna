'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'; 
import { 
    Search, MapPin, Zap, Snowflake, Waves, 
    Building, Home, Tent, Castle, Filter,
    LayoutGrid, ChevronRight, Sparkles,
    ArrowUpDown, TrainFront, Fingerprint
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// ==========================================
// 🚀 全局动画与 3D 空间网格引擎 (纯 GPU 加速)
// ==========================================
const inlineStyles = `
  /* 呼吸发光边框 */
  @keyframes cyberGlow {
    0% { box-shadow: 0 0 0px rgba(168,85,247,0); border-color: rgba(255,255,255,0.05); }
    50% { box-shadow: 0 0 25px rgba(168,85,247,0.3); border-color: rgba(168,85,247,0.4); }
    100% { box-shadow: 0 0 0px rgba(168,85,247,0); border-color: rgba(255,255,255,0.05); }
  }
  .card-cyber-glow:hover { animation: cyberGlow 2s ease-in-out infinite; }
  
  /* 深空流体缓慢游动 */
  @keyframes fluid-morph {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      33% { transform: translate3d(4vw, -4vh, 0) scale(1.05); }
      66% { transform: translate3d(-3vw, 3vh, 0) scale(0.95); }
  }
  .animate-fluid-slow { animation: fluid-morph 30s infinite ease-in-out; will-change: transform; }
  .animate-fluid-slower { animation: fluid-morph 40s infinite ease-in-out reverse; will-change: transform; }

  /* 3D 透视赛博网格底板 */
  .perspective-grid {
      background-image: 
          linear-gradient(to right, rgba(168, 85, 247, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(168, 85, 247, 0.15) 1px, transparent 1px);
      background-size: 50px 50px;
      transform: perspective(600px) rotateX(60deg) translateY(-50px) translateZ(-200px);
      transform-origin: top center;
      mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%);
      -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%);
  }
`;

const CATEGORIES = [
    { id: 'all', label: 'GLOBAL_NODE', icon: LayoutGrid },
    { id: 'elevator', label: 'ELEVATOR', icon: ArrowUpDown },
    { id: 'subway', label: 'SUBWAY_LINK', icon: TrainFront },
    { id: '高空公寓 (Apartment)', label: 'APARTMENT', icon: Building },
    { id: '独栋别墅 (Villa)', label: 'VILLA_CORE', icon: Home },
    { id: '赛博舱 (Cabin)', label: 'CYBER_CABIN', icon: Tent },
    { id: '豪华庄园 (Mansion)', label: 'MANSION', icon: Castle },
];

export default function RealEstateMarket() {
    const db = useFirestore();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');

    // --- 🚀 核心逻辑保持绝对不变 ---
    useEffect(() => {
        const fetchProperties = async () => {
            if (!db) return;
            setLoading(true);
            try {
                let q;
                if (activeCategory === 'all') {
                    q = query(
                        collection(db, 'rentalProperties'),
                        where('status', '==', 'active'),
                        orderBy('createdAt', 'desc'),
                        limit(50) 
                    );
                } else if (activeCategory === 'elevator') {
                    q = query(
                        collection(db, 'rentalProperties'),
                        where('status', '==', 'active'),
                        where('amenities', 'array-contains', '电梯'),
                        orderBy('createdAt', 'desc'),
                        limit(50)
                    );
                } else if (activeCategory === 'subway') {
                    q = query(
                        collection(db, 'rentalProperties'),
                        where('status', '==', 'active'),
                        where('amenities', 'array-contains', '临近地铁'),
                        orderBy('createdAt', 'desc'),
                        limit(50)
                    );
                } else {
                    q = query(
                        collection(db, 'rentalProperties'),
                        where('status', '==', 'active'),
                        where('propertyType', '==', activeCategory),
                        orderBy('createdAt', 'desc'),
                        limit(50)
                    );
                }
                
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProperties(data);
            } catch (error) {
                console.error("Error fetching market data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [db, activeCategory]);

    const filteredProperties = properties; 

    return (
        <div className="min-h-screen bg-[#030305] text-white pt-24 pb-20 px-4 md:px-8 lg:px-12 relative overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />
            
            {/* 🌌 最底层：全局暗场背景 */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(88,28,135,0.1)_0%,_transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(30,58,138,0.1)_0%,_transparent_50%)]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto">
                
                {/* 🚀 全新高逼格 Hero 横幅 (透视网格 + 毛玻璃 + 流体) */}
                <header className="relative w-full h-[450px] md:h-[380px] rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] mb-12 bg-[#05050A]/80 backdrop-blur-3xl flex flex-col items-center justify-center group/hero">
                    
                    {/* 3D 赛博空间底座 */}
                    <div className="absolute inset-x-0 bottom-[-20%] h-[150%] perspective-grid pointer-events-none opacity-40 group-hover/hero:opacity-70 transition-opacity duration-1000" />
                    
                    {/* GPU 加速背景流体球 (径向渐变，零卡顿) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div className="absolute top-[-30%] left-[10%] w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.25)_0%,_transparent_70%)] rounded-full animate-fluid-slow" />
                        <div className="absolute bottom-[-20%] right-[10%] w-[70vw] h-[70vw] md:w-[45vw] md:h-[45vw] bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.2)_0%,_transparent_70%)] rounded-full animate-fluid-slower" style={{ animationDelay: '-10s' }} />
                    </div>

                    {/* 核心搜索与展示区 */}
                    <div className="relative z-20 w-full px-6 flex flex-col items-center text-center">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col items-center w-full">
                            
                            {/* 顶部状态指示器 */}
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md mb-6 shadow-xl">
                                <Fingerprint className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                                <span className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] uppercase">SECURE_ACCESS_GRANTED</span>
                            </div>

                            {/* 极具张力的标题排版 */}
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white/50 drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                LUNA_EXPLORE
                            </h1>
                            <div className="h-px w-32 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto mt-6 mb-8" />
                            
                            {/* 赛博朋克风搜索框 (Glassmorphism) */}
                            <div className="relative group w-full max-w-2xl">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-[2rem] blur-md opacity-50 group-hover:opacity-100 transition-all duration-500" />
                                <div className="relative flex items-center bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 shadow-2xl">
                                    <div className="pl-6 pr-4">
                                        <Search className="w-5 h-5 text-purple-400 animate-pulse" />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="INPUT_COORDINATES // 搜索核心房源..." 
                                        className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/30 font-mono text-sm md:text-base tracking-widest uppercase py-4"
                                    />
                                    <button className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-purple-600/80 transition-colors border border-white/5 rounded-full px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-white">
                                        EXECUTE <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>

                    {/* 角落科技装饰 */}
                    <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-xl" />
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/10 rounded-br-xl" />
                </header>

                {/* 🚀 快捷筛选栏 (磁贴式 UI) */}
                <div className="flex items-center gap-3 overflow-x-auto pb-8 mb-4 [&::-webkit-scrollbar]:hidden mask-fade-edges">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-mono text-xs font-bold tracking-widest whitespace-nowrap transition-all duration-300 border backdrop-blur-md ${
                                activeCategory === cat.id 
                                ? 'bg-purple-600/80 border-purple-400/50 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-105' 
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'
                            }`}
                        >
                            <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-white' : 'text-purple-400'}`} />
                            {cat.label}
                        </button>
                    ))}
                    <div className="ml-auto sticky right-0 flex items-center gap-2 text-white/30 px-6 py-4 bg-gradient-to-l from-[#030305] via-[#030305] to-transparent">
                        <Filter className="w-4 h-4" />
                        <span className="text-[10px] font-mono uppercase tracking-widest hidden md:inline-block">SORT_LOGIC</span>
                    </div>
                </div>

                {/* 🚀 房源矩阵区 */}
                <main className="relative">
                    {loading ? (
                        <div className="h-[40vh] flex flex-col items-center justify-center space-y-6">
                            <div className="relative">
                                <div className="absolute -inset-4 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                                <Zap className="relative w-12 h-12 text-purple-400 animate-bounce" />
                            </div>
                            <p className="font-mono text-xs tracking-[0.5em] text-purple-400/60 uppercase animate-pulse">SYNCING_NODE_DATA...</p>
                        </div>
                    ) : (
                        <motion.div 
                            layout
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                        >
                            <AnimatePresence mode='popLayout'>
                                {filteredProperties.map((property, idx) => (
                                    <motion.div
                                        key={property.id}
                                        layout
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group relative bg-[#0A0A0E] rounded-[2.5rem] overflow-hidden border border-white/5 transition-all card-cyber-glow"
                                    >
                                        <Link href={`/products/${property.id}`}>
                                            {/* 图片区域 */}
                                            <div className="relative h-64 w-full overflow-hidden">
                                                <Image 
                                                    src={property.images?.[0] || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} 
                                                    alt={property.title}
                                                    fill
                                                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                                />
                                                {/* 沉浸式暗角 */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-transparent to-transparent opacity-90" />
                                                
                                                {/* 类型标签 */}
                                                <div className="absolute top-5 left-5 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10">
                                                    <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">{property.propertyType}</span>
                                                </div>

                                                {/* 价格区域 */}
                                                <div className="absolute bottom-5 left-6 flex items-baseline gap-1.5 drop-shadow-2xl">
                                                    <span className="text-3xl font-black text-white tracking-tighter">₮{property.pricePerDay}</span>
                                                    <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">/ NIGHT</span>
                                                </div>
                                            </div>

                                            {/* 内容区域 */}
                                            <div className="p-6 space-y-5">
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-bold text-white leading-tight line-clamp-1 group-hover:text-purple-400 transition-colors">{property.title}</h3>
                                                    <div className="flex items-center gap-1.5 text-white/40 text-xs font-mono">
                                                        <MapPin className="w-3.5 h-3.5 text-purple-500/70" />
                                                        <span className="line-clamp-1 uppercase tracking-wider">{property.location?.city}, {property.location?.country}</span>
                                                    </div>
                                                </div>

                                                {/* 科技感分割线 */}
                                                <div className="h-[1px] w-full bg-gradient-to-r from-white/5 via-white/10 to-transparent" />

                                                {/* 规格参数 */}
                                                <div className="flex items-center gap-4 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-white bg-white/10 px-2 py-0.5 rounded-md">{property.maxGuests}</span> 
                                                        GUESTS
                                                    </div>
                                                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                                                        <span className="text-white bg-white/10 px-2 py-0.5 rounded-md">{property.bedrooms}</span> 
                                                        BEDS
                                                    </div>
                                                    {(property.cleaningFee?.enabled || property.staffService?.enabled) && (
                                                        <div className="flex items-center gap-1 text-green-400 ml-auto border border-green-400/20 bg-green-400/5 px-2 py-1 rounded-md">
                                                            <Sparkles className="w-3 h-3" />
                                                            <span>PREMIUM</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {!loading && filteredProperties.length === 0 && (
                        <div className="h-[40vh] flex flex-col items-center justify-center text-white/20 space-y-4 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
                            <LayoutGrid className="w-12 h-12 opacity-50" />
                            <p className="font-mono text-sm tracking-widest uppercase">No Active Nodes Found</p>
                        </div>
                    )}
                </main>
            </div>
            
            {/* 边缘淡出效果 (用于筛选栏横向滚动) */}
            <style jsx global>{`
                .mask-fade-edges {
                    mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
                }
            `}</style>
        </div>
    );
}