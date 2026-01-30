'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/data';
import { ProductCard } from './product-card';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/lib/types';

export function NearbyRecommendations() {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        // Fallback to showing some popular items
        const allProducts = await getProducts();
        setRecommendations(allProducts.slice(0, 8));
      } catch (err) {
        console.error("Failed to fetch popular items.", err);
        // Handle error case, maybe set recommendations to an empty array
        setRecommendations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <section>
      <h2 className="font-headline text-3xl font-semibold mb-6">为你精选</h2>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(isLoading || recommendations.length === 0) ? (
              [...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <div className="aspect-[4/3] w-full"><Skeleton className="w-full h-full" /></div>
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
        </div>
    </section>
  );
}
