'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, notFound, useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import type { Product, UserAddress, UserProfile, PaymentMethod } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { collection, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

// ✅ Web3 核心引入
import { ethers } from 'ethers';
import { escrowContractAddress, usdtContractAddress, escrowContractABI, IERC20ABI } from '@/lib/web3/config';

import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Edit, Loader2, MapPin, ShieldCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress"; 
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddressForm } from '@/components/address-form';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethodButton } from '@/components/payment-method-button';

const SHIPPING_FEES = {
  'Seller Pays': 0,
  'Buyer Pays': 150,
  'In-person': 0,
};

type ShippingMethod = 'Seller Pays' | 'Buyer Pays' | 'In-person';
type ShippingMethodOption = 'Buyer Pays' | 'In-person';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const id = params.id as string;
  const productRef = useMemo(() => (firestore && id ? doc(firestore, 'products', id) : null), [firestore, id]);
  const { data: product, loading: loadingProduct } = useDoc<Product>(productRef);
  const { data: sellerProfile, loading: loadingSeller } = useDoc<UserProfile>(
    firestore && product?.sellerId ? doc(firestore, 'users', product.sellerId) : null
  );

  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingMethodOption>('Buyer Pays');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>('USDT'); // 預設強制為 USDT
  const [progress, setProgress] = useState(0);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      const timer = setTimeout(() => setProgress(p => p + 1), 50);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const shippingMethod: ShippingMethod = useMemo(() => 
    product?.shippingMethod === 'Seller Pays' ? 'Seller Pays' : selectedShippingOption, 
    [product, selectedShippingOption]
  );

  const shippingFee = useMemo(() => SHIPPING_FEES[shippingMethod], [shippingMethod]);
  const totalAmount = useMemo(() => (product?.price || 0) + shippingFee, [product, shippingFee]);

  // ✅ 核心支付攔截邏輯
  const handleConfirmPurchase = async () => {
    if (!firestore || !user || !product || !selectedAddressId || !paymentMethod) {
      toast({ variant: "destructive", title: "信息不完整", description: "請選擇收貨地址。" });
      return;
    }

    // 🚨 戰略攔截：法幣支付暫停
    if (paymentMethod !== 'USDT') {
      toast({ 
        variant: "destructive", 
        title: "法幣通道維護中", 
        description: "因金融合規要求，法幣支付暫時關閉，請使用 USDT 進行真實測試。" 
      });
      return;
    }

    const sellerWalletAddress = sellerProfile?.walletAddress || product.seller?.walletAddress;
    if (!sellerWalletAddress) {
        toast({ variant: "destructive", title: "無法執行交易", description: "賣家尚未配置 Web3 收款地址，無法鎖倉。" });
        return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      if (!window.ethereum) throw new Error("請先安裝 MetaMask 錢包！");
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const usdtContract = new ethers.Contract(usdtContractAddress, IERC20ABI, signer);
      const escrowContract = new ethers.Contract(escrowContractAddress, escrowContractABI, signer);
      
      // USDT 6 位精度
      const amountInUnits = ethers.parseUnits(totalAmount.toString(), 6);

      // STEP 1: 鏈上授權 (Approve)
      setProgress(30);
      toast({ title: "Web3 授權中", description: "步驟 1/2：請在錢包中授權擔保合約使用 USDT..." });
      const approveTx = await usdtContract.approve(escrowContractAddress, amountInUnits);
      await approveTx.wait();

      // STEP 2: 鏈上鎖倉 (Deposit)
      setProgress(60);
      toast({ title: "鏈上鎖倉中", description: "步驟 2/2：請確認將資金轉入 Luna 智能合約擔保..." });
      
      const numericOrderId = Date.now(); // 絕對唯一的合約 ID
      const createTx = await escrowContract.createOrder(numericOrderId, sellerWalletAddress, amountInUnits);
      
      // 🚨 關鍵攔截：等待區塊鏈打包
      const receipt = await createTx.wait();
      
      if (receipt.status !== 1) throw new Error("鏈上交易失敗，請檢查 Gas 或餘額。");

      // STEP 3: 只有鏈上成功後，才寫入 Firebase
      setProgress(90);
      const address = addresses?.find(a => a.id === selectedAddressId);
      const { id: addrId, isDefault, ...shippingAddress } = address!;

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
        status: 'paid', // 已通過鏈上校驗，狀態設為已支付
        txHash: receipt.hash,
        numericOrderId: numericOrderId,
        createdAt: serverTimestamp(),
        shippingAddress,
        shippingMethod,
        paymentMethod: 'USDT',
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
      await updateDoc(doc(firestore, 'products', product.id), { status: 'sold' });

      setProgress(100);
      toast({ title: "Protocol 執行成功", description: "資金已進入智能合約擔保，請等待賣家發貨。" });
      router.push(`/account/purchases/${orderRef.id}`);

    } catch (e: any) {
      console.error("Web3 Error:", e);
      toast({
        variant: "destructive",
        title: "Protocol 拒絕交易",
        description: e.reason || e.message || "您取消了簽名或餘額不足"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  if (loadingProduct || userLoading || addressesLoading || loadingSeller) return <div className="h-screen flex items-center justify-center bg-black text-primary animate-pulse font-mono tracking-[0.5em] uppercase text-xs">Synchronizing Luna Protocol...</div>;
  if (!product || !user) return notFound();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-primary selection:text-black">
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="sm:max-w-2xl bg-[#09090B] border-white/10 text-white rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-wider text-primary">Delivery Target</DialogTitle>
            <DialogDescription className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Update your physical endpoint.</DialogDescription>
          </DialogHeader>
          <AddressForm userId={user.uid} addressId={editingAddressId} onSave={() => setIsAddressDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      <PageHeaderWithBackAndClose />
      
      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-24">
        <div className="flex items-center gap-4 mb-12">
            <div className="w-1.5 h-10 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter">Settlement Protocol</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* 左側：地址與支付方式 */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* 1. 地址選擇 */}
            <section className="space-y-4">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">01. Delivery Endpoint</h2>
                    <Button variant="link" onClick={() => { setEditingAddressId(null); setIsAddressDialogOpen(true); }} className="text-primary p-0 h-auto text-[10px] font-black uppercase tracking-widest">Add New Endpoint +</Button>
                </div>
                
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="grid grid-cols-1 gap-4">
                  {addresses?.map(address => (
                    <Label 
                        key={address.id} 
                        htmlFor={address.id} 
                        className={cn(
                            "group relative flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                            selectedAddressId === address.id 
                                ? "bg-primary/5 border-primary shadow-[0_0_30px_rgba(var(--primary),0.1)]" 
                                : "bg-white/[0.02] border-white/5 hover:border-white/20"
                        )}
                    >
                      <div className="flex items-center gap-5 relative z-10">
                        <RadioGroupItem value={address.id} id={address.id} className="border-white/20 text-primary" />
                        <div>
                            <p className="font-bold text-white text-base">{address.recipientName} <span className="ml-2 text-[11px] font-mono text-white/30 uppercase tracking-widest">{address.phone}</span></p>
                            <p className="text-xs text-white/40 font-mono mt-1">{address.addressLine1}, {address.city}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingAddressId(address.id); setIsAddressDialogOpen(true); }} className="relative z-10 opacity-0 group-hover:opacity-100 text-white/20 hover:text-primary transition-all">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {selectedAddressId === address.id && <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full" />}
                    </Label>
                  ))}
                </RadioGroup>
            </section>

            {/* 2. 支付方式 (法幣凍結展示) */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">02. Asset Bridge</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <PaymentMethodButton 
                        method="USDT" 
                        label="USDT (TRC20/BASE)" 
                        className={cn("rounded-2xl border-2 transition-all", paymentMethod === 'USDT' ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.2)]" : "border-white/5 opacity-50")}
                        onClick={() => setPaymentMethod('USDT')}
                    />
                    {['Alipay', 'WeChat', 'THB'].map((m) => (
                        <div key={m} className="relative group grayscale cursor-not-allowed">
                             <PaymentMethodButton 
                                method={m as any} 
                                label={m} 
                                className="w-full rounded-2xl border border-white/5 bg-white/[0.02] opacity-20"
                                disabled
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black border border-white/10 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-primary shadow-2xl">Licensing...</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
          </div>

          {/* 右側：結算卡片 */}
          <div className="lg:col-span-5">
            <Card className="bg-gradient-to-b from-[#130812] to-black border border-white/10 rounded-[2.5rem] p-8 shadow-2xl sticky top-24 overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000"><ShieldCheck className="w-48 h-48 text-primary" /></div>
              
              <div className="relative z-10 space-y-8">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 text-center">Protocol Summation</p>
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-black italic tracking-tighter text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.4)]">{totalAmount.toLocaleString()}</span>
                        <span className="text-sm font-mono text-primary/60 uppercase">USDT</span>
                    </div>
                </div>

                <div className="space-y-4 bg-white/[0.03] rounded-2xl p-6 border border-white/5 font-mono text-[10px] uppercase tracking-widest">
                    <div className="flex justify-between">
                        <span className="text-white/40">Base Asset</span>
                        <span className="text-white/80">{product.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Network Fee</span>
                        <span className="text-white/80">{shippingFee}</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between text-primary font-black">
                        <span>Grand Total</span>
                        <span>{totalAmount.toLocaleString()} USDT</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <Button 
                        onClick={handleConfirmPurchase} 
                        disabled={isProcessing || !selectedAddressId}
                        className="w-full h-16 bg-primary text-black font-black uppercase tracking-[0.2em] italic rounded-2xl shadow-[0_10px_40px_rgba(var(--primary),0.3)] hover:scale-[1.02] active:scale-95 transition-all text-base"
                    >
                        {isProcessing ? (
                            <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> Executing Transaction...</span>
                        ) : (
                            <span className="flex items-center gap-3"><ShieldCheck className="w-5 h-5" /> Execute Payment</span>
                        )}
                    </Button>
                    
                    {isProcessing && (
                        <div className="space-y-2 animate-in fade-in zoom-in-95 duration-500">
                             <Progress value={progress} className="h-1.5 bg-white/10 [&>div]:bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" />
                             <p className="text-center text-[9px] font-mono text-primary animate-pulse tracking-widest uppercase">Waiting for Block Confirmation...</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    <p className="text-[9px] leading-relaxed text-blue-400/70 font-mono">
                        Funds will be locked in the LUNA Escrow Smart Contract. The seller will only receive funds after you confirm delivery.
                    </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}