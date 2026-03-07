'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import type { Product, UserAddress, UserProfile, PaymentMethod } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { collection, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

// ✅ Web3 核心引入 - 保持你原有的 Hooks 和 Provider
import { ethers, formatUnits, parseUnits, BigNumberish } from 'ethers';
import { getEthersSigner } from '@/lib/web3-provider';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useUSDTApprove } from '@/hooks/useUSDTApprove';
import { useEscrowContract, TransactionStatus } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';

// ✅ 接入后台开关控制
import { usePaymentMethods } from '@/hooks/use-payment-methods';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Edit, Loader2, MapPin, ShieldCheck, AlertCircle, ShoppingCart, Ban, CreditCard, Globe, Cpu, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress"; 
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AddressForm } from '@/components/address-form';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethodButton } from '@/components/payment-method-button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

const SHIPPING_FEES = {
  'Seller Pays': 0,
  'Buyer Pays': 150,
  'In-person': 0,
};

type ShippingMethod = 'Seller Pays' | 'Buyer Pays' | 'In-person';
type ShippingMethodOption = 'Buyer Pays' | 'In-person';

const REQUIRED_CHAIN_ID = 84532;

// 🌌 赛博高奢增强样式 (完全保留)
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
                <DialogContent className="max-w-xs bg-black/95 border-white/10 text-white"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><div className="relative aspect-square w-full">
                  <img src={qrUrl} alt={`${label} QR Code`} className="object-contain rounded-md w-full h-full" />
                </div></DialogContent>
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
  
  const { methods, loading: methodsLoading } = usePaymentMethods();

  const id = params.id as string;
  const productRef = useMemo(() => (firestore && id ? doc(firestore, 'products', id) : null), [firestore, id]);
  const { data: product, loading: loadingProduct } = useDoc<any>(productRef);
  const { data: sellerProfile, loading: loadingSeller } = useDoc<any>(
    firestore && product?.sellerId ? doc(firestore, 'users', product.sellerId) : null
  );

  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingMethodOption>('Buyer Pays');
  const [paymentMethod, setPaymentMethod] = useState<any>('ETH'); 
  const [progress, setProgress] = useState(0);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false); 
  const [amountToApprove, setAmountToApprove] = useState<string>(''); 

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
  const { isInteracting: isEscrowInteracting, interactionError: escrowInteractionError, lockFunds } = useEscrowContract();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const addressesCollectionQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'addresses');
  }, [firestore, user]);

  const { data: addresses, loading: addressesLoading } = useCollection<any>(addressesCollectionQuery);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>();
  
  useEffect(() => {
    if (addresses) {
      const defaultAddress = addresses.find((a: any) => a.isDefault);
      setSelectedAddressId(defaultAddress?.id || addresses[0]?.id);
    }
  }, [addresses]);

  useEffect(() => {
    if (progress < 90 && isProcessing) { 
      const timer = setTimeout(() => setProgress(p => p + 1), 50);
      return () => clearTimeout(timer);
    }
  }, [progress, isProcessing]);

  useEffect(() => {
    if (isConnected && chainId != null) {
        // 🚀 核心修复：强制转为字符串，彻底消除 startsWith on never 的报错
        const chainIdStr = String(chainId); 
        const currentId = chainIdStr.startsWith('0x') ? parseInt(chainIdStr, 16) : Number(chainIdStr);
        if (currentId !== REQUIRED_CHAIN_ID) {
            toast({
                variant: "destructive",
                title: "CHAIN_MISMATCH",
                description: `请切换到 Base Testnet (ID: ${REQUIRED_CHAIN_ID})。`,
                action: <Button onClick={() => connectToChain(REQUIRED_CHAIN_ID, toast)} className="bg-primary text-white">切换网络</Button>
            });
        }
    }
  }, [isConnected, chainId, toast]);

  const shippingMethod: ShippingMethod = useMemo(() =>
    (product as any)?.shippingMethod === 'Seller Pays' ? 'Seller Pays' : selectedShippingOption,
    [product, selectedShippingOption]
  );

  const shippingFee = useMemo(() => SHIPPING_FEES[shippingMethod], [shippingMethod]);
  const totalAmount = useMemo(() => (product?.price || 0) + shippingFee, [product, shippingFee]); 

  const handleApproveUSDT = async () => {
    if (!amountToApprove) return;
    try {
        const amountInWei = parseUnits(amountToApprove, usdtDecimals || 18);
        const success = await approveUSDT(amountInWei);
        if (success) {
            toast({ title: '授权成功' });
            setIsApproveDialogOpen(false);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: '授权失败', description: error.message });
    }
  };

  const handleConfirmPurchase = async () => {
    if (!firestore || !user || !product || !selectedAddressId) {
      toast({ variant: "destructive", title: "信息不完整" });
      return;
    }

    if (!methods.usdt) {
      toast({ variant: "destructive", title: "通道维护", description: "ETH 支付通道当前不可用。" });
      return;
    }

    const sellerWalletAddress = (sellerProfile as any)?.walletAddress || (sellerProfile as any)?.ethAddress;
    const escrowId = (product as any)?.escrowOrderId;

    if (!sellerWalletAddress || !escrowId) {
        toast({ variant: "destructive", title: "配置错误", description: "卖家地址或订单协议未找到。" });
        return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      const lockResult = await lockFunds(escrowId, totalAmount.toString(), sellerWalletAddress);

      if (!lockResult?.success) {
          throw new Error(lockResult?.error || "链上交易失败");
      }

      setProgress(90);
      const addr = addresses?.find((a: any) => a.id === selectedAddressId);
      const { id: dummy, isDefault, ...shippingAddress } = addr as any; 

      const orderData = {
        productId: product.id,
        productName: product.name,
        buyerId: user.uid,
        sellerId: product.sellerId,
        participants: [user.uid, product.sellerId],
        price: product.price,
        shippingFee,
        totalAmount,
        currency: 'ETH',
        status: 'paid', 
        escrowOrderId: escrowId,
        txHash: lockResult.hash || 'N/A', 
        createdAt: serverTimestamp(),
        shippingAddress,
        shippingMethod,
        paymentMethod: 'ETH',
      };

      await addDoc(collection(firestore, 'orders'), orderData);
      await updateDoc(doc(firestore, 'products', product.id), { status: 'sold' });

      setProgress(100);
      toast({ title: "SUCCESS", description: "资产已锁定。正在返回..." });
      router.push('/account/purchases');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'ERROR', description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  if (loadingProduct || userLoading || addressesLoading || loadingSeller || methodsLoading || !mounted) {
    return <div className="h-[80vh] flex flex-col items-center justify-center text-primary"><Loader2 className="w-10 h-10 animate-spin" /><p className="font-mono mt-4 text-[10px] uppercase tracking-widest">INITIALIZING_SECURE_GATEWAY...</p></div>;
  }

  if (!product) notFound();

  return (
    <div className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden pb-32 font-sans selection:bg-primary/30 isolate">
      <style dangerouslySetInnerHTML={{ __html: intenseArtStyles }} />
      
      {/* 🌌 背景效果层 (完全找回) */}
      <div className="fluid-bg-container">
        <div className="cyber-grid" />
        <div className="fluid-entity astral-pink" />
        <div className="fluid-entity astral-cyan" />
      </div>

      <div className="fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-xl border-b border-white/5">
          <PageHeaderWithBackAndClose />
      </div>

      <main className="container mx-auto max-w-6xl px-4 pt-36 relative z-10 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        <div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase flex items-center gap-4">
                <div className="w-3 h-12 bg-primary rounded-full shadow-[0_0_25px_rgba(211,58,137,0.7)] animate-pulse" />
                Checkout Gateway
            </h1>
            <p className="text-[11px] font-mono text-white/30 tracking-[0.4em] uppercase mt-3 pl-8">SECURE_NODE: {product.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-12">
                {/* 产品详情卡片 (完全找回) */}
                <Card className="bg-[#080808]/80 backdrop-blur-3xl border-white/5 rounded-[48px] overflow-hidden shadow-2xl relative group border-b-primary/10">
                    <CardContent className="p-12 flex flex-col md:flex-row gap-12">
                        <div className="w-full md:w-48 h-48 rounded-[32px] overflow-hidden border border-white/10 relative shadow-2xl bg-white/5 flex items-center justify-center">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="Artifact" className="object-cover w-full h-full" />
                            ) : (
                              <ShoppingCart className="w-12 h-12 text-white/10" />
                            )}
                        </div>
                        <div className="flex-1 space-y-6 flex flex-col justify-center">
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight">{product.name}</h2>
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary font-mono text-[9px] font-black tracking-widest uppercase">Target Artifact</span>
                                <p className="text-white/40 font-mono text-xs tracking-[0.2em]">{product.id}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 地址节点卡片 (完全找回) */}
                <Card className="bg-[#080808]/90 backdrop-blur-3xl border-white/5 rounded-[48px] p-12 shadow-3xl">
                    <div className="flex items-center justify-between mb-10">
                      <h3 className="text-xl font-black italic text-white uppercase tracking-[0.3em] flex items-center gap-4">
                        <MapPin className="text-primary w-6 h-6" /> Delivery Node
                      </h3>
                      <Button variant="outline" size="sm" onClick={() => setIsAddressDialogOpen(true)} className="border-white/10 text-white hover:bg-white/10 font-black italic rounded-xl px-6 h-10 uppercase text-[10px]">
                        {addresses?.length ? 'MODIFY_NODE' : 'INIT_NODE'}
                      </Button>
                    </div>
                    {addresses && addresses.length > 0 ? (
                      <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="grid grid-cols-1 gap-6">
                        {addresses.map((addr: any) => (
                          <div key={addr.id} className={cn(
                            "flex items-start gap-6 p-8 rounded-[32px] border-2 transition-all cursor-pointer",
                            selectedAddressId === addr.id ? "border-primary bg-primary/5 shadow-[0_0_30px_rgba(236,72,153,0.15)]" : "border-white/5 hover:border-white/10 bg-white/[0.02]"
                          )}>
                            <RadioGroupItem value={addr.id} id={addr.id} className="mt-1" />
                            <Label htmlFor={addr.id} className="flex-1 cursor-pointer space-y-2">
                              <p className="font-black text-xl text-white uppercase tracking-tight">{addr.fullName || 'Authorized User'}</p>
                              <p className="text-white/50 text-sm font-mono">{addr.street}, {addr.city}</p>
                              <p className="text-white/30 text-[10px] font-mono uppercase tracking-[0.2em]">{addr.state} {addr.postalCode}</p>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[40px]">
                        <MapPin className="w-16 h-16 text-white/5 mx-auto mb-6" />
                        <Button onClick={() => setIsAddressDialogOpen(true)} className="bg-primary text-black font-black italic rounded-2xl px-12 h-14 uppercase shadow-xl">ADD_FIRST_NODE</Button>
                      </div>
                    )}
                </Card>

                {/* 运输协议 (完全找回) */}
                <Card className="bg-[#080808]/90 backdrop-blur-3xl border-white/5 rounded-[48px] p-12">
                   <h3 className="text-xl font-black italic text-white uppercase tracking-[0.3em] mb-10 border-l-4 border-primary pl-8">Logistics Protocol</h3>
                   <RadioGroup value={selectedShippingOption} onValueChange={(v: any) => setSelectedShippingOption(v)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={cn("p-8 rounded-[32px] border-2 transition-all cursor-pointer flex justify-between items-center group", selectedShippingOption === 'Buyer Pays' ? "border-primary bg-primary/5" : "border-white/5")}>
                        <div className="flex items-center gap-4">
                          <RadioGroupItem value="Buyer Pays" id="v1" />
                          <Label htmlFor="v1" className="cursor-pointer font-black text-white uppercase text-lg">Standard Express</Label>
                        </div>
                        <p className="font-black text-primary font-mono">150 THB</p>
                      </div>
                      <div className={cn("p-8 rounded-[32px] border-2 transition-all cursor-pointer flex justify-between items-center group", selectedShippingOption === 'In-person' ? "border-primary bg-primary/5" : "border-white/5")}>
                        <div className="flex items-center gap-4">
                          <RadioGroupItem value="In-person" id="v2" />
                          <Label htmlFor="v2" className="cursor-pointer font-black text-white uppercase text-lg">Local Meetup</Label>
                        </div>
                        <p className="font-black text-green-400 font-mono uppercase italic text-xs tracking-widest">Free Sync</p>
                      </div>
                   </RadioGroup>
                </Card>
            </div>

            {/* 右侧决策区 (完全找回并接通开关) */}
            <div className="space-y-8 sticky top-32">
                <Card className="bg-gradient-to-b from-[#111] to-[#050505] border border-primary/30 rounded-[48px] overflow-hidden shadow-[0_0_80px_rgba(211,58,137,0.15)] relative isolate">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                    <div className="p-12 space-y-10 relative z-10">
                        <div className="flex items-center justify-between border-b border-white/10 pb-8">
                            <span className="text-[11px] font-mono text-white/50 tracking-widest uppercase">Protocol Status</span>
                            <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black border border-blue-500/20 uppercase tracking-tighter">
                                <Globe className="w-3 h-3" /> Base Sepolia Active
                            </div>
                        </div>

                        <div className="space-y-6">
                          <InfoRow label="Artifact Value" value={`${product.price} ETH`} isMono />
                          <InfoRow label="Logistics Fee" value={shippingFee > 0 ? '150 THB' : 'FREE'} isMono />
                          <div className="pt-10 flex flex-col items-center gap-4">
                              <p className="text-[10px] font-mono text-white/40 tracking-[0.6em] uppercase">Total Locked Value</p>
                              <p className="text-7xl font-black text-white italic drop-shadow-[0_0_30px_rgba(211,58,137,0.6)]">{totalAmount} <span className="text-xl opacity-30 not-italic ml-2 uppercase font-mono">ETH</span></p>
                          </div>
                        </div>

                        {isProcessing && (
                          <div className="space-y-4">
                            <Progress value={progress} className="h-1 bg-white/5" />
                            <p className="text-center font-mono text-[9px] text-primary animate-pulse uppercase tracking-[0.4em]">{progress}% Transmitting_Protocol...</p>
                          </div>
                        )}

                        {/* ✅ 这里是关键的动态控制 */}
                        {methods.usdt ? (
                          <Button
                              onClick={handleConfirmPurchase}
                              disabled={isProcessing || !selectedAddressId || !isConnected}
                              className="w-full h-24 bg-primary hover:bg-primary/80 text-white rounded-[32px] font-black text-xl tracking-[0.2em] uppercase shadow-[0_20px_50px_-10px_rgba(211,58,137,0.7)] transition-all hover:-translate-y-2 active:scale-95 group relative overflow-hidden"
                          >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                              {isProcessing ? <Loader2 className="w-8 h-8 animate-spin" /> : <ShieldCheck className="w-8 h-8 mr-4" />}
                              {isProcessing ? 'SYNCHRONIZING...' : 'INITIATE LOCK'}
                          </Button>
                        ) : (
                          <div className="p-10 border-2 border-dashed border-white/10 rounded-[32px] bg-white/[0.02] text-center space-y-4 group">
                             <Ban className="w-10 h-10 text-white/10 mx-auto group-hover:text-red-500/40 transition-colors" />
                             <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] italic leading-relaxed">Protocol Status: Offline<br/>Gateway Under Maintenance</p>
                          </div>
                        )}

                        <div className="p-6 bg-primary/5 border border-primary/20 rounded-[28px] flex items-start gap-5">
                            <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-1" />
                            <p className="text-[10px] text-white/50 leading-relaxed font-mono uppercase tracking-widest">
                                Assets will be secured in the <span className="text-primary font-bold italic">Base_Escrow_Protocol</span>. Protocol release only upon verified receiver confirmation.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
      </main>

      {/* 弹窗组件 (完全找回) */}
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-2xl bg-black/95 border-white/10 text-white rounded-[40px] shadow-3xl p-0 overflow-hidden">
          <div className="p-12 bg-gradient-to-b from-white/5 to-transparent">
             <DialogHeader className="mb-10"><DialogTitle className="uppercase italic font-black text-3xl titanium-title tracking-tighter">Initialize_Node_Address</DialogTitle></DialogHeader>
             <AddressForm {...({ onSuccess: () => setIsAddressDialogOpen(false), onCancel: () => setIsAddressDialogOpen(false) } as any)} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-md bg-black/95 border-white/10 text-white rounded-[40px]">
          <DialogHeader><DialogTitle className="uppercase italic font-black titanium-title">Protocol_Approve</DialogTitle></DialogHeader>
          <div className="space-y-8 py-10 text-center">
            <p className="text-white/40 text-xs font-mono tracking-widest uppercase">Confirming ETH Engagement Protocol.</p>
            <Button onClick={handleApproveUSDT} className="w-full h-20 bg-primary text-black font-black uppercase italic rounded-3xl tracking-widest shadow-xl">Engage_Transaction</Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes shimmer { 100% { transform: translate(100%); } }
      `}</style>
    </div>
  );
}