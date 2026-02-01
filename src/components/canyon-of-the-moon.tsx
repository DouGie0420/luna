'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/data';
import { ProductCard } from './product-card';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CanyonOfTheMoon() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const allProducts = await getProducts();
        // Get a different set of 8 products for variety, for a 2x4 grid.
        setProducts(allProducts.slice(4, 12)); 
      } catch (err) {
        console.error("Failed to fetch products for Canyon of the Moon.", err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-headline text-3xl font-semibold">{t('homePage.canyonOfTheMoon')}</h2>
        <Button asChild variant="ghost" className="text-primary hover:text-primary/90">
            <Link href="/products">
                进入峡谷 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </div>
      
      {isLoading || products.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
