'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from './product-card';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/lib/types';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';


export function NearbyRecommendations() {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const recsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'products'), 
      where('status', '==', 'active'),
      // OrderBy is removed to prevent needing a composite index.
      // We will fetch more and sort on the client.
      limit(30)
    );
  }, [firestore]);

  const { data, loading: isLoading } = useCollection<Product>(recsQuery);

  const recommendations = useMemo(() => {
    if (!data) return [];
    // Sort on the client-side by likes and take the first 10
    return data
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 10);
  }, [data]);

  return (
    <section>
      <h2 className="font-headline text-3xl font-semibold mb-6">{t('homePage.recommendedForYou')}</h2>
      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <div className="aspect-[4/3] w-full"><Skeleton className="w-full h-full" /></div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                </div>
            ))}
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <Carousel
            opts={{
              align: "start",
              loop: recommendations.length > 4,
            }}
            plugins={[
              Autoplay({
                delay: 5000,
                stopOnInteraction: true,
              }),
            ]}
            className="w-full"
          >
            <CarouselContent>
              {recommendations.map((product) => (
                <CarouselItem key={product.id} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <div className="p-1 h-full">
                    <ProductCard product={product} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden lg:flex" />
            <CarouselNext className="hidden lg:flex" />
          </Carousel>
        ) : (
          <div className="text-center py-10 text-muted-foreground">No recommendations available.</div>
        )}
        </div>
    </section>
  );
}
