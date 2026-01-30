'use client';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { X } from 'lucide-react';
import Link from 'next/link';

export function PageHeaderWithBackAndClose() {
    const { t } = useTranslation();

    return (
        <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
            <div className="flex h-12 items-center justify-between px-6 md:px-8 lg:px-12">
                <BackButton />
                <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
                    <Link href="/">
                        <X className="mr-2 h-4 w-4" />
                        {t('common.close')}
                    </Link>
                </Button>
            </div>
        </div>
    );
}
