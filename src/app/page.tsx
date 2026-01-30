'use client';

import { PromoCarousel } from '@/components/promo-carousel';
import { SearchBar } from '@/components/layout/search-bar';
import { Button } from '@/components/ui/button';
import { NearbyRecommendations } from '@/components/nearby-recommendations';
import Link from 'next/link';
import { useState } from 'react';
import { VerifiedMerchants } from '@/components/verified-merchants';

export default function HomePage() {
  const [popularSearches, setPopularSearches] = useState([
    'Cyberpunk',
    'Futuristic',
    'Neon',
    'Glitch',
    'Gadgets',
  ]);

  return (
    <>
      <PromoCarousel />
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <SearchBar placeholderKeywords={popularSearches} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {popularSearches.map((term) => (
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

      <div className="container mx-auto px-4 pb-16">
        <NearbyRecommendations />
      </div>
    </>
  );
}
