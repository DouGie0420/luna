'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import type { Product, UserAddress, UserProfile, PaymentMethod } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { collection, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

// ✅ Web3 核心引入 - 现在使用我们自己的 Hooks 和 Provider
import { ethers, formatUnits, parseUnits, BigNumberish } from 'ethers';
import { getEthersSigner } from '@/lib/web3-provider';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useUSDTApprove } from '@/hooks/useUSDTApprove';
import { useEscrowContract, TransactionStatus } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Edit, Loader2, MapPin, ShieldCheck, AlertCircle, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress"; 
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AddressForm } from '@/components/address-form';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethodButton } from '@/components/payment-method-button';
import { Input } from '@/components/ui/input';

const SHIPPING_FEES = {
  'Seller Pays': 0,
  'Buyer Pays': 150,
  'In-person': 0,
};

type ShippingMethod = 'Seller Pays' | 'Buyer Pays' | 'In-person';
type ShippingMethodOption = 'Buyer Pays' | 'In-person';

// 定义Luna项目所需的Polygon链ID，与web3-provider.ts保持一致
const REQUIRED_CHAIN_ID = 8453;

// 🌌 赛博高奢增强样式
const intenseArtStyles = `
  .fluid-bg-container { position: fixed; inset: 0; background: #05000a; overflow: hidden; z-index: 0; }
  .cyber-grid {
      position: absolute; inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, black 30%, transparent 100%);
  }
  .fluid-entity { position: absolute; border-radius: 50%; filter: blur(120px); will-change: transform; mix-blend-mode: screen; pointer-events: none; }
  @keyframes drift { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(10vw, 10vh) scale(1.3); } }
  .astral-pink { width: 80vw; height: 80vw; top: -20%; left: -20%; background: #ff00ff; animation: drift 20s infinite alternate; opacity: 0.4; }
  .astral-cyan { width: 90vw; height: 90vw; bottom: -30%; right: -20%; background: #00ffff; animation: drift 25s infinite alternate-reverse; opacity: 0.3; }
  .glass-card-cyber { background: rgba(5, 0, 10, 0.8); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
  .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
`;

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string | null | undefined, isMono?: boolean }) => (
    <div className="flex justify-between items-center text-sm">
        <p className="text-white/40 uppercase font-mono text-[10px] tracking-widest">{label}</p>
        {value ? (
            <p className={`font-black ${isMono ? 'font-mono' : ''} break-all text-right text-white`}>{value}</p>
        ) : (
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Unset_Slot</p>
        )}
    </div>
);

const QrCodeDisplay = ({ label, qrUrl }: { label: string, qrUrl: string | null | undefined }) => (
     <div className="flex justify-between items-center">
        <p className="font-bold text-white/80 uppercase tracking-widest text-xs">{label}</p>
        {qrUrl ? (
            <Dialog>
                <DialogTrigger asChild><Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white font-black italic rounded-xl px-4">DECODE_QR</Button></DialogTrigger>
                <DialogContent className="max-w-xs bg-black/95 border-white/10 text-white"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><div className="relative aspect-square w-full"><Image src={qrUrl} alt={`${label} QR Code`} fill className="object-contain rounded-md" /></div></DialogContent>
            </Dialog>
        ) : ( <p className="text-[10px] text-white/20 uppercase tracking-widest">Empty</p> )}
    </div>
);

