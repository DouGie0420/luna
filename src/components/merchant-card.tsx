'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface MerchantCardProps {
  user: UserProfile;
  className?: string;
}

export function MerchantCard({ user, className }: MerchantCardProps) {
  const { t } = useTranslation();

  return (
    <Link href={`/user/${user.uid}`} className="group block">
      <Card className={cn("overflow-hidden h-full transition-all duration-200 border-primary/20 hover:border-primary", className)}>
        <div className="relative h-24 w-full">
            <Image 
                src="https://picsum.photos/seed/merchant-bg/1080/432"
                alt={`${user.displayName}'s shop background`}
                fill
                className="object-cover"
                data-ai-hint="neon abstract"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
        <CardContent className="relative p-4 pt-0 -mt-10">
            <div className="flex items-end gap-4">
                <Avatar className="h-20 w-20 border-4 border-card group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
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
        </CardContent>
      </Card>
    </Link>
  );
}
