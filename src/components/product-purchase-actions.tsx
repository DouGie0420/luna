'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductPriceAndPayment } from './product-price-and-payment';
import { BuyNowButton } from './buy-now-button';
import { Button } from './ui/button';

type PaymentMethod = 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

export function ProductPurchaseActions({ product }: { product: Product }) {
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

    return (
        <>
            <ProductPriceAndPayment 
                product={product} 
                selectedPayment={selectedPayment} 
                setSelectedPayment={setSelectedPayment} 
            />

            <div className="flex gap-2">
                <Button size="lg" variant="secondary" className="flex-1 h-14 text-lg">
                    联系卖家
                </Button>
                <BuyNowButton product={product} selectedPayment={selectedPayment} />
            </div>
        </>
    );
}
