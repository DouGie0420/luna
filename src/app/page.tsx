'use client';

import { PromoCarousel } from '@/components/promo-carousel';
import { SearchBar } from '@/components/layout/search-bar';
import { Button } from '@/components/ui/button';
import { TrendingProducts } from '@/components/nearby-recommendations';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { VerifiedMerchants } from '@/components/verified-merchants';
import { CanyonOfTheMoon } from '@/components/canyon-of-the-moon';
import { SeaOfTranquility } from '@/components/sea-of-tranquility';
import { getTrendingKeywords } from '@/ai';
import { SanctumPool } from '@/components/home/SanctumPool';

// 🚀 默认关键词，防止 AI 响应慢导致首页留白
const FALLBACK_KEYWORDS = ['Cyberpunk', 'Futuristic', 'Neon', 'Glitch', 'Gadgets'];

export default function HomePage() {
  const [popularSearches, setPopularSearches] = useState<string[]>(FALLBACK_KEYWORDS);
  const [isAiLoading, setIsAiLoading] = useState(true);

  useEffect(() => {
    // 🚀 优化获取逻辑：如果 3 秒内 AI 没回，就用默认词，绝不让用户等
    const fetchKeywords = async () => {
      try {
        const result = await getTrendingKeywords(5);
        if (result && result.keywords) {
          setPopularSearches(result.keywords);
        }
      } catch (error) {
        console.error("AI Keywords Error, using fallbacks:", error);
      } finally {
        setIsAiLoading(false);
      }
    };

    fetchKeywords();
  }, []);

  return (
    <div className="flex flex-col">
      {/* 🚀 官方公告轮播 */}
      <PromoCarousel />

      {/* 🚀 搜索区域 */}
      <section className="container mx-auto px-4 py-8 md:py-10 text-center">
        <div className="max-w-4xl mx-auto">
          <SearchBar placeholderKeywords={popularSearches} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {popularSearches.map((term) => (
            <Button
              key={term}
              variant="ghost"
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground text-xs"
              asChild
            >
              <Link href={`/search?q=${encodeURIComponent(term)}`}>
                {term}
              </Link>
            </Button>
          ))}
        </div>
      </section>
      
      {/* 🚀 Moon Market 资产区 */}
      <div className="mb-4">
        <CanyonOfTheMoon />
      </div>

      {/* 🚀 融合版商户模块 */}
      <section className="mt-2">
        <VerifiedMerchants />
      </section>

      {/* 🚀 Sanctum 房源池板块 */}
      <section className="py-2 flex flex-col items-center">
        <Link href="/products/rental/all" className="group relative mb-[-6.5rem] z-30 origin-bottom">
           <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-full blur-lg opacity-40 group-hover:opacity-80 transition duration-700 animate-pulse"></div>
           <div className="relative flex items-center gap-5 px-10 py-4 bg-[#0B0B0B] border-2 border-purple-500/50 rounded-full leading-none transition-all duration-300 group-hover:bg-purple-500/15 group-hover:border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3),0_10px_40px_rgba(0,0,0,0.7)] group-hover:shadow-[0_0_50px_rgba(168,85,247,0.6),0_10px_40px_rgba(0,0,0,0.8)]">
             <span className="text-purple-400 animate-bounce font-black text-lg">↓</span>
             <span className="text-[15px] font-black uppercase tracking-[0.45em] text-purple-300 group-hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">Into The</span>
             <span className="text-purple-400 animate-bounce font-black text-lg">↓</span>
           </div>
        </Link>
        
        {/* 房源池组件 */}
        <SanctumPool />
      </section>

      {/* 🚀 Luna Orbit */}
      <section className="mt-[-1rem]">
        <SeaOfTranquility />
      </section>

      {/* 🚀 底部趋势/推荐产品 */}
      <div className="container mx-auto px-4 pb-16 mt-6">
        <TrendingProducts />
      </div>
    </div>
  );
}