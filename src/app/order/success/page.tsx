'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export default function OrderSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        if (!orderId) {
            // If no orderId is present, maybe redirect to home or purchases list after a delay
            const timer = setTimeout(() => {
                router.replace(`/account/purchases`);
            }, 2500);
            return () => clearTimeout(timer);
        }

        const timer = setTimeout(() => {
            // Redirect to the newly created order's detail page
            router.replace(`/account/purchases/${orderId}`);
        }, 2500);

        return () => clearTimeout(timer);
    }, [router, orderId]);

    if (!orderId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] gap-4 text-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <h1 className="text-2xl font-headline font-bold">{t('orderSuccess.title')}</h1>
                <p className="text-muted-foreground max-w-xs">{"Processing your order..."}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] gap-4 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <h1 className="text-2xl font-headline font-bold">{t('orderSuccess.title')}</h1>
            <p className="text-muted-foreground max-w-xs">{t('orderSuccess.description')}</p>
        </div>
    );
}
