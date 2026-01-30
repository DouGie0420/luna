'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export function BackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Button variant="ghost" onClick={() => router.back()} className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
      <ArrowLeft className="mr-2 h-4 w-4" />
      {t('common.back')}
    </Button>
  );
}
