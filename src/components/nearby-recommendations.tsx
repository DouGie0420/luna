'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/data';
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


export function NearbyRecommendations() {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const allProducts = await getProducts();
        
        // Read recommended product IDs from localStorage
        const recommendedIds: string[] = JSON.parse(localStorage.getItem('recommended_products') || '[]');

        if (recommendedIds.length > 0) {
            const recommendedProducts = allProducts.filter(p => recommendedIds.includes(p.id));
            // Sort the fetched products to match the order in localStorage (newest recommendations first)
            recommendedProducts.sort((a, b) => recommendedIds.indexOf(a.id) - recommendedIds.indexOf(b.id));
            setRecommendations(recommendedProducts);
        } else {
            // Fallback: If no products are manually recommended, show a default set of popular items.
            setRecommendations(allProducts.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to fetch recommendations.", err);
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <section>
      <h2 className="font-headline text-3xl font-semibold mb-6">{t('homePage.recommendedForYou')}</h2>
      <div className="p-6">
        {isLoading || recommendations.length === 0 ? (
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
        ) : (
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
        )}
        </div>
    </section>
  );
}
