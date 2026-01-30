'use client';

import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-translation';


type PaymentMethod = 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

// Hardcoded rates and fees for demonstration
const RATES = {
    USDT_THB: 33,
    RMB_THB: 5.2, // 1 RMB = 5.2 THB
};

const FEES = {
    USDT_RATE_DEDUCTION: 3,
    RMB: 1.5,
    PromptPay: 3
};

interface ProductPriceAndPaymentProps {
  product: Product;
  selectedPayment: PaymentMethod | null;
  setSelectedPayment: (method: PaymentMethod | null) => void;
}


export function ProductPriceAndPayment({ product, selectedPayment, setSelectedPayment }: ProductPriceAndPaymentProps) {
    const { t } = useTranslation();

    // Normalize base price to THB for calculation
    const basePriceInTHB = useMemo(() => {
        if (product.currency === 'THB') {
            return product.price;
        }
        if (product.currency === 'USDT') {
            return product.price * RATES.USDT_THB;
        }
        if (product.currency === 'RMB') {
            return product.price * RATES.RMB_THB;
        }
        return product.price; // fallback
    }, [product.price, product.currency]);

    const convertedPrice = useMemo(() => {
        if (!selectedPayment) return null;

        switch(selectedPayment) {
            case 'USDT': {
                const effectiveRate = RATES.USDT_THB - FEES.USDT_RATE_DEDUCTION; // 33 - 3 = 30
                const price = basePriceInTHB / effectiveRate;
                return { amount: price.toFixed(2), currency: 'USDT' };
            }
            case 'Alipay':
            case 'WeChat': {
                const priceInRMB = basePriceInTHB / RATES.RMB_THB;
                const finalPrice = priceInRMB + FEES.RMB;
                return { amount: finalPrice.toFixed(2), currency: 'RMB' };
            }
            case 'PromptPay': {
                const price = basePriceInTHB + FEES.PromptPay;
                return { amount: price.toFixed(2), currency: 'THB' };
            }
            default:
                return null;
        }
    }, [selectedPayment, basePriceInTHB]);
    
    const getButtonVariant = (method: PaymentMethod) => {
        return selectedPayment === method ? 'default' : 'outline';
    }

    return (
        <>
            <div className="bg-card p-4 border border-border">
                 <div className="flex items-baseline gap-4 flex-wrap">
                    <p className="text-4xl font-bold text-primary">
                        ฿{basePriceInTHB.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                    {convertedPrice && selectedPayment !== 'PromptPay' && (
                        <p className="text-lg font-semibold text-muted-foreground">
                             ≈ {convertedPrice.currency === 'RMB' ? '¥' : ''}{convertedPrice.currency === 'USDT' ? '$' : ''}{convertedPrice.amount}
                        </p>
                    )}
                     {selectedPayment === 'PromptPay' && convertedPrice && (
                        <p className="text-lg font-semibold text-muted-foreground">
                             (Total: ฿{convertedPrice.amount})
                        </p>
                    )}
                    {product.shippingMethod === 'Seller Pays' && (
                        <Badge variant="outline" className="border-lime-400/50 bg-lime-400/10 text-lime-300 self-center">
                            {t('product.freeShipping')}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <ShieldCheck className="h-4 w-4 text-primary"/>
                    <span>描述不符包邮退</span>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3">支付方式</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant={getButtonVariant('USDT')} className="h-12 text-base" onClick={() => setSelectedPayment('USDT')}>USDT</Button>
                    <Button variant={getButtonVariant('Alipay')} className="h-12 text-base" onClick={() => setSelectedPayment('Alipay')}>支付宝</Button>
                    <Button variant={getButtonVariant('WeChat')} className="h-12 text-base" onClick={() => setSelectedPayment('WeChat')}>微信支付</Button>
                    <Button variant={getButtonVariant('PromptPay')} className="h-12 text-base" onClick={() => setSelectedPayment('PromptPay')}>PromptPay</Button>
                </div>
            </div>
        </>
    );
}
