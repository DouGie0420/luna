import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/data';
import { PromoCarousel } from '@/components/promo-carousel';
import { NearbyRecommendations } from '@/components/nearby-recommendations';
import { Separator } from '@/components/ui/separator';

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="flex flex-col">
      <section className="w-full">
        <PromoCarousel />
      </section>

      <div className="container mx-auto px-4 py-8 space-y-12">
        <NearbyRecommendations />

        <Separator />

        <section>
          <h2 className="font-headline text-3xl font-semibold mb-6">为你精选</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
