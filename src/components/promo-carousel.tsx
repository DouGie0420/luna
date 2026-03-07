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

const FALLBACK_PROMOS: PromoItem[] = [
  {
    title: '未来已来',
    description: '探索最新潮的数字体验',
    imageUrl: 'https://picsum.photos/seed/promo1/1920/822',
    link: '/promo/cyber-monday?id=future-is-here',
    enabled: true,
  },
  {
    title: '城市霓虹',
    description: '穿梭在光影之间的精选内容',
    imageUrl: 'https://picsum.photos/seed/promo2/1920/822',
    link: '/promo/cyber-monday?id=city-neon',
    enabled: true,
  },
  {
    title: '数字浪潮',
    description: '体验前所未有的虚拟现实',
    imageUrl: 'https://picsum.photos/seed/promo3/1920/822',
    link: '/promo/cyber-monday?id=digital-wave',
    enabled: true,
  },
];

const normalizePromo = (item: any): PromoItem => ({
  title: item?.title || '推广内容',
  description: item?.desc || item?.description || '',
  imageUrl: item?.img || item?.imageUrl || '',
  link: item?.link || '/promo/cyber-monday',
  enabled: item?.enabled !== false,
});

const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

export function PromoCarousel() {
  const firestore = useFirestore();
  const [promos, setPromos] = useState<PromoItem[]>(FALLBACK_PROMOS);

  useEffect(() => {
    if (!firestore) return;

    const ref = doc(firestore, 'configs', 'home_carousel');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPromos(FALLBACK_PROMOS);
          return;
        }

        const data = snapshot.data();
        const rawItems = Array.isArray(data.items) ? data.items : [];
        const maxCount = Math.max(1, Math.min(20, Number(data.count) || rawItems.length || 3));

        const active = rawItems
          .map(normalizePromo)
          .filter((item) => item.imageUrl.trim() !== '')
          .filter((item) => item.enabled !== false)
          .slice(0, maxCount);

        setPromos(active.length > 0 ? active : FALLBACK_PROMOS);
      },
      (error) => {
        console.error('Failed to subscribe home carousel:', error);
        setPromos(FALLBACK_PROMOS);
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
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-headline font-bold drop-shadow-lg">
                  {promo.title}
                </h2>
                <div className="text-lg md:text-xl mt-2 text-white/80 drop-shadow-sm max-w-lg">
                  {promo.description}
                </div>
                {isExternalUrl(promo.link) ? (
                  <Button asChild className="mt-6" size="lg">
                    <a href={promo.link} target="_blank" rel="noreferrer">
                      了解更多
                    </a>
                  </Button>
                ) : (
                  <Button asChild className="mt-6" size="lg">
                    <Link href={promo.link}>了解更多</Link>
                  </Button>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4 hidden md:flex" />
      <CarouselNext className="right-4 hidden md:flex" />
    </Carousel>
  );
}
