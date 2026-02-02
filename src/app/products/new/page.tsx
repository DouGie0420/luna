'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
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
import { Upload, ShieldAlert, X, Sparkles, Loader2 } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { analyzeProductImage } from '@/ai/flows/analyze-product-image';
import type { User } from '@/lib/types';
import { compressImage } from '@/lib/image-compressor';
import { addDoc, collection, doc, increment, serverTimestamp, updateDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export default function NewProductPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'THB' | 'USDT' | 'RMB-alipay' | 'RMB-wechat'>('THB');
  const [category, setCategory] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'Seller Pays' | 'Buyer Pays'>('Buyer Pays');
  const [shippingCarrier, setShippingCarrier] = useState<'SF' | 'YTO' | null>('SF');
  const [isConsignment, setIsConsignment] = useState(false);
  
  const [isAiAnalysisEnabled, setIsAiAnalysisEnabled] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
      if (!loading && !user) {
          router.replace('/login?redirect=/products/new');
      }
  }, [user, loading, router]);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      if ((imagePreviews.length + fileArray.length) > 9) {
          toast({ variant: 'destructive', title: 'Maximum images reached', description: 'You can upload a maximum of 9 images.' });
          e.target.value = '';
          return;
      }
      
      setIsAiLoading(true); // Show loader for both compression and AI analysis

      try {
        const compressionPromises = fileArray.map(file => compressImage(file));
        const compressedPreviews = await Promise.all(compressionPromises);
        
        setImagePreviews(prev => [...prev, ...compressedPreviews]);
        
        // AI analysis on the first new compressed image
        if (isAiAnalysisEnabled && compressedPreviews.length > 0) {
          const imageDataUri = compressedPreviews[0];
          try {
            const result = await analyzeProductImage({ imageDataUri });
            setName(result.title);
            setDescription(result.description);
            toast({
                title: "AI Analysis Complete",
                description: "Title and content have been generated.",
            });
          } catch (error) {
            console.error("AI analysis failed:", error);
            toast({
              variant: "destructive",
              title: "AI Analysis Failed",
              description: "Could not analyze the image. Please fill in the details manually.",
            });
          }
        }
      } catch (error: any) {
        console.error("Error processing files: ", error);
        toast({
          variant: "destructive",
          title: "Image Processing Failed",
          description: error.message || "There was an error compressing or reading the files.",
        });
      } finally {
        setIsAiLoading(false); // Hide loader
      }
    }
    // Reset file input to allow re-uploading the same file
    e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !firestore) {
      toast({ variant: 'destructive', title: 'Please login to list an item.'});
      return;
    }
    setIsSubmitting(true);

    const sellerData: User = {
      id: user.uid,
      name: profile.displayName || user.displayName || 'New Seller',
      avatarUrl: profile.photoURL || user.photoURL || '',
      rating: profile.rating || 0,
      reviews: profile.reviewsCount || 0,
      isPro: profile.isPro || false,
      isWeb3Verified: profile.isWeb3Verified || false,
      isNftVerified: profile.isNftVerified || false,
      kycStatus: profile.kycStatus || 'Not Verified',
      location: { city: profile.location || 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
      onSaleCount: profile.onSaleCount || 0,
      itemsSold: profile.salesCount || 0,
      creditScore: profile.creditScore || 0,
      creditLevel: profile.creditLevel || 'Newcomer',
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      postsCount: profile.postsCount || 0,
      displayedBadge: profile.displayedBadge || 'none',
    };

    const newProductData = {
      name,
      description,
      price: Number(price),
      currency: currency.startsWith('RMB') ? 'RMB' : (currency as 'THB' | 'USDT'),
      images: imagePreviews.length > 0 ? imagePreviews : ['https://picsum.photos/seed/default-product/600/400'],
      imageHints: ['user uploaded'],
      seller: sellerData,
      sellerId: user.uid,
      location: sellerData.location,
      category: category || 'Electronics',
      isConsignment,
      shippingMethod,
      likes: 0,
      favorites: 0,
      views: 0,
      searchHits: 0,
      likedBy: [],
      favoritedBy: [],
      createdAt: serverTimestamp(),
      status: 'active' as const,
    };

    try {
      const productsCollectionRef = collection(firestore, 'products');
      const docRef = await addDoc(productsCollectionRef, newProductData);
      
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { onSaleCount: increment(1) });
      
      toast({
          title: t('newProductPage.submitSuccessTitle'),
          description: t('newProductPage.submitSuccessDescription'),
      });
      router.push(`/products/${docRef.id}`);

    } catch (serverError) {
      console.error("Failed to create product:", serverError);
      const permissionError = new FirestorePermissionError({
          path: collection(firestore, 'products').path,
          operation: 'create',
          requestResourceData: newProductData,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSubmitting(false);
    }
  };


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
              <form className="grid gap-6" onSubmit={handleSubmit}>
                <div className="items-top flex space-x-3 rounded-lg border border-input p-4">
                    <Checkbox id="ai-analysis" checked={isAiAnalysisEnabled} onCheckedChange={(checked) => setIsAiAnalysisEnabled(!!checked)} />
                    <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="ai-analysis" className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {t('newProductPage.aiAnalysis')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t('newProductPage.aiAnalysisDescription')}
                    </p>
                    </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">{t('newProductPage.itemName')}</Label>
                  <div className="relative">
                    <Input id="name" placeholder={t('newProductPage.itemNamePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} disabled={isAiLoading} />
                     {isAiLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t('newProductPage.descriptionLabel')}</Label>
                  <div className="relative">
                    <Textarea id="description" placeholder={t('newProductPage.descriptionPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isAiLoading} />
                    {isAiLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
                  </div>
                </div>

                 <div className="grid gap-2">
                    <Label>{t('newProductPage.images')}</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Input
                            id="image-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleImageUpload}
                            accept="image/*"
                            multiple
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                            <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                            <p className="mt-2 text-sm text-muted-foreground">{t('newProductPage.dragAndDrop')}</p>
                            <Button asChild variant="outline" className="mt-4 pointer-events-none">
                                <span>{t('newProductPage.selectFiles')}</span>
                            </Button>
                        </label>
                        {imagePreviews.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <Image src={src} alt={`preview ${index}`} fill className="rounded-md object-cover" />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={() => removeImage(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="price">{t('newProductPage.price')}</Label>
                        <Input id="price" type="number" placeholder={t('newProductPage.pricePlaceholder')} value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="currency">{t('newProductPage.currency')}</Label>
                        <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
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
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
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
                    <Label>{t('newProductPage.shippingMethod')}</Label>
                    <RadioGroup value={shippingMethod} onValueChange={(v: any) => setShippingMethod(v)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Seller Pays" id="seller-pays" />
                            <Label htmlFor="seller-pays" className="font-normal">{t('newProductPage.sellerPays')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Buyer Pays" id="buyer-pays" />
                            <Label htmlFor="buyer-pays" className="font-normal">{t('newProductPage.buyerPays')}</Label>
                        </div>
                    </RadioGroup>
                </div>

                {shippingMethod === 'Buyer Pays' && (
                    <div className="grid gap-2 pl-6">
                        <Label>{t('newProductPage.shippingTemplate')}</Label>
                        <RadioGroup value={shippingCarrier || ''} onValueChange={(v: any) => setShippingCarrier(v)} className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="SF" id="sf" />
                                <Label htmlFor="sf" className="font-normal">SF Express (30 THB)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="YTO" id="yto" />
                                <Label htmlFor="yto" className="font-normal">YTO Express (20 THB)</Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}

                <div className="items-top flex space-x-3 rounded-lg border border-input p-4">
                    <Checkbox id="consignment" checked={isConsignment} onCheckedChange={checked => setIsConsignment(!!checked)} />
                    <div className="grid gap-1.5 leading-none">
                    <Label
                        htmlFor="consignment"
                        className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        {t('newProductPage.officialConsignment')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t('newProductPage.consignmentDescription')}
                    </p>
                    </div>
                </div>
               
                <div className="flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('newProductPage.listItem')}
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
