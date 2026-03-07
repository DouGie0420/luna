'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wallet, ShieldCheck, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEthPaymentAdapter } from '@/hooks/contracts/useEthPaymentAdapter';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface EscrowPaymentButtonProps {
  productId: string;
  sellerId: string;
  sellerAddress: string;
  price: number; // USDT 价格
  disabled?: boolean;
  isOwner?: boolean;
  onSuccess?: () => void;
}

export function EscrowPaymentButton({
  productId,
  sellerId,
  sellerAddress,
  price,
  disabled = false,
  isOwner = false,
  onSuccess,
}: EscrowPaymentButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderId, setOrderId] = useState<string>('');
  const { toast } = useToast();

  const {
    isLoading,
    txHash,
    createOrderWithConversion,
    getPaymentInfo,
    usdtToEth,
    switchToBaseSepolia,
  } = useEthPaymentAdapter();

  // 生成唯一订单 ID
  const generateOrderId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${productId}_${timestamp}_${random}`;
  }, [productId]);

  // 处理购买按钮点击
  const handleBuyClick = async () => {
    if (isOwner) {
      toast({
        variant: 'destructive',
        title: '无法购买自己的商品',
        description: '您不能购买自己发布的商品',
      });
      return;
    }

    if (!sellerAddress || sellerAddress === '0x0000000000000000000000000000000000000000') {
      toast({
        variant: 'destructive',
        title: '卖家未配置钱包',
        description: '该卖家尚未配置 Web3 钱包地址，无法完成交易',
      });
      return;
    }

    const newOrderId = generateOrderId();
    setOrderId(newOrderId);
    setShowConfirm(true);
  };

  // 确认支付
  const handleConfirmPayment = async () => {
    setShowConfirm(false);

    // 先切换到 Base Sepolia 网络
    const switched = await switchToBaseSepolia();
    if (!switched) {
      toast({
        variant: 'destructive',
        title: '网络切换失败',
        description: '请手动切换到 Base Sepolia 测试网',
      });
      return;
    }

    // 创建订单（使用转换后的 ETH 金额）
    const success = await createOrderWithConversion(orderId, sellerAddress, price.toString());

    if (success) {
      toast({
        title: '订单创建成功！',
        description: '您的订单已在区块链上确认',
      });
      onSuccess?.();
    }
  };

  // 获取支付信息显示
  const paymentInfo = getPaymentInfo(price.toString());

  return (
    <>
      <Button
        onClick={handleBuyClick}
        disabled={disabled || isLoading || isOwner}
        className="w-full h-16 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-[0.3em] shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-[1.02] transition-transform rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            处理中...
          </>
        ) : (
          '立即购买 / Purchase'
        )}
      </Button>

      {/* 支付确认对话框 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
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
              <span className="text-white/60 text-sm">订单 ID</span>
              <span className="text-white font-mono text-xs">{orderId.slice(0, 20)}...</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
              <span className="text-white/60 text-sm">显示金额</span>
              <span className="text-white font-black">{paymentInfo.displayAmount} {paymentInfo.displaySymbol}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary/10 border border-primary/30 rounded-xl">
              <span className="text-primary/80 text-sm">实际支付</span>
              <span className="text-primary font-black text-lg">{paymentInfo.payAmount} {paymentInfo.paySymbol}</span>
            </div>
            <div className="text-center text-xs text-white/40 pt-2">
              {paymentInfo.exchangeRate}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmPayment}
              className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-wider hover:scale-[1.02] transition-transform"
            >
              <Wallet className="mr-2 h-4 w-4" />
              确认支付
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 交易状态显示 */}
      {txHash && (
        <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-primary">
            <ExternalLink className="h-4 w-4" />
            <span>交易已提交</span>
          </div>
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/60 hover:text-primary break-all mt-1 block"
          >
            {txHash}
          </a>
        </div>
      )}
    </>
  );
}
