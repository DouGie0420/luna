
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Gem, Heart, Star, Sparkles } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './ui/user-avatar';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, profile } = useUser();
  const firestore = useFirestore();

  // Local state for optimistic UI updates
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  const [isRecommended, setIsRecommended] = useState(false);
  const hasAdminAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');

  useEffect(() => {
    setIsLiked(!!user && !!product.likedBy?.includes(user.uid));
    setLikesCount(product.likes || 0);
    setIsFavorited(!!user && !!product.favoritedBy?.includes(user.uid));
    setFavoritesCount(product.favorites || 0);
    
    const recommendedItems = JSON.parse(localStorage.getItem('recommended_products') || '[]');
    setIsRecommended(recommendedItems.includes(product.id));
  }, [product, user]);


  const handleGuestClick = (e: React.MouseEvent) => {
      if (!user) {
          e.preventDefault();
          toast({
              title: '需要认证',
              description: '请先登录或注册以查看商品详情。',
              variant: 'destructive'
          });
      }
  }

  const handleInteraction = (e: React.MouseEvent, type: 'like' | 'favorite') => {
      e.preventDefault();
      e.stopPropagation();

      if (!user || !profile || !firestore) {
        toast({ variant: 'destructive', title: t('common.loginToInteract') });
        return;
      }
      
      const productRef = doc(firestore, 'products', product.id);
      let updateData: any;

      if (type === 'like') {
          const newLikedState = !isLiked;
          const originalLikesCount = likesCount;
          
          // Optimistic update
          setLikesCount(prev => prev + (newLikedState ? 1 : -1));
          setIsLiked(newLikedState);

          updateData = {
              likedBy: newLikedState ? arrayUnion(user.uid) : arrayRemove(user.uid),
              likes: increment(newLikedState ? 1 : -1)
          };
          
          updateDoc(productRef, updateData)
            .then(() => {
                if (newLikedState) {
                    createNotification(firestore, product.seller.id, { type: 'like-product', actor: profile, product: product });
                }
            })
            .catch(serverError => {
                // Revert UI on error
                setIsLiked(!newLikedState);
                setLikesCount(originalLikesCount);
                console.error(`Failed to update like:`, serverError);
                toast({ variant: 'destructive', title: `Failed to update like` });
            });

      } else { // favorite
          const newFavoritedState = !isFavorited;
          const originalFavoritesCount = favoritesCount;

          // Optimistic update
          setFavoritesCount(prev => prev + (newFavoritedState ? 1 : -1));
          setIsFavorited(newFavoritedState);
          
          updateData = {
              favoritedBy: newFavoritedState ? arrayUnion(user.uid) : arrayRemove(user.uid),
              favorites: increment(newFavoritedState ? 1 : -1)
          };

          updateDoc(productRef, updateData)
            .then(() => {
                if (newFavoritedState) {
                    toast({ title: t('productCardActions.addedToFavorites') });
                }
            })
            .catch(serverError => {
                // Revert UI on error
                setIsFavorited(!newFavoritedState);
                setFavoritesCount(originalFavoritesCount);
                console.error(`Failed to update favorite:`, serverError);
                toast({ variant: 'destructive', title: `Failed to update favorite` });
            });
      }
  };

  const handleRecommend = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const recommendedProducts: string[] = JSON.parse(localStorage.getItem('recommended_products') || '[]');
    const isCurrentlyRecommended = recommendedProducts.includes(product.id);

    let newRecommended: string[];
    if (isCurrentlyRecommended) {
      newRecommended = recommendedProducts.filter(id => id !== product.id);
      toast({ title: 'Removed from Recommendations' });
    } else {
      newRecommended = [product.id, ...recommendedProducts];
      toast({ title: 'Added to Recommendations' });
    }
    localStorage.setItem('recommended_products', JSON.stringify(newRecommended));
    setIsRecommended(!isCurrentlyRecommended);
  };
  
  const locationDisplay = [product.location?.city, product.location?.countryCode].filter(Boolean).join(', ');


  return (
    <Link href={`/products/${product.id}`} className="group h-full" onClick={handleGuestClick}>
      <Card className={cn("overflow-hidden h-full flex flex-col transition-all duration-200 border-2 border-foreground/60 hover:border-primary hover:shadow-primary/20 hover:shadow-lg", className)}>
        <CardHeader className="p-0">
          <div className="aspect-[4/3] relative overflow-hidden">
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              data-ai-hint={product.imageHints[0]}
            />
            {hasAdminAccess && (
                <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={handleRecommend}
                    title="Add to Recommendations"
                >
                    <Sparkles className={cn("h-4 w-4", isRecommended && "text-yellow-400 fill-yellow-400")} />
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="font-headline text-lg mb-2 leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </CardTitle>
           <div className="flex items-end gap-2 text-xs text-muted-foreground mb-2">
                <UserAvatar profile={{ displayName: product.seller.name, photoURL: product.seller.avatarUrl, displayedBadge: product.seller.displayedBadge }} className="h-5 w-5" />
                <span className="font-headline">{product.seller.name}</span>
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
            {locationDisplay && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{locationDisplay}</span>
                </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
                variant="ghost"
                size="sm"
                className={cn("flex items-center gap-1.5 h-auto p-1 text-xs transition-colors", isLiked ? "text-yellow-400" : "text-muted-foreground hover:text-primary")}
                onClick={(e) => handleInteraction(e, 'like')}
            >
                <Heart className={cn("h-4 w-4", isLiked && "fill-yellow-400")} />
                <span>{likesCount}</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn("flex items-center gap-1.5 h-auto p-1 text-xs transition-colors", isFavorited ? "text-yellow-400" : "text-muted-foreground hover:text-primary")}
                onClick={(e) => handleInteraction(e, 'favorite')}
            >
                <Star className={cn("h-4 w-4", isFavorited && "fill-yellow-400")} />
                <span>{favoritesCount}</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
