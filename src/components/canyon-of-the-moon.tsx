'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductCard } from './product-card';
import { Skeleton } from './ui/skeleton';
import type { Product } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

export function CanyonOfTheMoon() {
  const { t } = useTranslation();
  const firestore = useFirestore();

  const productsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'products'),
      where('status', '==', 'active'),
      // OrderBy is removed to prevent needing a composite index.
      // We will fetch more and sort on the client.
      limit(20)
    );
  }, [firestore]);

  const { data, loading: isLoading } = useCollection<Product>(productsQuery);

  const products = useMemo(() => {
    if (!data) return [];
    // Sort on the client-side and take the first 8
    return data
      .sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0))
      .slice(0, 8);
  }, [data]);


  return (
    <section className="container mx-auto px-4 py-12 md:py-16">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-headline text-3xl font-semibold">{t('homePage.canyonOfTheMoon')}</h2>
        <Button asChild className="rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate text-primary-foreground font-bold">
            <Link href="/products">
                进入峡谷 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
      </div>
      
      {isLoading ? (
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
      ) : products && products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
            No products found.
        </div>
      )}
    </section>
  );
}
