'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound } from 'next/navigation';
import Image from 'next/image';
import { getProductById } from '@/lib/data';
import { useUser } from '@/firebase';
import type { Product, UserAddress } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AlertCircle, MapPin, Truck, Wallet, Edit, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentMethodButton } from '@/components/payment-method-button';


const mockAddresses: UserAddress[] = [
  {
    id: 'addr1',
    recipientName: 'Alex Doe',
    phone: '+66 81 234 5678',
    country: 'Thailand',
    province: 'Bangkok',
    city: 'Bangkok',
    addressLine1: '123 Cyberpunk Road, Sukhumvit Soi 11',
    postalCode: '10110',
    isDefault: true,
  },
  {
    id: 'addr2',
    recipientName: 'Alex Doe',
    phone: '+86 138 1234 5678',
    country: 'China',
    province: 'Shanghai',
    city: 'Shanghai',
    addressLine1: 'Room 101, No. 456 Neon Avenue, Pudong District',
    postalCode: '200120',
  },
];

const SHIPPING_FEES = {
  'Seller Pays': 0,
  'Buyer Pays': 150, // Example fee in THB
  'In-person': 0,
};

type ShippingMethod = 'Seller Pays' | 'Buyer Pays' | 'In-person';
type ShippingMethodOption = 'Buyer Pays' | 'In-person';
type PaymentMethod = 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

function CheckoutPageSkeleton() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <Skeleton className="h-9 w-48 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const params = useParams();
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(mockAddresses.find(a => a.isDefault)?.id);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingMethodOption>('Buyer Pays');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('USDT');

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      const p = await getProductById(id);
      if (p) {
        setProduct(p);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const shippingMethod: ShippingMethod = useMemo(() => {
    if (product?.shippingMethod === 'Seller Pays') {
      return 'Seller Pays';
    }
    return selectedShippingOption;
  }, [product, selectedShippingOption]);

  const shippingFee = useMemo(() => SHIPPING_FEES[shippingMethod], [shippingMethod]);
  const totalAmount = useMemo(() => (product?.price || 0) + shippingFee, [product, shippingFee]);

  if (loading || userLoading) {
    return (
      <>
        <PageHeaderWithBackAndClose />
        <CheckoutPageSkeleton />
      </>
    );
  }

  if (!product) {
    return notFound();
  }

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-headline mb-8">{t('checkoutPage.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          
          {/* Left/Main Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Shipping Address */}
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> {t('checkoutPage.shippingAddress')}
                </CardTitle>
                 <Button variant="secondary" size="sm">{t('checkoutPage.addNewAddress')}</Button>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-4">
                  {mockAddresses.map(address => (
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
                        <Button variant="ghost" size="sm"><Edit className="mr-2 h-4 w-4" />{t('checkoutPage.edit')}</Button>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Shipping Method */}
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

            {/* Payment Method */}
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" /> {t('checkoutPage.paymentMethod')}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    <PaymentMethodButton method="USDT" label="USDT" variant={paymentMethod === 'USDT' ? 'default' : 'outline'} onClick={() => setPaymentMethod('USDT')} />
                    <PaymentMethodButton method="Alipay" label="支付宝" variant={paymentMethod === 'Alipay' ? 'default' : 'outline'} onClick={() => setPaymentMethod('Alipay')} />
                    <PaymentMethodButton method="WeChat" label="微信支付" variant={paymentMethod === 'WeChat' ? 'default' : 'outline'} onClick={() => setPaymentMethod('WeChat')} />
                    <PaymentMethodButton method="PromptPay" label="PromptPay" variant={paymentMethod === 'PromptPay' ? 'default' : 'outline'} onClick={() => setPaymentMethod('PromptPay')} />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right/Sidebar Column */}
          <div className="lg:col-span-1">
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
              <CardContent className="space-y-3 text-sm">
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('checkoutPage.subtotal')}</span>
                  <span>{product.price.toLocaleString()} {product.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('checkoutPage.shippingFee')}</span>
                  <span>{shippingFee > 0 ? `${shippingFee.toLocaleString()} ${product.currency}` : t('checkoutPage.free')}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('checkoutPage.total')}</span>
                  <span className="text-primary">{totalAmount.toLocaleString()} {product.currency}</span>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4 pt-4 border-t">
                 <Button size="lg" className="w-full h-12 text-lg">{t('checkoutPage.confirmPurchase')}</Button>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground text-center">
                    <AlertCircle className="h-4 w-4" />
                    <p>{t('checkoutPage.escrowInfo')}</p>
                 </div>
              </CardFooter>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}
