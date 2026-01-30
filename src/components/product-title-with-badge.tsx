'use client';

import { useTranslation } from '@/hooks/use-translation';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { Gem } from 'lucide-react';

export function ProductTitleWithBadge({ product }: { product: Product }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-headline text-3xl font-bold">{product.name}</h1>
            {product.isConsignment && (
                <Badge variant="outline" className="gap-1.5 border-lime-400/50 bg-lime-400/10 text-lime-300 animate-glow-green px-3 py-1 text-base">
                    <Gem className="h-4 w-4" />
                    {t('product.consignmentBadge')}
                </Badge>
            )}
        </div>
    );
}
