'use client';

import { PromoCarousel } from '@/components/promo-carousel';
import { SearchBar } from '@/components/layout/search-bar';
import { Button } from '@/components/ui/button';
import { TrendingProducts } from '@/components/nearby-recommendations';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { VerifiedMerchants } from '@/components/verified-merchants';
import { CanyonOfTheMoon } from '@/components/canyon-of-the-moon';
import { SeaOfTranquility } from '@/components/sea-of-tranquility';
import { getTrendingKeywords } from '@/ai/flows/trending-keywords';

export default function HomePage() {
  const [popularSearches, setPopularSearches] = useState<string[]>([]);

  useEffect(() => {
    getTrendingKeywords(5)
      .then(result => {
        if (result && result.keywords) {
          setPopularSearches(result.keywords);
        }
      })
      .catch(console.error);
  }, []);


  return (
    <>
      <PromoCarousel />
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <SearchBar placeholderKeywords={popularSearches.length > 0 ? popularSearches : ['Cyberpunk', 'Futuristic', 'Neon', 'Glitch', 'Gadgets']} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {(popularSearches.length > 0 ? popularSearches : ['Cyberpunk', 'Futuristic', 'Neon', 'Glitch', 'Gadgets']).map((term) => (
            <Button
              key={term}
              variant="ghost"
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              asChild
            >
              <Link href={`/search?q=${encodeURIComponent(term)}`}>
                {term}
              </Link>
            </Button>
          ))}
        </div>
      </section>
      
      <VerifiedMerchants />

      <CanyonOfTheMoon />

      <SeaOfTranquility />

      <div className="container mx-auto px-4 pb-16">
        <TrendingProducts />
      </div>
    </>
  );
}
