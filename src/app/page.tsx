import { PromoCarousel } from '@/components/promo-carousel';
import { NearbyRecommendations } from '@/components/nearby-recommendations';
import { SearchBar } from '@/components/layout/search-bar';
import Link from 'next/link';

export default async function HomePage() {
  const hotSearches = ["热水袋", "羽绒服", "电动车", "男童羽绒服", "巧克力", "手机壳", "女衣", "牛仔裤"];

  return (
    <div className="flex flex-col">
      <section className="w-full">
        <PromoCarousel />
      </section>
      
      <div className="container mx-auto px-4">
        <section className="py-12">
           <div className="w-full max-w-5xl mx-auto">
              <SearchBar />
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 justify-center">
                {hotSearches.map(item => (
                   <Link href={`/search?q=${item}`} key={item} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {item}
                  </Link>
                ))}
              </div>
           </div>
        </section>

        <div className="pb-12">
          {/* This is the AI powered recommendation section, which is now the main product grid */}
          <NearbyRecommendations />
        </div>
      </div>
    </div>
  );
}
