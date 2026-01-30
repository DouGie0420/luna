'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getProductById } from '@/lib/data';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Product, UserAddress } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { collection } from 'firebase/firestore';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Edit, CheckCircle2 } from 'lucide-react';
import { MapPin, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethodButton } from '@/components/payment-method-button';
import { Progress } from "@/components/ui/progress";
import { RotatingQuote } from '@/components/rotating-quote';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AddressForm } from '@/components/address-form';


const SHIPPING_FEES = {
  'Seller Pays': 0,
  'Buyer Pays': 150, // Example fee in THB
  'In-person': 0,
};

type ShippingMethod = 'Seller Pays' | 'Buyer Pays' | 'In-person';
type ShippingMethodOption = 'Buyer Pays' | 'In-person';
type PaymentMethod = 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['USDT', 'Alipay', 'WeChat', 'PromptPay'];


function CheckoutPageSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <Skeleton className="h-9 w-48 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3 space-y-8">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingMethodOption>('Buyer Pays');
  
  const initialPaymentMethod = useMemo(() => {
    const pm = searchParams.get('paymentMethod') as PaymentMethod | null;
    if (pm && VALID_PAYMENT_METHODS.includes(pm)) {
      return pm;
    }
    return 'USDT'; // Default fallback
  }, [searchParams]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [progress, setProgress] = useState(0);

  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const addressesCollectionQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'addresses');
  }, [firestore, user]);

  const { data: addresses, loading: addressesLoading } = useCollection<UserAddress>(addressesCollectionQuery);
  
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>();
  
  useEffect(() => {
    if (addresses) {
      const defaultAddress = addresses.find(a => a.isDefault);
      setSelectedAddressId(defaultAddress?.id || addresses[0]?.id);
    }
  }, [addresses]);

  useEffect(() => {
    if (progress < 90) {
      const timer = setTimeout(() => {
        setProgress(prevProgress => prevProgress + 1);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoadingProduct(true);
      const p = await getProductById(id);
      if (p) {
        setProduct(p);
      }
      setLoadingProduct(false);
    };
    fetchProduct();
  }, [id]);

  const handleConfirmPurchase = () => {
    // In a real app, this would create an order in the database.
    // For now, we'll just navigate to a success page.
    const mockOrderId = "ORD004"; // Using a known mock order ID
    router.push(`/order/success?orderId=${mockOrderId}`);
  };

  const handleEditAddress = (addressId: string) => {
    setEditingAddressId(addressId);
    setIsAddressDialogOpen(true);
  };

  const handleAddNewAddress = () => {
    setEditingAddressId(null);
    setIsAddressDialogOpen(true);
  };
  
  const onAddressSave = () => {
    setIsAddressDialogOpen(false);
    setEditingAddressId(null);
    // Data will refresh automatically due to the useCollection hook
  };

  const shippingMethod: ShippingMethod = useMemo(() => {
    if (product?.shippingMethod === 'Seller Pays') {
      return 'Seller Pays';
    }
    return selectedShippingOption;
  }, [product, selectedShippingOption]);

  const shippingFee = useMemo(() => SHIPPING_FEES[shippingMethod], [shippingMethod]);
  const totalAmount = useMemo(() => (product?.price || 0) + shippingFee, [product, shippingFee]);

  const isLoading = loadingProduct || userLoading || addressesLoading;

  if (isLoading) {
    return (
      <>
        <PageHeaderWithBackAndClose />
        <CheckoutPageSkeleton />
      </>
    );
  }

  if (!product || !user) {
    return notFound();
  }

  return (
    <>
      <PageHeaderWithBackAndClose />
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingAddressId ? 'Edit Address' : 'Add New Address'}</DialogTitle>
            <DialogDescription>
              {editingAddressId ? 'Update your address details.' : 'Enter the details for your new shipping address.'}
            </DialogDescription>
          </DialogHeader>
          <AddressForm userId={user.uid} addressId={editingAddressId} onSave={onAddressSave} />
        </DialogContent>

        <div className="container mx-auto max-w-5xl px-4 py-12">
          <h1 className="text-3xl font-headline mb-8">{t('checkoutPage.title')}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
            
            {/* Left/Main Column */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* Shipping Address */}
              <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" /> {t('checkoutPage.shippingAddress')}
                  </CardTitle>
                   <DialogTrigger asChild>
                     <Button variant="secondary" size="sm" onClick={handleAddNewAddress}>
                        {t('checkoutPage.addNewAddress')}
                     </Button>
                   </DialogTrigger>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-4">
                    {addresses && addresses.length > 0 ? addresses.map(address => (
                      <Label key={address.id} htmlFor={address.id} className={cn(
                        "block p-4 border rounded-lg cursor-pointer transition-all",
                        selectedAddressId === address.id ? "border-primary ring-2 ring-primary/50" : "border-border hover:border-primary/50"
                      )}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <RadioGroupItem value={address.id} id={address.id} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <p className="font-semibold">{address.recipientName}</p>
                                <p className="text-muted-foreground">{address.phone}</p>
                                {address.isDefault && <Badge>{t('checkoutPage.defaultAddress')}</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {address.addressLine1}, {address.city}, {address.province}, {address.postalCode}, {address.country}
                              </p>
                            </div>
                          </div>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); handleEditAddress(address.id); }}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('checkoutPage.edit')}
                            </Button>
                          </DialogTrigger>
                        </div>
                      </Label>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground">No addresses found.</div>
                    )}
                  </RadioGroup>
                </CardContent>
              </Card>

              <RotatingQuote />
              
              <div className="pt-2">
                <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" /> {t('checkoutPage.shippingMethod')}
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      {product.shippingMethod === 'Seller Pays' ? (
                      <div className="p-4 border rounded-lg bg-secondary/30 flex items-center gap-4 text-primary">
                          <CheckCircle2 className="h-6 w-6" />
                          <div>
                          <p className="font-semibold">{t(`checkoutPage.shippingMethods.sellerpays`)}</p>
                          <p className="text-sm text-muted-foreground">{t(`checkoutPage.shippingMethods.sellerpaysDesc`)}</p>
                          </div>
                      </div>
                      ) : (
                      <RadioGroup value={selectedShippingOption} onValueChange={(v: any) => setSelectedShippingOption(v)} className="flex flex-col md:flex-row gap-4">
                          {(['Buyer Pays', 'In-person'] as ShippingMethodOption[]).map(method => (
                          <Label key={method} htmlFor={method} className="flex-1 p-4 border rounded-lg cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary/50 transition-all">
                              <div className="flex items-center gap-4">
                                  <RadioGroupItem value={method} id={method} />
                                  <div>
                                  <p className="font-semibold">{t(`checkoutPage.shippingMethods.${method.toLowerCase().replace(/[\s-]/g, '')}` as any)}</p>
                                  <p className="text-sm text-muted-foreground">{t(`checkoutPage.shippingMethods.${method.toLowerCase().replace(/[\s-]/g, '')}Desc` as any)}</p>
                                  </div>
                              </div>
                          </Label>
                          ))}
                      </RadioGroup>
                      )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right/Sidebar Column */}
            <div className="lg:col-span-2">
              <Card className="sticky top-24">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 aspect-square rounded-md overflow-hidden">
                      <Image src={product.images[0]} alt={product.name} fill className="object-cover" data-ai-hint={product.imageHints[0]} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold leading-tight">{product.name}</p>
                      <p className="text-lg font-bold text-primary mt-1">
                        {product.price.toLocaleString()} 
                        <span className="text-xs ml-1">{product.currency}</span>
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('checkoutPage.subtotal')}</span>
                    <span>{product.price.toLocaleString()} {product.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('checkoutPage.shippingFee')}</span>
                    <span>{shippingFee > 0 ? `${shippingFee.toLocaleString()} ${product.currency}` : t('checkoutPage.free')}</span>
                  </div>
                  <Separator />
                   <div>
                      <h3 className="text-base font-semibold mb-3">{t('checkoutPage.paymentMethod')}</h3>
                      <div className="grid grid-cols-1 gap-2">
                          <PaymentMethodButton method="USDT" label="USDT" variant={paymentMethod === 'USDT' ? 'default' : 'outline'} onClick={() => setPaymentMethod('USDT')} />
                          <PaymentMethodButton method="Alipay" label="支付宝" variant={paymentMethod === 'Alipay' ? 'default' : 'outline'} onClick={() => setPaymentMethod('Alipay')} />
                          <PaymentMethodButton method="WeChat" label="微信支付" variant={paymentMethod === 'WeChat' ? 'default' : 'outline'} onClick={() => setPaymentMethod('WeChat')} />
                          <PaymentMethodButton method="PromptPay" label="PromptPay" variant={paymentMethod === 'PromptPay' ? 'default' : 'outline'} onClick={() => setPaymentMethod('PromptPay')} />
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 p-6 pt-6">
                   <div className="w-full flex justify-between font-bold text-lg">
                    <span>{t('checkoutPage.total')}</span>
                    <span className="text-primary">{totalAmount.toLocaleString()} {product.currency}</span>
                  </div>
                   <Button size="lg" className="w-full h-12 text-lg" onClick={handleConfirmPurchase}>{t('checkoutPage.confirmPurchase')}</Button>
                   <div className="w-full space-y-2 pt-2">
                      <div className="relative h-4 w-full overflow-hidden rounded-full animate-breathing-glow bg-secondary">
                          <Progress value={progress} className="w-full h-4 bg-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-sm font-bold text-primary-foreground [text-shadow:0_1px_2px_hsl(var(--background)/0.7)]">
                                  {Math.round(progress)}%
                             </span>
                          </div>
                      </div>
                      <div className="w-full text-center">
                          <p className="text-xs text-muted-foreground">{t('checkoutPage.escrowInfo')}</p>
                      </div>
                   </div>
                </CardFooter>
              </Card>
            </div>

          </div>
        </div>
      </Dialog>
    </>
  );
}