export default function ClientCheckout() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user, loading: userLoading, profile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const id = params.id as string;
  const productRef = useMemo(() => (firestore && id ? doc(firestore, 'products', id) : null), [firestore, id]);
  const { data: product, loading: loadingProduct } = useDoc<Product>(productRef);
  const { data: sellerProfile, loading: loadingSeller } = useDoc<UserProfile>(
    firestore && product?.sellerId ? doc(firestore, 'users', product.sellerId) : null
  );

  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingMethodOption>('Buyer Pays');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>('USDT'); 
  const [progress, setProgress] = useState(0);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false); 
  const [amountToApprove, setAmountToApprove] = useState<string>(''); 

  // --- Web3 Hooks ---
  const { address, isConnected, chainId } = useUSDTBalanceAndAllowance(); 
  const {
    balance: usdtBalance,
    allowance: usdtAllowance,
    decimals: usdtDecimals,
    symbol: usdtSymbol,
    isLoading: isUSDTDataLoading,
    error: usdtDataError,
    refetch: refetchUSDTData,
  } = useUSDTBalanceAndAllowance();
  const { isApproving, approvalError, approveUSDT } = useUSDTApprove();
  const { isInteracting: isEscrowInteracting, interactionError: escrowInteractionError, transactionState, lockFunds } = useEscrowContract();
  // --- End Web3 Hooks ---

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
    if (progress < 90 && isProcessing) { 
      const timer = setTimeout(() => setProgress(p => p + 1), 50);
      return () => clearTimeout(timer);
    }
    if (!isProcessing && progress > 0 && progress < 100) { 
        setProgress(0);
    }
  }, [progress, isProcessing]);

  // 处理网络不匹配
  useEffect(() => {
    if (isConnected && chainId !== REQUIRED_CHAIN_ID) {
        toast({
            variant: "destructive",
            title: "CHAIN_MISMATCH",
            description: `请切换到 Base 主网 (Chain ID: ${REQUIRED_CHAIN_ID}) 进行交易。`,
            action: (
                <Button
                    onClick={() => connectToChain(REQUIRED_CHAIN_ID, toast)}
                    className="btn-liquid glass-morphism bg-primary hover:bg-primary-dark text-white border border-white/10 shadow-lg"
                >
                    切换网络
                </Button>
            )
        });
    }
  }, [isConnected, chainId, toast]);

  const shippingMethod: ShippingMethod = useMemo(() =>
    product?.shippingMethod === 'Seller Pays' ? 'Seller Pays' : selectedShippingOption,
    [product, selectedShippingOption]
  );

  const shippingFee = useMemo(() => SHIPPING_FEES[shippingMethod], [shippingMethod]);
  const totalAmount = useMemo(() => (product?.price || 0) + shippingFee, [product, shippingFee]); 

  // --- USDT 授权处理函数 ---
  const handleApproveUSDT = async () => {
    if (!amountToApprove || parseFloat(amountToApprove) <= 0) {
        toast({ variant: 'destructive', title: 'INVALID_AMOUNT', description: '请输入一个有效的授权金额。' });
        return;
    }
    if (usdtDecimals === null) {
        toast({ variant: 'destructive', title: 'DECIMALS_UNKNOWN', description: 'USDT 小数位未加载。' });
        return;
    }

    try {
        const amountInWei = parseUnits(amountToApprove, usdtDecimals);
        const success = await approveUSDT(amountInWei);
        if (success) {
            toast({ title: '授权成功', description: `已成功授权 ${amountToApprove} ${usdtSymbol || 'USDT'}。` });
            setIsApproveDialogOpen(false);
            setAmountToApprove('');
        } else if (!approvalError || approvalError === 'User rejected the transaction.') {
        } else {
            toast({ variant: 'destructive', title: '授权失败', description: approvalError || 'USDT 授权失败。' });
        }
    } catch (error: any) {
        console.error('USDT 授权错误:', error);
        toast({ variant: 'destructive', title: '授权错误', description: error.message || 'USDT 授权时发生意外错误。' });
    }
  };
  // --- End USDT 授权处理函数 ---


  // ✅ 核心支付逻辑 - 使用新的 Hooks 重构
  const handleConfirmPurchase = async () => {
    if (!firestore || !user || !product || !selectedAddressId || !paymentMethod) {
      toast({ variant: "destructive", title: "信息不完整", description: "请选择收货地址或刷新页面重试。" });
      return;
    }

    if (!isConnected || !address) {
        toast({ variant: "destructive", title: "钱包未连接", description: "请先连接您的 Web3 钱包。" });
        await getEthersSigner(); 
        return;
    }

    if (chainId !== REQUIRED_CHAIN_ID) {
        toast({ variant: "destructive", title: "网络错误", description: `请切换到 Base 主网 (Chain ID: ${REQUIRED_CHAIN_ID})。` });
        await connectToChain(REQUIRED_CHAIN_ID); 
        return;
    }

    // 🚨 战略拦截：法币支付暂停，强制 USDT
    if (paymentMethod !== 'USDT') {
      toast({ 
        variant: "destructive", 
        title: "法币通道维护中", 
        description: "因金融合规要求，法币支付暂时关闭，请使用 USDT 进行真实测试。" 
      });
      return;
    }

    const sellerWalletAddress = sellerProfile?.walletAddress;
    if (!sellerWalletAddress) {
        toast({ variant: "destructive", title: "无法执行交易", description: "卖家尚未配置 Web3 收款地址，无法锁仓。" });
        return;
    }

    // --- 确保产品有 escrowOrderId ---
    if (!product.escrowOrderId) {
        toast({ variant: "destructive", title: "订单协议未初始化", description: "商品尚未在智能合约中创建订单。请联系卖家或稍后重试。" });
        return;
    }

    // --- USDT 相关检查 ---
    if (isUSDTDataLoading || usdtDataError || usdtBalance === null || usdtAllowance === null || usdtDecimals === null) {
        toast({ variant: "destructive", title: "USDT 数据加载中", description: "请稍候，USDT 余额和授权信息正在加载。" });
        refetchUSDTData(); 
        return;
    }

    const amountInUnits = parseUnits(totalAmount.toString(), usdtDecimals); 

    if (usdtBalance < amountInUnits) {
        toast({ variant: "destructive", title: "USDT 余额不足", description: `您的 USDT 余额为 ${parseFloat(formatUnits(usdtBalance, usdtDecimals)).toFixed(2)}，不足以支付 ${totalAmount} ${usdtSymbol || 'USDT'}。` });
        return;
    }

    if (usdtAllowance < amountInUnits) {
        toast({ variant: "destructive", title: "授权额度不足", description: `请授权 Luna 托管合约至少 ${totalAmount} ${usdtSymbol || 'USDT'}。` });
        setIsApproveDialogOpen(true); 
        return;
    }
    // --- End USDT 相关检查 ---


    setIsProcessing(true);
    setProgress(10);
    toast({ title: "🚀 启动 Web3 交易协议", description: "正在与智能合约建立安全连接，准备锁定 USDT..." });

    try {
      // STEP 1: 链上锁仓 (Lock Funds) - 使用 useEscrowContract Hook
      setProgress(30);
      toast({ title: "🔒 链上资金锁定中", description: "步骤 1/1：请在您的钱包中确认交易，将 USDT 安全锁定至 Luna 托管合约..." });
      
      const lockResult = await lockFunds(product.escrowOrderId);

      if (!lockResult.success) {
          throw new Error(lockResult.error || escrowInteractionError || "链上锁仓失败，请检查 Gas 或余额。");
      }

      // STEP 2: 只有链上成功后，才写 Firebase
      setProgress(90);
      const address = addresses?.find(a => a.id === selectedAddressId);
      if (!address) {
          throw new Error("收货地址未找到。");
      }
      const { id: addrId, isDefault, ...shippingAddress } = address; 

      const orderData = {
        productId: product.id,
        productName: product.name,
        buyerId: user.uid,
        sellerId: product.sellerId,
        participants: [user.uid, product.sellerId],
        price: product.price,
        shippingFee,
        totalAmount,
        currency: 'USDT',
        status: 'paid', 
        escrowOrderId: product.escrowOrderId, 
        txHash: lockResult.hash || 'N/A', 
        createdAt: serverTimestamp(),
        shippingAddress,
        shippingMethod,
        paymentMethod: 'USDT',
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
      await updateDoc(doc(firestore, 'products', product.id), { status: 'sold' });

      setProgress(100);
      toast({ title: "✅ 协议执行成功", description: "资金已安全锁定至智能合约，订单已创建。您现在可以等待卖家发货。" });
    } catch (error: any) {
        console.error('Checkout error:', error);
        toast({ 
            variant: 'destructive', 
            title: '支付失败', 
            description: error.message || '支付过程中发生错误，请稍后重试。' 
        });
    } finally {
        setIsProcessing(false);
    }
  };

  // 加载状态
  if (loadingProduct || userLoading || addressesLoading || loadingSeller) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 md:p-10">
        <div className="space-y-6">
          <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
              <div className="h-48 bg-white/5 rounded-2xl animate-pulse" />
            </div>
            <div className="h-96 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 产品不存在
  if (!product) {
    notFound();
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Secure Checkout</h1>
          <p className="text-white/60">Complete your purchase securely with USDT</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-xs font-bold">
          <ShieldCheck className="w-4 h-4" /> Escrow Protected
        </div>
      </div>

      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：表单 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 产品信息 */}
          <Card className="bg-[#130812]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Product</h2>
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-white/5 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-white/40" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{product.name}</h3>
                <p className="text-white/60 text-sm mt-1">{product.description || 'No description'}</p>
                <p className="text-2xl font-black text-primary mt-2">${product.price.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          {/* 收货地址 */}
          <Card className="bg-[#130812]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Shipping Address</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddressDialogOpen(true)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <Edit className="w-4 h-4 mr-2" />
                {addresses?.length ? 'Change' : 'Add'}
              </Button>
            </div>
            
            {addresses && addresses.length > 0 ? (
              <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      selectedAddressId === addr.id
                        ? "border-primary bg-primary/5"
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    <RadioGroupItem value={addr.id} id={addr.id} />
                    <Label htmlFor={addr.id} className="flex-1 cursor-pointer">
                      <p className="font-bold text-white">{addr.fullName}</p>
                      <p className="text-white/60 text-sm">{addr.street}</p>
                      <p className="text-white/60 text-sm">{addr.city}, {addr.state} {addr.postalCode}</p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-xl">
                <MapPin className="w-12 h-12 text-white/20 mx-auto mb-2" />
                <p className="text-white/60 mb-4">No addresses found</p>
                <Button onClick={() => setIsAddressDialogOpen(true)}>Add Address</Button>
              </div>
            )}
          </Card>

          {/* 运输方式 */}
          <Card className="bg-[#130812]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Shipping Method</h2>
            <RadioGroup value={selectedShippingOption} onValueChange={(v: ShippingMethodOption) => setSelectedShippingOption(v)}>
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer",
                selectedShippingOption === 'Buyer Pays' ? "border-primary bg-primary/5" : "border-white/10"
              )}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="Buyer Pays" id="buyer-pays" />
                  <Label htmlFor="buyer-pays" className="cursor-pointer">
                    <p className="font-bold text-white">Standard Shipping</p>
                    <p className="text-white/60 text-sm">Buyer pays shipping</p>
                  </Label>
                </div>
                <p className="text-xl font-black text-white">${SHIPPING_FEES['Buyer Pays']}</p>
              </div>
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer mt-3",
                selectedShippingOption === 'In-person' ? "border-primary bg-primary/5" : "border-white/10"
              )}>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="In-person" id="in-person" />
                  <Label htmlFor="in-person" className="cursor-pointer">
                    <p className="font-bold text-white">In-person Pickup</p>
                    <p className="text-white/60 text-sm">Meet with seller</p>
                  </Label>
                </div>
                <p className="text-xl font-black text-white">FREE</p>
              </div>
            </RadioGroup>
          </Card>
        </div>

        {/* 右侧：订单摘要 */}
        <div>
          <Card className="bg-[#130812]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sticky top-8">
            <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-white/60">Product</span>
                <span className="text-white font-bold">${product.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Shipping</span>
                <span className="text-white font-bold">
                  {shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white text-lg font-bold">Total</span>
                  <span className="text-2xl font-black text-white">${totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">In USDT</span>
                  <span className="text-primary font-bold">{totalAmount.toFixed(2)} USDT</span>
                </div>
              </div>
            </div>

            {/* 进度条 */}
            {isProcessing && (
              <div className="mb-6">
                <Progress value={progress} className="h-2" />
                <p className="text-white/60 text-sm mt-2 text-center">{progress}%</p>
              </div>
            )}

            {/* 支付按钮 */}
            <Button
              onClick={handleConfirmPurchase}
              disabled={isProcessing || !selectedAddressId || !isConnected}
              className="w-full py-6 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Confirm Purchase
                </>
              )}
            </Button>

            {/* 安全提示 */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-bold text-sm mb-1">Escrow Protected</p>
                  <p className="text-white/60 text-xs">Your funds are secured in smart contract until delivery</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* 地址对话框 */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#0a0a0f] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Add Shipping Address</DialogTitle>
          </DialogHeader>
          <AddressForm
            onSuccess={() => setIsAddressDialogOpen(false)}
            onCancel={() => setIsAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* USDT授权对话框 */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md bg-[#0a0a0f] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Approve USDT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-white/60 text-sm">Allow Luna to spend your USDT for this purchase</p>
            <Input
              type="number"
              value={amountToApprove}
              onChange={(e) => setAmountToApprove(e.target.value)}
              placeholder={totalAmount.toFixed(2)}
              className="bg-white/10 border-white/20 text-white"
            />
            <Button
              onClick={handleApproveUSDT}
              disabled={isApproving}
              className="w-full"
            >
              {isApproving ? 'Approving...' : 'Approve USDT'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}