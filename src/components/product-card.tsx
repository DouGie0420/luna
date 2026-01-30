import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  return (
    <Link href={`/products/${product.id}`} className="group">
      <Card className={cn("overflow-hidden h-full flex flex-col transition-all duration-200", className)}>
        <CardHeader className="p-0">
          <div className="aspect-[4/3] relative overflow-hidden">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover"
              data-ai-hint={product.imageHints[0]}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="font-headline text-lg mb-2 leading-tight">
            {product.name}
          </CardTitle>
          <Badge variant="secondary" className="mb-2">{product.category}</Badge>
        </CardContent>
        <CardFooter className="p-4 flex justify-between items-center">
          <div>
             <p className="text-lg font-semibold text-primary">
              {product.price.toLocaleString()}
              <span className="text-xs text-muted-foreground ml-1">{product.currency}</span>
            </p>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{product.location.city}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
