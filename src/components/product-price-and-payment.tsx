'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, CreditCard, Smartphone, QrCode, Loader2, Wallet, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/use-translation';
import { usePaymentMethods } from '@/hooks/use-payment-methods';
import { cn } from '@/lib/utils';
import { useEthPaymentAdapter } from '@/hooks/contracts/useEthPaymentAdapter';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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

// Fallback 测试钱包地址（当卖家没有绑定钱包时使用）
const FALLBACK_SELLER_ADDRESS = '0x540c5F56cded29559f395Dea359Fdc0092b78089';

interface ProductPriceAndPaymentProps {
  product: Product;
  selectedPayment: PaymentMethod | null;
  setSelectedPayment: (method: PaymentMethod | null) => void;
}

// Payment method icons
const USDTLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 2000 2000" xmlns="http://www.w3.org/2000/svg">
        <path fill="#26A17B" d="M1000 0c552.285 0 1000 447.715 1000 1000s-447.715 1000-1000 1000S0 1552.285 0 1000 447.715 0 1000 0z"/>
        <path fill="#FFF" d="M1087.5 618.75v191.667c191.666 12.5 347.917 47.916 347.917 89.583 0 41.667-156.25 77.083-347.917 89.583v454.167H912.5V989.583c-191.667-12.5-347.917-47.916-347.917-89.583 0-41.667 156.25-77.083 347.917-89.583V618.75h483.333V462.5H604.167v156.25h483.333z"/>
    </svg>
);

const AlipayLogo = () => (
    <div className="w-6 h-6 rounded-full bg-[#00A1E9] flex items-center justify-center p-0.5">
        <svg viewBox="0 0 1024 1024" fill="white">
            <path d="M817.3 400.9h-165.7l-59 200.9 136 230c4.5 7.6 1.8 17.7-5.8 22.2-7.6 4.5-17.7 1.8-22.2-5.8l-140-235.5-140 235.5c-4.5 7.6-14.5 10.3-22.2 5.8-7.6-4.5-10.3-14.5-5.8-22.2l136-230-59-200.9H205.8c-9.2 0-16.7-7.5-16.7-16.7s7.5-16.7 16.7-16.7h165.7c6.2 0 11.7 3.4 14.6 8.9L445 514.8l58.9-138.4c2.8-5.5 8.4-8.9 14.6-8.9h165.7c9.2 0 16.7 7.5 16.7 16.7s-7.5 16.7-16.7 16.7z"></path>
        </svg>
    </div>
);

const WeChatLogo = () => (
    <div className="w-6 h-6 rounded-full bg-[#07C160] flex items-center justify-center">
        <svg viewBox="0 0 1024 1024" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M512 64C264.58 64 64 254.34 64 502c0 137.02 64.12 260.66 166.62 344.22-14.26 38.9-39.98 72.82-74.08 99.3-4.52 3.52-6.2 9.56-4.22 14.98 1.98 5.4 7.28 8.8 12.98 8.44 32.96-2.08 65.34-11.42 94.6-27.18 24.96-13.44 47.56-31.14 67.28-52.42C425.86 896.7 468.18 902 512 902c247.42 0 448-189.92 448-438S759.42 64 512 64z m-144.38 522.68c-40.42 0-73.2-30.82-73.2-68.86s32.78-68.86 73.2-68.86c40.42 0 73.2 30.82 73.2 68.86s-32.78 68.86-73.2 68.86z m288.76 0c-40.42 0-73.2-30.82-73.2-68.86s32.78-68.86 73.2-68.86c40.42 0 73.2 30.82 73.2 68.86s-32.78 68.86-73.2 68.86z"/>
        </svg>
    </div>
);

const PromptPayLogo = () => (
    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
        P
    </div>
);


