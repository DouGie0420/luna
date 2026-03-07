'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Flame, Sparkles, Search as SearchIcon, Loader2, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 100;

// 🌌 暴力增强版：高对比度“深渊棱镜”样式
const intenseArtStyles = `
  .fluid-bg-container { position: fixed; inset: 0; background: #05000a; overflow: hidden; z-index: 0; }
  
  .cyber-grid {
      position: absolute; inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, black 30%, transparent 100%);
  }

  .fluid-entity { position: absolute; border-radius: 50%; filter: blur(100px); will-change: transform; mix-blend-mode: screen; pointer-events: none; }

  @keyframes drift-1 {
      0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
      33% { transform: translate(15vw, -10vh) scale(1.3); opacity: 1; }
      66% { transform: translate(-10vw, 15vh) scale(0.9); opacity: 0.8; }
      100% { transform: translate(0, 0) scale(1); opacity: 0.8; }
  }
  @keyframes drift-2 {
      0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
      33% { transform: translate(-15vw, 15vh) scale(1.2); opacity: 1; }
      66% { transform: translate(10vw, -15vh) scale(0.8); opacity: 0.7; }
      100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
  }
  @keyframes drift-3 {
      0% { transform: translate(0, 0) scale(1); opacity: 0.9; }
      50% { transform: translate(10vw, 20vh) scale(1.5); opacity: 1; }
      100% { transform: translate(0, 0) scale(1); opacity: 0.9; }
  }

  .astral-pink { width: 70vw; height: 70vw; top: -15%; left: -15%; background: #ff00ff; animation: drift-1 20s infinite alternate ease-in-out; }
  .astral-cyan { width: 80vw; height: 80vw; bottom: -20%; right: -15%; background: #00ffff; animation: drift-2 25s infinite alternate ease-in-out; }
  .astral-purple { width: 60vw; height: 60vw; top: 40%; left: 30%; background: #7000ff; animation: drift-3 30s infinite alternate ease-in-out; }
  
  .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }

  /* 💎 深渊棱镜 (Abyssal Prism) 核心按钮样式 */
  .prism-btn {
      position: relative;
      background: rgba(0, 0, 0, 0.85); /* 极深色基座，隔离背景 */
      backdrop-filter: blur(15px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.4s cubic-bezier(0.2, 1, 0.3, 1);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  }

  .prism-btn:hover {
      border-color: rgba(255, 0, 255, 0.4);
      background: rgba(10, 10, 10, 1);
      color: white;
  }

  .prism-btn-active {
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid #ff00ff;
      color: white !important;
      box-shadow: 0 0 20px rgba(255, 0, 255, 0.4), inset 0 0 10px rgba(255, 0, 255, 0.2);
      transform: translateY(-2px);
      text-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
  }

  /* 装饰用的内阴影，增强立体感 */
  .prism-btn-active::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(180deg, rgba(255,0,255,0.1) 0%, transparent 100%);
      pointer-events: none;
  }
`;

function ProductsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12 pt-[180px] relative z-10">
            <div className="relative text-center mb-16 py-16">
                <Skeleton className="h-16 w-1/2 mx-auto bg-white/5 rounded-full" />
                <Skeleton className="h-4 w-1/3 mx-auto mt-8 bg-white/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-4">
                        <Skeleton className="aspect-[4/3] w-full rounded-[2rem] bg-white/[0.03]" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-4/5 bg-white/5" />
                            <Skeleton className="h-4 w-3/5 bg-white/[0.02]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function AllProductsPage() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    const [activeFilter, setActiveFilter] = useState<'newest' | 'popular' | 'nearest'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    
    const fetchProducts = async (loadMore = false) => {
        if (!firestore) return;
        if (loadMore) setLoadingMore(true);
        else setLoading(true);

        const constraints = [where('status', '==', 'active'), limit(PAGE_SIZE)];
        if (loadMore && lastVisible) {
            constraints.push(startAfter(lastVisible));
        }

        const q = query(collection(firestore, 'products'), ...constraints);

        try {
            const documentSnapshots = await getDocs(q);
            const newProducts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Product);
            
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length-1]);
            setProducts(prev => loadMore ? [...prev, ...newProducts] : newProducts);
            setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error("Error fetching products:", error);
            toast({ variant: 'destructive', title: 'Failed to fetch products.' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };
    
    useEffect(() => {
        fetchProducts();
    }, [firestore]);

    const filteredAndSortedProducts = useMemo(() => {
        let processedProducts = products ? [...products] : [];

        if (debouncedSearchTerm) {
            processedProducts = processedProducts.filter(product => {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                return (
                    product.name?.toLowerCase().includes(lowercasedTerm) ||
                    product.description?.toLowerCase().includes(lowercasedTerm) ||
                    product.category?.toLowerCase().includes(lowercasedTerm)
                );
            });
        }

        switch (activeFilter) {
            case 'popular':
                processedProducts.sort((a, b) => ((b.likes || 0) + (b.favorites || 0) + (b.views || 0)) - ((a.likes || 0) + (a.favorites || 0) + (a.views || 0)));
                break;
            case 'nearest':
                processedProducts.sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0));
                break;
            case 'newest':
            default:
                processedProducts.sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0));
                break;
        }

        return processedProducts;

    }, [debouncedSearchTerm, activeFilter, products]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#05000a] text-white selection:bg-[#ff00ff]/30 relative">
                <style dangerouslySetInnerHTML={{ __html: intenseArtStyles }} />
                <div className="fluid-bg-container">
                    <div className="cyber-grid" />
                    <div className="fluid-entity astral-pink" />
                    <div className="fluid-entity astral-cyan" />
                    <div className="fluid-entity astral-purple" />
                    <div className="absolute inset-0 bg-black/40" />
                </div>
                <PageHeaderWithBackAndClose />
                <ProductsPageSkeleton />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-[#ff00ff]/30 relative pb-32">
            <style dangerouslySetInnerHTML={{ __html: intenseArtStyles }} />
            
            <div className="fluid-bg-container pointer-events-none">
                <div className="cyber-grid" />
                <div className="fluid-entity astral-pink" />
                <div className="fluid-entity astral-cyan" />
                <div className="fluid-entity astral-purple" />
                <div className="absolute inset-0 bg-black/30 mix-blend-overlay" />
            </div>

            <PageHeaderWithBackAndClose />

            <div className="container mx-auto px-4 md:px-8 pt-[180px] relative z-10">
                
                <div className="relative flex flex-col items-center justify-center text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-[0_0_20px_rgba(255,0,255,0.15)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ff00ff] animate-pulse" />
                        <span className="text-[9px] font-mono text-white/70 tracking-[0.3em] uppercase">Global Database</span>
                    </div>
                    
                    <h1 className="titanium-title text-6xl md:text-[5.5rem] font-light tracking-tighter text-white mb-6 leading-none">
                        DISCOVER <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff00ff] to-[#00ffff] italic">RARITIES.</span>
                    </h1>
                    
                    <div className="flex items-center gap-4 max-w-md mx-auto">
                        <div className="h-[1px] bg-white/30 w-8" />
                        <p className="text-xs sm:text-sm font-serif italic text-white/70 tracking-wide">
                            Accessing the rarest curated artifacts in existence.
                        </p>
                        <div className="h-[1px] bg-white/30 w-8" />
                    </div>
                </div>

                <div className="max-w-3xl mx-auto mb-20 relative z-30 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#ff00ff]/40 via-[#00ffff]/40 to-[#7000ff]/40 rounded-[2.5rem] blur-xl opacity-40 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div className="relative flex items-center bg-[#05000a]/80 backdrop-blur-3xl border border-white/20 group-hover:border-[#ff00ff]/50 rounded-[2.5rem] p-2 shadow-[0_30px_60px_rgba(0,0,0,0.8)] transition-all duration-300">
                        <div className="pl-6 pr-4">
                            <SearchIcon className="h-6 w-6 text-[#ff00ff] group-hover:animate-pulse" />
                        </div>
                        <Input 
                            placeholder="SEARCH ARCHIVE // TITLES, CATEGORIES..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-14 w-full bg-transparent border-none outline-none text-white placeholder:text-white/40 font-mono text-sm tracking-widest uppercase pl-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <div className="hidden sm:flex px-6 py-3 mr-2 rounded-2xl bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-inner">
                            ENTER
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center w-full mb-12 relative z-30 border-b border-white/10 pb-8">
                    
                    {/* 🚀 应用了“深渊棱镜”设计的分类过滤按钮组 */}
                    <div className="flex items-center gap-4">
                        {['newest', 'popular', 'nearest'].map((type) => (
                            <button 
                                key={type}
                                onClick={() => setActiveFilter(type as any)}
                                className={cn(
                                    "prism-btn px-7 py-2.5 rounded-full font-sans text-xs font-bold flex items-center gap-2", 
                                    activeFilter === type ? "prism-btn-active" : ""
                                )}
                            >
                                {type === 'newest' && <Sparkles className="w-4 h-4" />}
                                {type === 'popular' && <Flame className="w-4 h-4" />}
                                {type === 'nearest' && <MapPin className="w-4 h-4" />}
                                {type === 'newest' ? '最新商品' : type === 'popular' ? '最热商品' : '离我最近'}
                            </button>
                        ))}
                    </div>

                    <div className="mt-6 md:mt-0">
                        <Link href="/products/new">
                            <button className="px-10 py-3 rounded-full bg-white text-black font-sans text-sm font-black flex items-center gap-2 hover:scale-[1.05] transition-all shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                                <Plus className="h-5 w-5" /> 发布新帖
                            </button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 relative z-20">
                    {filteredAndSortedProducts.map((product) => (
                        <div key={product.id} className="relative group">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
                
                {filteredAndSortedProducts.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-center mt-8 border border-white/10 rounded-[3rem] bg-black/40 backdrop-blur-md shadow-inner">
                        <SearchIcon className="h-12 w-12 text-[#ff00ff] mb-6 drop-shadow-[0_0_10px_rgba(255,0,255,0.5)]" />
                        <p className="text-white/50 font-mono text-xs tracking-[0.4em] uppercase">No items found</p>
                    </div>
                )}
                
                {hasMore && filteredAndSortedProducts.length > 0 && (
                    <div className="mt-24 text-center">
                        <Button 
                            onClick={() => fetchProducts(true)} 
                            disabled={loadingMore}
                            variant="ghost"
                            className="group relative overflow-hidden rounded-full border border-[#ff00ff]/30 bg-[#05000a]/80 backdrop-blur-md px-10 h-14 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-[#ff00ff]/10 hover:border-[#ff00ff] hover:shadow-[0_0_30px_rgba(255,0,255,0.4)] text-white"
                        >
                            {loadingMore ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin text-[#ff00ff]" /> Loading...</>
                            ) : (
                                "Reveal More Nodes"
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}