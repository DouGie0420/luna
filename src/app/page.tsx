import { PromoCarousel } from '@/components/promo-carousel';
import { NearbyRecommendations } from '@/components/nearby-recommendations';
import { SearchBar } from '@/components/layout/search-bar';
import Link from 'next/link';

export default async function HomePage() {
  const hotSearches = ["热水袋", "羽绒服", "电动车", "男童羽绒服", "巧克力", "手机壳", "女衣", "牛仔裤"];

  return (
    <div className="flex flex-col">
      {/* The PromoCarousel section has been removed for debugging the white line issue. */}
      
      <div className="container mx-auto px-4">
        {/* The SearchBar section has been removed for debugging the white line issue. */}

        <div className="pb-12">
          {/* This is the AI powered recommendation section, which is now the main product grid */}
          <NearbyRecommendations />
        </div>
      </div>
    </div>
  );
}
