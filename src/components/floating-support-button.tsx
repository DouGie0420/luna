'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Headset } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function FloatingSupportButton() {
    const { t } = useTranslation();

    return (
        <div className="fixed bottom-8 right-8 z-50">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            asChild
                            size="icon"
                            className="h-16 w-16 rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-110"
                        >
                            <Link href="/support">
                                <Headset className="h-8 w-8" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>{t('support.title')}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
