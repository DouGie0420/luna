'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Gem, Heart, Star } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './ui/user-avatar';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  
  useEffect(() => {
    const checkState = () => {
      const likedItems = JSON.parse(localStorage.getItem('likedProducts') || '[]');
      const favoritedItems = JSON.parse(localStorage.getItem('favoritedProducts') || '[]');
      setIsLiked(likedItems.includes(product.id));
      setIsFavorited(favoritedItems.includes(product.id));
    };

    checkState();
    window.addEventListener('focus', checkState);
    return () => {
      window.removeEventListener('focus', checkState);
    };
  }, [product.id]);

  const handleInteraction = (e: React.MouseEvent, type: 'like' | 'favorite') => {
      e.preventDefault();
      e.stopPropagation();

      const key = type === 'like' ? 'likedProducts' : 'favoritedProducts';
      const currentItems: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const isCurrentlySet = currentItems.includes(product.id);

      let newItems: string[];
      if (isCurrentlySet) {
          newItems = currentItems.filter((id) => id !== product.id);
      } else {
          newItems = [...currentItems, product.id];
          if (type === 'favorite') {
              toast({ title: t('productCardActions.addedToFavorites') });
          }
      }
      localStorage.setItem(key, JSON.stringify(newItems));

      if (type === 'like') {
          setIsLiked(!isCurrentlySet);
      } else {
          setIsFavorited(!isCurrentlySet);
      }
  };

  return (
    <Link href={`/products/${product.id}`} className="group h-full">
      <Card className={cn("overflow-hidden h-full flex flex-col transition-all duration-200 hover:shadow-primary/20 hover:shadow-lg hover:border-primary/50", className)}>
        <CardHeader className="p-0">
          <div className="aspect-[4/3] relative overflow-hidden">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              data-ai-hint={product.imageHints[0]}
            />
             <div className="absolute top-2 right-2 flex flex-col gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors", isLiked ? "text-yellow-400" : "hover:text-yellow-300")}
                    onClick={(e) => handleInteraction(e, 'like')}
                >
                    <Heart className={cn("h-4 w-4", isLiked && "fill-yellow-400")} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors", isFavorited ? "text-yellow-400" : "hover:text-yellow-300")}
                    onClick={(e) => handleInteraction(e, 'favorite')}
                >
                    <Star className={cn("h-4 w-4", isFavorited && "fill-yellow-400")} />
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="font-headline text-lg mb-2 leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </CardTitle>
           <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <UserAvatar profile={{ displayName: product.seller.name, photoURL: product.seller.avatarUrl, displayedBadge: product.seller.displayedBadge }} className="h-5 w-5" />
                <span>{product.seller.name}</span>
            </div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {product.isConsignment && (
                <Badge variant="outline" className="gap-1.5 border-lime-400/50 bg-lime-400/10 text-lime-300 animate-glow-green px-3 py-1 text-xs">
                    <Gem className="h-3.5 w-3.5" />
                    {t('product.consignmentBadge')}
                </Badge>
            )}
            <Badge variant="secondary" className="text-xs">{product.category}</Badge>
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
          <div className="text-right text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5">
                <Heart className="h-3 w-3" />
                <span>{(product.likes || 0) + (isLiked ? 1 : 0)}</span>
            </div>
             <div className="flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                <span>{(product.favorites || 0) + (isFavorited ? 1 : 0)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
