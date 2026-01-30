'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';

export function BackButton() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
      <ArrowLeft className="mr-2 h-4 w-4" />
      {t('common.back')}
    </Button>
  );
}
