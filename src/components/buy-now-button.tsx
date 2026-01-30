'use client';

import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export function BuyNowButton({ product }: { product: Product }) {
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
                title: '需要认证',
                description: '您需要完成KYC认证后才能购买商品。',
            });
            // Optionally redirect to KYC page
            setTimeout(() => router.push('/account/kyc'), 2000);
        } else {
            // Proceed to checkout
            console.log('Proceed to checkout for product:', product.id);
            toast({
                title: '正在处理...',
                description: '正在将您转到结帐页面。',
            });
        }
    };

    if (loading) {
        return (
             <Button size="lg" className="flex-1 h-14 text-lg" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载中...
            </Button>
        )
    }

    return (
        <Button size="lg" className="flex-1 h-14 text-lg" onClick={handleClick}>
            Buy Now
        </Button>
    );
}
