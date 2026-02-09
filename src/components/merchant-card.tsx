
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';
import { GlowingPixelGrid } from './glowing-pixel-grid';
import { UserAvatar } from './ui/user-avatar';

interface MerchantCardProps {
  user: UserProfile;
  className?: string;
}

const FeaturedProductPreview = ({ productId }: { productId: string }) => {
    const firestore = useFirestore();
    const productRef = useMemo(() => firestore ? doc(firestore, 'products', productId) : null, [firestore, productId]);
    const { data: product, loading } = useDoc<Product>(productRef);

    if (loading) {
        return (
            <div className="mt-4 pt-4 border-t border-border/50">
                <Skeleton className="aspect-square w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
            </div>
        );
    }
    
    if (!product) {
        return null;
    }

    return (
        <div className="mt-4 pt-4 border-t border-border/50">
            <div className="aspect-square relative w-full overflow-hidden rounded-md">
                 <Image 
                    src={product.images?.[0] || 'https://picsum.photos/seed/default-product/400/400'}
                    alt={product.name}
                    fill
                    className="object-cover"
                    data-ai-hint={product.imageHints?.[0] || 'product image'}
                />
            </div>
            <p className="text-xs font-semibold mt-2 truncate">{product.name}</p>
        </div>
    );
};


export function MerchantCard({ user, className }: MerchantCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/@${user.loginId || user.uid}`} className="group block h-full">
      <Card className={cn("overflow-hidden h-full flex flex-col transition-all duration-200 border border-foreground/10 hover:border-primary", className)}>
        <div className="relative h-24 w-full">
            {user.bannerUrl ? (
                <Image 
                    src={user.bannerUrl}
                    alt={`${user.displayName}'s shop background`}
                    fill
                    className="object-cover"
                    data-ai-hint="custom banner"
                />
            ) : (
                <GlowingPixelGrid seed={user.uid} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        <CardContent className="relative p-4 pt-0 -mt-10 flex-grow flex flex-col">
            <div className="flex items-end gap-4">
                <UserAvatar profile={user} className="h-20 w-20" />
                <div className="flex-1 pb-2">
                    <Badge variant="default" className="mb-1 bg-primary/80 border-primary/50">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        PRO
                    </Badge>
                     <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>{(user.rating || 0).toFixed(1)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        <span>{t('sellerProfile.onSaleCount').replace('{count}', (user.onSaleCount ?? 0).toString())}</span>
                    </div>
                </div>
            </div>
            <h3 className="font-headline text-lg mt-2 truncate">{user.displayName}</h3>
            {user.featuredProductId ? (
              <FeaturedProductPreview productId={user.featuredProductId} />
            ) : (
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="aspect-square relative w-full overflow-hidden rounded-md">
                  <Image
                    src="https://picsum.photos/seed/luna-default/400/400"
                    alt="Explore the LUNA ecosystem"
                    fill
                    className="object-cover"
                    data-ai-hint="moon landscape"
                  />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <p className="text-white font-headline text-center text-xs">Explore LUNA</p>
                    </div>
                </div>
                <p className="text-xs font-semibold mt-2 truncate text-muted-foreground italic">No featured item</p>
              </div>
            )}
        </CardContent>
      </Card>
    </Link>
  );
}
