'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'; 
import { 
    Search, MapPin, Zap, Snowflake, Waves, 
    Building, Home, Tent, Castle, Filter,
    LayoutGrid, ChevronRight, Sparkles,
    ArrowUpDown, TrainFront // 🚀 新增图标
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// ==========================================
// 🚀 全局发光呼吸动画 (保持风格统一)
// ==========================================
const inlineStyles = `
  @keyframes purpleGlow {
    0% { box-shadow: 0 0 5px rgba(168,85,247,0.2); }
    50% { box-shadow: 0 0 20px rgba(168,85,247,0.6); }
    100% { box-shadow: 0 0 5px rgba(168,85,247,0.2); }
  }
  .card-glow:hover { animation: purpleGlow 2s ease-in-out infinite; }
  
  @keyframes textPulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; text-shadow: 0 0 8px rgba(168,85,247,0.8); }
    100% { opacity: 0.6; }
  }
  .breathe-text { animation: textPulse 3s ease-in-out infinite; }
`;

const CATEGORIES = [
    { id: 'all', label: '全部房源', icon: LayoutGrid },
    { id: 'elevator', label: '电梯房', icon: ArrowUpDown }, // 🚀 新增快捷筛选
    { id: 'subway', label: '近地铁', icon: TrainFront },    // 🚀 新增快捷筛选
    { id: '高空公寓 (Apartment)', label: '高空公寓', icon: Building },
    { id: '独栋别墅 (Villa)', label: '独栋别墅', icon: Home },
    { id: '赛博舱 (Cabin)', label: '赛博舱', icon: Tent },
    { id: '豪华庄园 (Mansion)', label: '豪华庄园', icon: Castle },
];

export default function RealEstateMarket() {
    const db = useFirestore();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');

    // --- 🚀 核心逻辑：支持分类筛选与设施 (Amenities) 筛选 ---
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
        <div className="min-h-screen bg-[#0B0B0B] text-white pt-24 pb-20 px-6 lg:px-12">
            <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />
            
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-900/10 blur-[120px] rounded-full" />
            </div>

            <header className="max-w-7xl mx-auto mb-12 space-y-8">
                {/* 🚀 修改：将内容改为 text-center 并调整 flex 布局以居中标题 */}
                <div className="flex flex-col items-center justify-center text-center gap-6">
                    <div className="space-y-2">
                        <h2 className="text-sm font-mono tracking-[0.3em] text-purple-400 uppercase breathe-text">Real Estate Protocol</h2>
                        <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter">LUNA MARKET</h1>
                    </div>
                    
                    <div className="relative group max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-purple-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="搜索赛博空间、坐标或房源标题..." 
                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-bold"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all border-2 ${
                                activeCategory === cat.id 
                                ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                                : 'bg-white/5 border-white/5 text-white/50 hover:border-white/20'
                            }`}
                        >
                            <cat.icon className="w-5 h-5" />
                            {cat.label}
                        </button>
                    ))}
                    <div className="ml-auto flex items-center gap-2 text-white/40 px-4">
                        <Filter className="w-4 h-4" />
                        <span className="text-xs font-mono uppercase">Sort by Logic</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="h-[40vh] flex flex-col items-center justify-center space-y-4">
                        <Zap className="w-12 h-12 text-purple-500 animate-pulse" />
                        <p className="font-mono text-sm tracking-widest text-purple-400 breathe-text">SYNCING METADATA...</p>
                    </div>
                ) : (
                    <motion.div 
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                    >
                        <AnimatePresence mode='popLayout'>
                            {filteredProperties.map((property) => (
                                <motion.div
                                    key={property.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative bg-[#121214] rounded-[2rem] overflow-hidden border-2 border-white/5 transition-all hover:border-purple-500/50 card-glow"
                                >
                                    {/* 🚀 重要修改：修正跳转路径，去掉 rental/，直接指向 [id] 文件夹 */}
                                    <Link href={`/products/${property.id}`}>
                                        <div className="relative h-64 w-full overflow-hidden">
                                            <Image 
                                                src={property.images?.[0] || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop'} 
                                                alt={property.title}
                                                fill
                                                className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent opacity-80" />
                                            
                                            <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                                <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">{property.propertyType}</span>
                                            </div>

                                            <div className="absolute bottom-4 left-6 flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">₮{property.pricePerDay}</span>
                                                <span className="text-xs font-bold text-white/50 uppercase">/ night</span>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="space-y-1">
                                                <h3 className="text-xl font-black text-white leading-tight line-clamp-1 group-hover:text-purple-300 transition-colors">{property.title}</h3>
                                                <div className="flex items-center gap-1 text-white/40 text-sm">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="line-clamp-1 font-medium">{property.location?.city}, {property.location?.country}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 py-3 border-t border-white/5 text-[11px] font-mono font-bold uppercase text-white/60">
                                                <div className="flex items-center gap-1.5"><span className="text-purple-400">{property.maxGuests}</span> Guests</div>
                                                <div className="flex items-center gap-1.5 border-l border-white/10 pl-4"><span className="text-purple-400">{property.bedrooms}</span> Bed</div>
                                                {(property.cleaningFee?.enabled || property.staffService?.enabled) && (
                                                    <div className="flex items-center gap-1 text-green-400 ml-auto">
                                                        <Sparkles className="w-3 h-3" />
                                                        <span>Premium</span>
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
                    <div className="h-[40vh] flex flex-col items-center justify-center text-white/20 space-y-4 border-2 border-dashed border-white/5 rounded-[3rem]">
                        <LayoutGrid className="w-12 h-12" />
                        <p className="font-bold text-lg">暂无匹配的活跃房源</p>
                    </div>
                )}
            </main>
        </div>
    );
}