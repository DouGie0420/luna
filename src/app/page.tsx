import { PromoCarousel } from '@/components/promo-carousel';
import { SearchBar } from '@/components/layout/search-bar';
import { Button } from '@/components/ui/button';
import { NearbyRecommendations } from '@/components/nearby-recommendations';

export default function HomePage() {
  const popularSearches = ['Vintage Camera', 'Cyberpunk Jacket', 'Smart Glasses', 'Neon Lamp', 'Mechanical Keyboard'];

  return (
    <>
      <PromoCarousel />
      <section className="container mx-auto px-4 py-12 md:py-16 text-center">
        <div className="max-w-3xl mx-auto">
            <SearchBar />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
            {popularSearches.map((term) => (
                <Button key={term} variant="ghost" className="text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    {term}
                </Button>
            ))}
        </div>
      </section>
      <div className="container mx-auto px-4 pb-16">
        <NearbyRecommendations />
      </div>
    </>
  );
}
