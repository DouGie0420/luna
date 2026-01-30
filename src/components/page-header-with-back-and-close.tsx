'use client';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { X } from 'lucide-react';
import Link from 'next/link';
import { SnakeBorder } from './snake-border';

export function PageHeaderWithBackAndClose() {
    const { t } = useTranslation();

    return (
        <div className="sticky top-20 z-30 bg-background/80 backdrop-blur-sm relative">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <BackButton />
                <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
                    <Link href="/">
                        <X className="mr-2 h-4 w-4" />
                        {t('common.close')}
                    </Link>
                </Button>
            </div>
            <SnakeBorder />
        </div>
    );
}
