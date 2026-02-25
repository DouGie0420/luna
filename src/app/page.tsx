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
import { getTrendingKeywords } from '@/ai/flows/trending-keywords';
import { SanctumPool } from '@/components/home/SanctumPool';


export default function HomePage() {
  const [popularSearches, setPopularSearches] = useState<string[]>([]);

  useEffect(() => {
    getTrendingKeywords(5)
      .then(result => {
        if (result && result.keywords) {
          setPopularSearches(result.keywords);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="flex flex-col">
      {/* 🚀 官方公告轮播 */}
      <PromoCarousel />

      {/* 🚀 搜索区域 */}
      <section className="container mx-auto px-4 py-8 md:py-10 text-center">
        <div className="max-w-4xl mx-auto">
          <SearchBar placeholderKeywords={popularSearches.length > 0 ? popularSearches : ['Cyberpunk', 'Futuristic', 'Neon', 'Glitch', 'Gadgets']} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(popularSearches.length > 0 ? popularSearches : ['Cyberpunk', 'Futuristic', 'Neon', 'Glitch', 'Gadgets']).map((term) => (
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
        {/* 🚀 双下箭头按钮 */}
        <Link href="/products/rental/all" className="group relative mb-[-6.5rem] z-30 origin-bottom">
           <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur opacity-20 group-hover:opacity-60 transition duration-1000"></div>
           <div className="relative flex items-center gap-4 px-8 py-3 bg-[#0B0B0B] border border-purple-500/30 rounded-full leading-none transition-all duration-300 group-hover:bg-purple-500/10 group-hover:border-purple-500/80 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
             <span className="text-purple-500 animate-bounce font-black text-sm">↓</span>
             <span className="text-[12px] font-black uppercase tracking-[0.4em] text-purple-400 group-hover:text-purple-300 transition-colors">Into The</span>
             <span className="text-purple-500 animate-bounce font-black text-sm">↓</span>
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