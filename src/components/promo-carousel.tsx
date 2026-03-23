'use client';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Button } from './ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface PromoItem {
  title: string;
  desc: string;
  img: string;
  link: string;
}

const FALLBACK_PROMOS: PromoItem[] = [
  {
    title: '未来已来',
    desc: '探索最新潮的赛博装备',
    img: 'https://picsum.photos/seed/promo1/1920/822',
    link: '/promo/cyber-monday?id=future-is-here',
  },
  {
    title: '城市霓虹',
    desc: '穿梭于光影之间的时尚单品',
    img: 'https://picsum.photos/seed/promo2/1920/822',
    link: '/promo/cyber-monday?id=city-neon',
  },
];

export function PromoCarousel() {
  const firestore = useFirestore();
  const [promos, setPromos] = useState<PromoItem[]>(FALLBACK_PROMOS);

  useEffect(() => {
    if (!firestore) return;
    getDoc(doc(firestore, 'configs', 'home_carousel')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const items: PromoItem[] = (data.items || []).filter((i: PromoItem) => i.img?.trim());
        if (items.length > 0) setPromos(items);
      }
    }).catch(() => {});
  }, [firestore]);

  return (
    <Carousel
      className="w-full"
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
      opts={{ loop: true }}
    >
      <CarouselContent>
        {promos.map((promo, index) => (
          <CarouselItem key={index}>
            <div className="aspect-[16/7] relative">
              <Image
                src={promo.img}
                alt={promo.title}
                fill
                className="object-cover"
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center items-start p-8 md:p-16 lg:p-24 text-white">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold drop-shadow-lg">
                  {promo.title}
                </h2>
                {promo.desc && (
                  <div className="text-lg md:text-xl mt-2 text-white/80 drop-shadow-sm max-w-lg">
                    {promo.desc}
                  </div>
                )}
                {promo.link && (
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
