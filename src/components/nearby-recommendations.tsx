'use client';

import { useState, useEffect } from 'react';
import { recommendProducts } from '@/ai/flows/location-based-recommendations';
import { getProducts } from '@/lib/data';
import { ProductCard } from './product-card';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/lib/types';

export function NearbyRecommendations() {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async (latitude: number, longitude: number) => {
      setIsLoading(true);
      try {
        const purchaseHistory = 'Vintage Film Camera, Designer Sunglasses'; // Mock purchase history
        const result = await recommendProducts({
          latitude,
          longitude,
          purchaseHistory,
          maxRecommendations: 10,
        });
        
        const allProducts = await getProducts();
        const recommendedProducts = allProducts.filter(p => 
          result.recommendations.some(rec => p.name.toLowerCase().includes(rec.toLowerCase()))
        ).slice(0, 10);
        
        if (recommendedProducts.length > 0) {
            setRecommendations(recommendedProducts);
        } else {
            // Fallback to showing some popular items if AI recommendations are empty
            setRecommendations(allProducts.slice(0, 10));
        }
      } catch (err) {
        console.error("Failed to fetch AI recommendations, falling back to popular items.", err);
        const allProducts = await getProducts();
        setRecommendations(allProducts.slice(0, 10));
      } finally {
        setIsLoading(false);
      }
    };

    const defaultLocation = { latitude: 13.7563, longitude: 100.5018 };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchRecommendations(position.coords.latitude, position.coords.longitude);
        },
        () => {
          console.log("Geolocation permission denied. Using default location for recommendations.");
          fetchRecommendations(defaultLocation.latitude, defaultLocation.longitude);
        }
      );
    } else {
      console.log("Geolocation not supported. Using default location for recommendations.");
      fetchRecommendations(defaultLocation.latitude, defaultLocation.longitude);
    }
  }, []);

  return (
    <section>
      <h2 className="font-headline text-3xl font-semibold mb-6">为你精选</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {(isLoading || recommendations.length === 0) ? (
            [...Array(10)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[225px] w-full rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                </div>
            ))
          ) : (
            recommendations.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
    </section>
  );
}
