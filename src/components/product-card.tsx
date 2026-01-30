'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Gem } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation();

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
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {product.isConsignment && (
                <Badge variant="outline" className="gap-1.5 border-lime-400/50 bg-lime-400/10 text-lime-300 animate-glow-green px-3 py-1 text-sm">
                    <Gem className="h-3.5 w-3.5" />
                    {t('product.consignmentBadge')}
                </Badge>
            )}
            <Badge variant="secondary">{product.category}</Badge>
          </div>
        </CardContent>
        <CardFooter className="p-4 flex justify-between items-center">
          <div>
             <p className="text-lg font-semibold text-primary">
              {product.price.toLocaleString()}
              <span className="text-xs text-muted-foreground ml-1">{product.currency}</span>
            </p>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span>{product.location.city}, {product.location.countryCode}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
