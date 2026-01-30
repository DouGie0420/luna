'use client';

import { useTranslation } from '@/hooks/use-translation';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';

export function ProductTitleWithBadge({ product }: { product: Product }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-headline text-3xl font-bold">{product.name}</h1>
            {product.isConsignment && (
                <Badge variant="destructive" className="animate-glow-green border-lime-400/50 text-base py-1">
                    {t('product.consignmentBadge')}
                </Badge>
            )}
        </div>
    );
}
