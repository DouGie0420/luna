'use client';

import { useState, useEffect } from 'react';
import { recommendProducts } from '@/ai/flows/location-based-recommendations';
import { getProducts } from '@/lib/data';
import { ProductCard } from './product-card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from './ui/carousel';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/lib/types';

export function NearbyRecommendations() {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async (latitude: number, longitude: number) => {
      try {
        setIsLoading(true);
        const purchaseHistory = 'Vintage Film Camera, Designer Sunglasses'; // Mock purchase history
        const result = await recommendProducts({
          latitude,
          longitude,
          purchaseHistory,
          maxRecommendations: 8,
        });
        
        const allProducts = await getProducts();
        const recommendedProducts = allProducts.filter(p => 
          result.recommendations.some(rec => p.name.toLowerCase().includes(rec.toLowerCase()))
        );
        setRecommendations(recommendedProducts.slice(0, 8));
      } catch (err) {
        setError('Could not fetch recommendations.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    // Default to Bangkok if location is not available
    const defaultLocation = { latitude: 13.7563, longitude: 100.5018 };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchRecommendations(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // User denied location, use default
          setError('Location access denied. Showing popular items.');
          fetchRecommendations(defaultLocation.latitude, defaultLocation.longitude);
        }
      );
    } else {
      // Browser doesn't support geolocation, use default
      setError('Geolocation not supported. Showing popular items.');
      fetchRecommendations(defaultLocation.latitude, defaultLocation.longitude);
    }
  }, []);

  if (isLoading) {
    return (
      <section className="container mx-auto px-4">
        <h2 className="font-headline text-3xl font-semibold mb-6">Near You</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-[225px] w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4">
      <h2 className="font-headline text-3xl font-semibold mb-6">
        {error ? 'Popular Items' : 'Recommended For You'}
      </h2>
      <Carousel
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {recommendations.map((product) => (
            <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/4">
              <div className="p-1">
                <ProductCard product={product} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}
