'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, ShieldAlert, X } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';

export default function NewProductPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
      if (!loading && !user) {
          router.replace('/login?redirect=/products/new');
      }
  }, [user, loading, router]);
  
  if (loading || !user) {
      return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
        </div>
      );
  }

  if (profile && profile.kycStatus !== 'Verified') {
      return (
           <>
              <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto flex h-12 items-center justify-between px-4">
                  <BackButton />
                  <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
                    <Link href="/">
                        <X className="mr-2 h-4 w-4" />
                        {t('common.close')}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="container mx-auto px-4 py-12">
                  <div className="max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline">{t('newProductPage.cannotListTitle')}</CardTitle>
                            <CardDescription>
                                {t('newProductPage.cannotListDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>{t('newProductPage.kycRequiredTitle')}</AlertTitle>
                                <AlertDescription className="flex flex-col gap-4">
                                    <p>{t('newProductPage.kycRequiredDescription')}</p>
                                    <Button asChild className="mt-4 w-fit">
                                        <Link href="/account/kyc">{t('newProductPage.goToVerify')}</Link>
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                  </div>
              </div>
           </>
      );
  }


  return (
    <>
      <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <BackButton />
          <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
            <Link href="/">
                <X className="mr-2 h-4 w-4" />
                {t('common.close')}
            </Link>
          </Button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">{t('newProductPage.title')}</CardTitle>
              <CardDescription>
                {t('newProductPage.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('newProductPage.itemName')}</Label>
                  <Input id="name" placeholder={t('newProductPage.itemNamePlaceholder')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('newProductPage.descriptionLabel')}</Label>
                  <Textarea id="description" placeholder={t('newProductPage.descriptionPlaceholder')} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="price">{t('newProductPage.price')}</Label>
                        <Input id="price" type="number" placeholder={t('newProductPage.pricePlaceholder')} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="currency">{t('newProductPage.currency')}</Label>
                        <Select defaultValue="THB">
                            <SelectTrigger>
                                <SelectValue placeholder={t('newProductPage.selectCurrency')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="THB">{t('newProductPage.thb')}</SelectItem>
                                <SelectItem value="USDT">{t('newProductPage.usdt')}</SelectItem>
                                <SelectItem value="RMB-alipay">{t('newProductPage.alipay')}</SelectItem>
                                <SelectItem value="RMB-wechat">{t('newProductPage.wechat')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="category">{t('newProductPage.category')}</Label>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder={t('newProductPage.selectCategory')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="electronics">{t('newProductPage.electronics')}</SelectItem>
                            <SelectItem value="accessories">{t('newProductPage.accessories')}</SelectItem>
                            <SelectItem value="home-goods">{t('newProductPage.homeGoods')}</SelectItem>
                            <SelectItem value="sports-outdoors">{t('newProductPage.sportsOutdoors')}</SelectItem>
                            <SelectItem value="fashion">{t('newProductPage.fashion')}</SelectItem>
                            <SelectItem value="musical-instruments">{t('newProductPage.musicalInstruments')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>{t('newProductPage.images')}</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">{t('newProductPage.dragAndDrop')}</p>
                        <Button variant="outline" className="mt-4">{t('newProductPage.selectFiles')}</Button>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" size="lg">{t('newProductPage.listItem')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
