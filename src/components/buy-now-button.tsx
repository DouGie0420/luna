'use client';

import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export function BuyNowButton({ product }: { product: Product }) {
    const { t } = useTranslation();
    const { user, profile, loading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const handleClick = () => {
        if (!user) {
            router.push(`/login?redirect=/products/${product.id}`);
            return;
        }

        if (profile?.kycStatus !== 'Verified') {
            toast({
                variant: 'destructive',
                title: t('buyNowButton.kycRequiredTitle'),
                description: t('buyNowButton.kycRequiredDescription'),
            });
            // Optionally redirect to KYC page
            setTimeout(() => router.push('/account/kyc'), 2000);
        } else {
            // Proceed to checkout
            router.push(`/products/${product.id}/checkout`);
        }
    };

    if (loading) {
        return (
             <Button size="lg" className="flex-1 h-14 text-lg" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('buyNowButton.loading')}
            </Button>
        )
    }

    return (
        <Button size="lg" className="flex-1 h-14 text-lg" onClick={handleClick}>
            {t('buyNowButton.buyNow')}
        </Button>
    );
}