export function ProductPriceAndPayment({ product, selectedPayment, setSelectedPayment }: ProductPriceAndPaymentProps) {
    const { t } = useTranslation();
    const { methods, loading: paymentMethodsLoading } = usePaymentMethods();
    const firestore = useFirestore();
    const { user, profile } = useUser();
    const { toast } = useToast();

    // 智能合约支付适配器
    const {
        isLoading: isContractLoading,
        txHash,
        createOrderWithConversion,
        getPaymentInfo,
        switchToBaseSepolia,
    } = useEthPaymentAdapter();

    // 支付确认对话框状态
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

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

    // Check if a payment method should be shown
    const shouldShowMethod = (method: keyof typeof methods): boolean => {
        // In MVP, only show methods that are enabled in admin settings
        return methods[method] ?? false;
    };

    // Check if a method is disabled (shown but not clickable)
    const isMethodDisabled = (method: PaymentMethod): boolean => {
        // If method is not enabled in admin, it's disabled
        const methodKey = method.toLowerCase() as keyof typeof methods;
        return !methods[methodKey];
    };

    // 获取卖家钱包地址
    const getSellerAddress = useCallback(async () => {
        // 1. 首先尝试从 product.seller.walletAddress 获取
        if (product.seller?.walletAddress) {
            return product.seller.walletAddress;
        }

        // 2. 尝试从 Firestore 获取卖家信息
        if (firestore && product.sellerId) {
            try {
                const sellerDoc = await getDoc(doc(firestore, 'users', product.sellerId));
                if (sellerDoc.exists()) {
                    const sellerData = sellerDoc.data();
                    if (sellerData.walletAddress) {
                        return sellerData.walletAddress;
                    }
                }
            } catch (error) {
                console.error('Error fetching seller wallet:', error);
            }
        }

        // 3. 使用 fallback 地址
        console.warn('Using fallback seller address for testing');
        return FALLBACK_SELLER_ADDRESS;
    }, [product, firestore]);

    // 处理 USDT 支付点击
    const handleUSDTPayment = async () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: '请先登录',
                description: '购买商品需要先登录账户',
            });
            return;
        }

        if (!product.sellerId) {
            toast({
                variant: 'destructive',
                title: '商品信息不完整',
                description: '无法获取卖家信息',
            });
            return;
        }

        // 生成订单 ID
        const newOrderId = `${product.id}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        setOrderId(newOrderId);
        setShowConfirmDialog(true);
    };

    // 确认支付
    const handleConfirmPayment = async () => {
        setShowConfirmDialog(false);
        setIsProcessing(true);

        try {
            // 1. 切换到 Base Sepolia 网络
            const switched = await switchToBaseSepolia();
            if (!switched) {
                toast({
                    variant: 'destructive',
                    title: '网络切换失败',
                    description: '请手动切换到 Base Sepolia 测试网',
                });
                setIsProcessing(false);
                return;
            }

            // 2. 获取卖家钱包地址
            const sellerAddress = await getSellerAddress();

            // 3. 获取支付信息
            const paymentInfo = getPaymentInfo(product.price.toString());

            toast({
                title: '准备创建订单',
                description: `支付 ${paymentInfo.payAmount} ETH (显示: ${paymentInfo.displayAmount} USDT)`,
            });

            // 4. 调用智能合约创建订单
            const success = await createOrderWithConversion(
                orderId,
                sellerAddress,
                product.price.toString()
            );

            if (!success) {
                setIsProcessing(false);
                return;
            }

            // 5. 保存订单到 Firestore
            if (firestore && user) {
                const orderData = {
                    orderId: orderId,
                    productId: product.id,
                    productName: product.name,
                    productImage: product.images?.[0] || '',
                    buyerId: user.uid,
                    buyerEmail: user.email || '',
                    sellerId: product.sellerId,
                    price: product.price,
                    currency: 'USDT',
                    ethAmount: paymentInfo.payAmount,
                    status: 'pending', // pending, paid, shipped, completed, disputed, refunded
                    paymentMethod: 'USDT',
                    txHash: '', // 会在下面更新
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                // 保存订单文档
                await setDoc(doc(firestore, 'orders', orderId), orderData);

                // 更新订单状态为已支付
                await setDoc(doc(firestore, 'orders', orderId), {
                    status: 'paid',
                    txHash: txHash || '',
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                toast({
                    title: '订单已保存',
                    description: '订单信息已保存到数据库',
                });
            }

            setIsProcessing(false);

        } catch (error: any) {
            console.error('Payment error:', error);
            toast({
                variant: 'destructive',
                title: '支付失败',
                description: error.message || '未知错误',
            });
            setIsProcessing(false);
        }
    };

    const getButtonVariant = (method: PaymentMethod) => {
        return selectedPayment === method ? 'default' : 'outline';
    }

    // Check if a payment method should be shown
    const shouldShowMethod = (method: keyof typeof methods): boolean => {
        return methods[method] ?? false;
    };

    // Check if a method is disabled (shown but not clickable)
    const isMethodDisabled = (method: PaymentMethod): boolean => {
        const methodKey = method.toLowerCase() as keyof typeof methods;
        return !methods[methodKey];
    };

    // 获取支付信息显示
    const paymentInfo = useMemo(() => {
        if (selectedPayment === 'USDT') {
            return getPaymentInfo(product.price.toString());
        }
        return null;
    }, [selectedPayment, product.price, getPaymentInfo]);

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
                    {/* USDT - MVP 阶段唯一可用支付方式 */}
                    <Button
                        variant={getButtonVariant('USDT')}
                        className="h-12 text-base relative"
                        onClick={() => setSelectedPayment('USDT')}
                        disabled={paymentMethodsLoading || !shouldShowMethod('usdt')}
                    >
                        <USDTLogo className="w-5 h-5 mr-2" />
                        USDT
                        {!shouldShowMethod('usdt') && (
                            <Lock className="w-3 h-3 absolute top-1 right-1 text-muted-foreground" />
                        )}
                    </Button>

                    {/* Alipay - Shown but disabled in MVP */}
                    <Button
                        variant={getButtonVariant('Alipay')}
                        className="h-12 text-base relative opacity-50 cursor-not-allowed"
                        disabled={true}
                    >
                        <AlipayLogo />
                        <span className="ml-2">支付宝</span>
                        <Lock className="w-3 h-3 absolute top-1 right-1 text-muted-foreground" />
                    </Button>

                    {/* WeChat - Shown but disabled in MVP */}
                    <Button
                        variant={getButtonVariant('WeChat')}
                        className="h-12 text-base relative opacity-50 cursor-not-allowed"
                        disabled={true}
                    >
                        <WeChatLogo />
                        <span className="ml-2">微信支付</span>
                        <Lock className="w-3 h-3 absolute top-1 right-1 text-muted-foreground" />
                    </Button>

                    {/* PromptPay - Shown but disabled in MVP */}
                    <Button
                        variant={getButtonVariant('PromptPay')}
                        className="h-12 text-base relative opacity-50 cursor-not-allowed"
                        disabled={true}
                    >
                        <PromptPayLogo />
                        <span className="ml-2">PromptPay</span>
                        <Lock className="w-3 h-3 absolute top-1 right-1 text-muted-foreground" />
                    </Button>
                </div>

                {/* Show message when non-USDT methods are disabled */}
                <p className="text-xs text-muted-foreground mt-3 text-center">
                    MVP 阶段仅开放 USDT 支付。其他支付方式即将上线。
                </p>
            </div>

            {/* 支付按钮区域 */}
            {selectedPayment === 'USDT' && (
                <USDTPaymentSection
                    product={product}
                    paymentInfo={paymentInfo}
                    isProcessing={isProcessing}
                    onPayClick={handleUSDTPayment}
                />
            )}

            {/* 支付确认对话框 */}
            <PaymentConfirmDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                product={product}
                paymentInfo={paymentInfo}
                onConfirm={handleConfirmPayment}
                isProcessing={isProcessing}
            />
        </>
    );
}

// USDT 支付区域组件
interface USDTPaymentSectionProps {
    product: Product;
    paymentInfo: { displayAmount: string; payAmount: string; displaySymbol: string; paySymbol: string; exchangeRate: string; } | null;
    isProcessing: boolean;
    onPayClick: () => void;
}

function USDTPaymentSection({ product, paymentInfo, isProcessing, onPayClick }: USDTPaymentSectionProps) {
    return (
        <div className="mt-6 space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">支付金额</span>
                    <span className="text-lg font-bold text-primary">
                        {paymentInfo?.payAmount} {paymentInfo?.paySymbol}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">显示金额</span>
                    <span className="text-white">
                        {paymentInfo?.displayAmount} {paymentInfo?.displaySymbol}
                    </span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground text-center">
                    {paymentInfo?.exchangeRate}
                </div>
            </div>

            <Button
                onClick={onPayClick}
                disabled={isProcessing}
                className="w-full h-14 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-[0.3em] shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-[1.02] transition-transform rounded-2xl"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        处理中...
                    </>
                ) : (
                    '立即支付'
                )}
            </Button>

            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" />
                资金将由智能合约托管，确认收货后释放
            </p>
        </div>
    );
}

// 支付确认对话框组件
interface PaymentConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product;
    paymentInfo: { displayAmount: string; payAmount: string; displaySymbol: string; paySymbol: string; exchangeRate: string; } | null;
    onConfirm: () => void;
    isProcessing: boolean;
}

function PaymentConfirmDialog({ open, onOpenChange, product, paymentInfo, onConfirm, isProcessing }: PaymentConfirmDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-black/95 backdrop-blur-3xl border border-white/10 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase italic tracking-wider">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                        确认订单
                    </DialogTitle>
                    <DialogDescription className="text-white/60">
                        请确认您的订单详情，这将触发区块链交易
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-white/60 text-sm">商品</span>
                        <span className="text-white font-medium truncate max-w-[200px]">{product.name}</span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-white/60 text-sm">显示金额</span>
                        <span className="text-white font-black">
                            {paymentInfo?.displayAmount} {paymentInfo?.displaySymbol}
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-primary/10 border border-primary/30 rounded-xl">
                        <span className="text-primary/80 text-sm">实际支付 (ETH)</span>
                        <span className="text-primary font-black text-lg">
                            {paymentInfo?.payAmount} {paymentInfo?.paySymbol}
                        </span>
                    </div>

                    <div className="text-center text-xs text-white/40 pt-2">
                        {paymentInfo?.exchangeRate}
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                        disabled={isProcessing}
                    >
                        取消
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-wider hover:scale-[1.02] transition-transform"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                处理中...
                            </>
                        ) : (
                            <>
                                <Wallet className="mr-2 h-4 w-4" />
                                确认支付
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
