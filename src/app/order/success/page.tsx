'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useRouter } from 'next/navigation';

function OrderSuccessContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    if (!orderId) {
      // If there's no order ID, redirect to home after a delay
      const timer = setTimeout(() => {
        router.push('/');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [orderId, router]);

  if (!orderId) {
    return (
        <Card className="w-full max-w-lg mx-auto">
            <CardHeader className="text-center">
                 <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                 <CardTitle className="mt-4 text-2xl font-bold">{t('orderSuccess.title')}</CardTitle>
                 <CardDescription>An issue occurred, but your order may have been placed. Redirecting to home...</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
      <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center">
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <CardTitle className="mt-4 text-2xl font-bold">{t('orderSuccess.title')}</CardTitle>
              <CardDescription>{t('orderSuccess.description')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
               <p className="text-sm text-muted-foreground">Order ID: {orderId}</p>
              <Button asChild size="lg" className="w-full">
                  <Link href={`/account/purchases/${orderId}`}>
                      View Order Details
                  </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                  <Link href="/products">Continue Shopping</Link>
              </Button>
          </CardContent>
      </Card>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className="container mx-auto flex min-h-[70vh] items-center justify-center p-4">
        <Suspense fallback={<div>Loading...</div>}>
            <OrderSuccessContent />
        </Suspense>
    </div>
  );
}
