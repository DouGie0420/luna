'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

type PromoItem = {
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  enabled?: boolean;
};

// 规范化后台传来的数据结构
const normalizePromo = (item: any): PromoItem => ({
  title: item?.title || '',
  description: item?.desc || item?.description || '',
  imageUrl: item?.img || item?.imageUrl || '',
  link: item?.link || '/',
  enabled: item?.enabled !== false,
});

const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

export function PromoCarousel() {
  const firestore = useFirestore();
  // 初始状态设为空数组，彻底抛弃占位图
  const [promos, setPromos] = useState<PromoItem[]>([]);
  // 增加一个 loading 状态，防止刚加载时闪烁
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const ref = doc(firestore, 'configs', 'home_carousel');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPromos([]);
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const maxCount = Math.max(1, Math.min(20, Number(data.count) || rawItems.length || 3));

        const active = rawItems
          .map(normalizePromo)
          .filter((item) => item.imageUrl.trim() !== '') // 必须有图片
          .filter((item) => item.enabled !== false)      // 必须是启用状态
          .slice(0, maxCount);

        setPromos(active);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe home carousel:', error);
        setPromos([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  const plugin = useMemo(
    () =>
      Autoplay({
        delay: 5000,
        stopOnInteraction: true,
      }),
    []
  );

  // 🚀 核心逻辑：如果在加载中，或者后台没有任何有效广告，直接隐藏整个组件！
  if (loading || promos.length === 0) {
    return null;
  }

  return (
    <Carousel className="w-full" plugins={[plugin]} opts={{ loop: true }}>
      <CarouselContent>
        {promos.map((promo, index) => (
          <CarouselItem key={`${promo.imageUrl}-${index}`}>
            <div className="aspect-[16/7] relative">
              <img
                src={promo.imageUrl}
                alt={promo.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center items-start p-8 md:p-16 lg:p-24 text-white">
                {promo.title && (
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-headline font-bold drop-shadow-lg">
                    {promo.title}
                    </h2>
                )}
                {promo.description && (
                    <div className="text-lg md:text-xl mt-2 text-white/80 drop-shadow-sm max-w-lg">
                    {promo.description}
                    </div>
                )}
                
                {promo.link && promo.link !== '/' && (
                    isExternalUrl(promo.link) ? (
                    <Button asChild className="mt-6" size="lg">
                        <a href={promo.link} target="_blank" rel="noreferrer">
                        了解更多
                        </a>
                    </Button>
                    ) : (
                    <Button asChild className="mt-6" size="lg">
                        <Link href={promo.link}>了解更多</Link>
                    </Button>
                    )
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* 如果只有一张广告，就隐藏左右切换箭头 */}
      {promos.length > 1 && (
          <>
            <CarouselPrevious className="left-4 hidden md:flex" />
            <CarouselNext className="right-4 hidden md:flex" />
          </>
      )}
    </Carousel>
  );
}