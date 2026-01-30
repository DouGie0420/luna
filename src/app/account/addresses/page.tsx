'use client';

import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { PlusCircle } from "lucide-react";
import Link from 'next/link';

export default function AddressesPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-headline">{t('accountAddresses.title')}</h1>
            <Button asChild>
                <Link href="/account/addresses/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('accountAddresses.addNewAddress')}
                </Link>
            </Button>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>{t('accountAddresses.savedAddresses')}</CardTitle>
                <CardDescription>{t('accountAddresses.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-semibold">{t('accountAddresses.noAddresses')}</h3>
                    <p className="text-muted-foreground mt-2">{t('accountAddresses.noAddressesDescription')}</p>
                     <Button asChild variant="outline" className="mt-4">
                        <Link href="/account/addresses/new">
                            {t('accountAddresses.addFirstAddress')}
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
