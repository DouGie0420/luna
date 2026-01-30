'use client';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
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

const promos = [
  {
    title: '未来已来',
    description: '探索最新潮的赛博装备',
    imageUrl:
      'https://picsum.photos/seed/promo1/1920/822',
    imageHint: 'futuristic technology',
    link: '/promo/cyber-monday?id=future-is-here',
  },
  {
    title: '城市霓虹',
    description: '穿梭于光影之间的时尚单品',
    imageUrl:
      'https://picsum.photos/seed/promo2/1920/822',
    imageHint: 'neon city',
    link: '/promo/cyber-monday?id=city-neon',
  },
  {
    title: '数字浪潮',
    description: '体验前所未有的虚拟现实',
    imageUrl:
      'https://picsum.photos/seed/promo3/1920/822',
    imageHint: 'cyberpunk character',
    link: '/promo/cyber-monday?id=digital-wave',
  },
];

export function PromoCarousel() {
  return (
    <Carousel
      className="w-full"
      plugins={[
        Autoplay({
          delay: 5000,
          stopOnInteraction: true,
        }),
      ]}
      opts={{
        loop: true,
      }}
    >
      <CarouselContent>
        {promos.map((promo, index) => (
          <CarouselItem key={index}>
            <div className="aspect-[16/7] relative">
              <Image
                src={promo.imageUrl}
                alt={promo.title}
                fill
                className="object-cover"
                data-ai-hint={promo.imageHint}
                priority={index === 0}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center items-start p-8 md:p-16 lg:p-24 text-white">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-headline font-bold drop-shadow-lg">
                  {promo.title}
                </h2>
                <p className="text-lg md:text-xl mt-2 text-white/80 drop-shadow-sm max-w-lg">
                  {promo.description}
                </p>
                <Button asChild className="mt-6" size="lg">
                  <Link href={promo.link}>了解更多</Link>
                </Button>
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
