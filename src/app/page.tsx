import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListFilter } from 'lucide-react';
import { NearbyRecommendations } from '@/components/nearby-recommendations';

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-12">
      <section className="bg-secondary py-20 text-center rounded-lg">
        <div className="container mx-auto">
          <h1 className="font-headline text-4xl md:text-6xl font-bold mb-4">
            Discover & Exchange with Confidence
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Your trusted marketplace for secure, multi-currency transactions.
          </p>
          <Button size="lg">Start Exploring</Button>
        </div>
      </section>

      <NearbyRecommendations />

      <section className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline text-3xl font-semibold">
            Freshly Listed
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ListFilter className="mr-2 h-4 w-4" />
                Filter & Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value="newest">
                <DropdownMenuRadioItem value="newest">
                  Newest
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price_asc">
                  Price: Low to High
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price_desc">
                  Price: High to Low
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
