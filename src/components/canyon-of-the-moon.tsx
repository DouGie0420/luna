'use client';

import React, { useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { ProductCard } from './product-card';
import { Skeleton } from './ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * 🌙 LUNA_TRUST_PROTOCOL: Moon Market Section
 * 修复点：
 * 1. 函数名保持连贯，防止 Build Error [cite: 2026-02-24]
 * 2. 标题写死为 Moon Market [cite: 2026-02-24]
 * 3. 按钮写死为 Explore [cite: 2026-02-24]
 */
export function CanyonOfTheMoon() {
  const { t } = useTranslation();
  const firestore = useFirestore();

  // 🛡️ 严格执行 50 条底线原则，首页展示前 8 条 [cite: 2026-02-07]
  const productsQuery = useMemo(() => 
    firestore ? query(
      collection(firestore, 'products'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(8)
    ) : null, 
  [firestore]);

  const { data: products, loading } = useCollection<Product>(productsQuery);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex justify-between items-end mb-8">
            <Skeleton className="h-10 w-64 bg-white/5 rounded-lg" />
            <Skeleton className="h-6 w-24 bg-white/5 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-[32px] bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  // 🚀 数据安全过滤
  const validProducts = products?.filter(p => p.name && p.price !== undefined) || [];

  return (
    <section className="container mx-auto px-4 py-12 md:py-20 relative overflow-hidden">
      {/* 🚀 板块头部渲染 */}
      <div className="flex items-end justify-between mb-10 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-mono text-[10px] uppercase tracking-[0.4em] mb-1">
            <Sparkles className="w-3 h-3" /> New Life Style
          </div>
          <h2 className="font-headline text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
            Moon Market
          </h2>
        </div>

        {/* 🚀 精准替换 UI：完全匹配 DISCOVER 按钮的硬核边框、高度和底色 */}
        <Button 
          asChild 
          className="rounded-full bg-white/5 border border-primary/20 text-primary hover:bg-primary/10 font-black uppercase tracking-[0.2em] text-xs px-8 h-12 transition-all group"
        >
          <Link href="/products" className="flex items-center gap-2">
            Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>

      {/* 🚀 资产网格展示 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 relative z-10">
        {validProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* 🚀 如果没有商品，显示空状态 */}
      {validProducts.length === 0 && (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
            <p className="font-mono text-[10px] text-white/20 uppercase tracking-[0.5em]">No_Active_Protocols_Found</p>
        </div>
      )}
    </section>
  );
}