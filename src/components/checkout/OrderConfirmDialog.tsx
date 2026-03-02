'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector, PaymentMethod } from './PaymentMethodSelector';
import { Loader2, ShoppingBag, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    sellerId: string;
  };
  onConfirm: (paymentMethod: PaymentMethod) => Promise<void>;
}

export function OrderConfirmDialog({
  open,
  onOpenChange,
  product,
  onConfirm
}: OrderConfirmDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('usdt');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(selectedMethod);
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-morphism border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gradient">
            Confirm Your Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 商品信息 */}
          <div className="glass-morphism rounded-xl border border-white/10 p-4">
            <h3 className="text-sm font-bold text-white/60 mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Order Details
            </h3>
            <div className="flex gap-4">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 rounded-lg object-cover border border-white/10"
                />
              )}
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">{product.name}</h4>
                <p className="text-2xl font-bold text-gradient">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* 收货地址提示 */}
          <div className="glass-morphism rounded-xl border border-white/10 p-4">
            <h3 className="text-sm font-bold text-white/60 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </h3>
            <p className="text-sm text-white/80">
              You can add or select shipping address after payment
            </p>
          </div>

          {/* 支付方式选择 */}
          <PaymentMethodSelector
            selectedMethod={selectedMethod}
            onMethodChange={setSelectedMethod}
          />

          {/* 总价 */}
          <div className="glass-morphism rounded-xl border border-primary/30 p-4 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-white">Total Amount</span>
              <span className="text-3xl font-bold text-gradient">
                ${product.price.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
              className="flex-1 border-white/20 hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover-lift"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Confirm Purchase'
              )}
            </Button>
          </div>

          {/* 提示信息 */}
          <p className="text-xs text-white/40 text-center">
            By confirming, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
