'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, Copy, CheckCircle, Clock, AlertCircle,
  ArrowLeft, Home, Loader2, Shield, Zap, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// 🚀 新增引入：用于前端直接处理数据类型转换
import { ethers } from 'ethers'; 

import { useEscrowContract } from '@/hooks/useEscrowContract';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';

const ChatWindow = dynamic(
  async () => {
    const mod = await import('@/components/chat/ChatWindow');
    return mod.default || mod.ChatWindow || (mod as any);
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-black/40 rounded-[40px] animate-pulse text-xs text-white/30 font-mono tracking-[0.2em] border border-white/5">
        INITIALIZING SECURE CHAT...
      </div>
    ),
  }
);

interface Order {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  buyerId: string;
  sellerId: string;
  paymentMethod: string;
  status: string;
  createdAt: any;
  escrowOrderId?: string;
}

const REQUIRED_CHAIN_ID = 84532; // Base Sepolia 测试网

export default function ClientCheckout() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  // ✅ 修改：直接解构出底层的 createOrder
  const { createOrder, isInteracting: isContractLoading } = useEscrowContract();
  const { isConnected, chainId } = useUSDTBalanceAndAllowance();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [txHash, setTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWeb3Processing, setIsWeb3Processing] = useState(false);
  const [copied, setCopied] = useState(false);

  const orderId = params.id as string;
  
  // 测试用的 ETH 接收地址（作为卖家的备用地址，防止合约报 ZeroAddress 错）
  const ETH_BACKUP_ADDRESS = '0x84000F9F8fB788Eb17de295fC135e9C903b8681a'; 

  useEffect(() => {
    if (!firestore || !orderId || !user) return;
    const loadOrder = async () => {
      try {
        const orderDoc = await getDoc(doc(firestore, 'orders', orderId));
        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
          if (orderData.buyerId !== user.uid) { router.push('/'); return; }
          setOrder(orderData);
        }
      } catch (error) { console.error("Protocol Fetch Error:", error); } 
      finally { setIsLoading(false); }
    };
    loadOrder();
  }, [firestore, orderId, user, router]);

  const handleWeb3Pay = async () => {
    if (!order || !firestore) return;

    setIsWeb3Processing(true);
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("No crypto wallet found. Please install MetaMask or Zalien.");

      // 1. 检查并强制请求连接
      if (!isConnected) {
        toast({ title: "AUTHORIZATION_PENDING", description: "请在钱包中允许连接此站点..." });
        await ethereum.request({ method: 'eth_requestAccounts' });
        toast({ title: "连接成功", description: "网站已授权，请再次点击执行合约按钮。" });
        setIsWeb3Processing(false);
        return;
      }

      // 2. 自动切换到 Base Sepolia
      if (Number(chainId) !== REQUIRED_CHAIN_ID) {
        toast({ title: "正在请求切换网络", description: "正在同步至 Base Sepolia 节点..." });
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
             await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${REQUIRED_CHAIN_ID.toString(16)}`,
                  chainName: 'Base Sepolia',
                  rpcUrls: ['https://sepolia.base.org'],
                  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.basescan.org'],
                }],
             });
          } else { throw switchError; }
        }
        setIsWeb3Processing(false);
        return; 
      }

      // ✅ 核心修复 1：将包含字母的 Firebase ID 哈希转换为纯数字，满足合约 uint256 的要求
      const rawId = order.escrowOrderId || order.id;
      let numericId = rawId;
      if (!/^\d+$/.test(rawId)) {
        numericId = ethers.toBigInt(ethers.id(rawId)).toString();
      }

      toast({ title: "🚀 启动原生 ETH 结算协议", description: "请在钱包中签名确认锁仓..." });
      
      // ✅ 核心修复 2：严格绕开 lockFunds，直接使用底层的 createOrder
      // 按照绝对正确的顺序传入：(订单ID, 卖家地址, 支付金额)
      const result = await createOrder(numericId, ETH_BACKUP_ADDRESS, order.price.toString());

      if (result && result.hash) {
        await updateDoc(doc(firestore, 'orders', orderId), {
          status: 'paid',
          txHash: result.hash,
          updatedAt: serverTimestamp()
        });
        toast({ title: 'PROTOCOL_EXECUTED', description: 'ETH 已安全进入 Base 网络锁仓。' });
        router.push(`/account/purchases/${orderId}`);
      }
    } catch (error: any) {
      console.error("Payment Execution Error:", error);
      toast({ title: 'EXECUTION_FAILED', description: error.message || "用户拒绝了签名", variant: 'destructive' });
    } finally {
      setIsWeb3Processing(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(ETH_BACKUP_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitManualPayment = async () => {
    if (!txHash.trim() || !firestore || !orderId) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(firestore, 'orders', orderId), {
        status: 'payment_submitted',
        txHash: txHash.trim(),
        updatedAt: serverTimestamp()
      });
      router.push(`/account/purchases/${orderId}`);
    } catch (error) { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!order) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0f051a] to-black pb-20 selection:bg-primary/30 flex flex-col">
      
      <nav className="sticky top-0 z-50 w-full bg-black/40 backdrop-blur-xl border-b border-white/10 h-16 shrink-0">
        <div className="w-full h-full flex items-center justify-between px-6 md:px-10">
          <Button variant="ghost" onClick={() => router.back()} className="text-white/70 hover:text-white font-black italic tracking-tighter transition-all hover:-translate-x-1">
            <ArrowLeft className="h-4 w-4 mr-2" /> BACK
          </Button>
          <div className="hidden lg:flex items-center gap-4">
            <span className="text-[10px] text-white/10 font-mono tracking-[1em] uppercase">LUNA_PAYMENT_SYSTEM</span>
          </div>
          <Button variant="ghost" onClick={() => router.push('/')} className="text-white/70 hover:text-white font-black italic tracking-tighter transition-all hover:translate-x-1">
            HOME <Home className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-7xl relative flex-1">
        <div className="text-center mb-16 space-y-4 animate-in fade-in duration-1000">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            Complete Payment
          </h1>
          <p className="text-white/30 font-mono text-[10px] uppercase tracking-[0.5em]">Waiting for Protocol Authorization...</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            
            <Card className="relative overflow-hidden border-primary/40 bg-primary/5 p-10 backdrop-blur-md rounded-[40px] border shadow-2xl group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-all duration-700">
                <Zap className="h-32 w-32 text-primary" />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-white italic mb-4 flex items-center gap-3">
                  <Zap className="h-8 w-8 text-primary animate-pulse" />
                  NATIVE ETH ESCROW
                </h2>
                <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-md">
                   使用 Base Sepolia 原生代币 (ETH) 执行锁仓协议。您的资金将安全保留在合约中，直到确认收货。
                </p>
                <Button 
                  onClick={handleWeb3Pay}
                  disabled={isWeb3Processing || isContractLoading}
                  className="w-full h-20 bg-gradient-to-r from-primary to-[#8b5cf6] text-black font-black uppercase italic tracking-[0.3em] shadow-[0_0_50px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all rounded-3xl text-xl"
                >
                  {isWeb3Processing || isContractLoading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <Wallet className="mr-3 h-6 w-6" />}
                  {isWeb3Processing || isContractLoading ? "SYNCING..." : "PAY WITH ETH"}
                </Button>
              </div>
            </Card>

            <Card className="bg-black/40 border-white/10 p-8 rounded-[40px] border backdrop-blur-sm shadow-xl">
              <h2 className="text-lg font-bold text-white/50 mb-8 flex items-center gap-2 italic uppercase tracking-widest">
                <Shield className="h-4 w-4" /> Manual Gateway
              </h2>
              <div className="space-y-8">
                <div className="flex gap-6 items-start">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black italic shrink-0">01</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mb-2 font-mono">Receiver (BASE ETH)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-white font-mono text-[10px] sm:text-xs break-all bg-black/60 p-4 rounded-2xl border border-white/5">
                        {ETH_BACKUP_ADDRESS}
                      </code>
                      <Button variant="outline" size="icon" onClick={handleCopyAddress} className="h-14 w-14 rounded-2xl border-white/10 hover:bg-white/5 shrink-0">
                        {copied ? <CheckCircle className="text-green-400" /> : <Copy className="h-5 w-5 text-white/40" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 items-start">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black italic shrink-0">02</div>
                  <div className="flex-1 space-y-4">
                    <Input
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="Paste Transaction Hash (TxID)"
                      className="bg-black/60 border-white/10 text-white h-16 rounded-2xl font-mono focus:ring-primary/50"
                    />
                    <Button
                      onClick={handleSubmitManualPayment}
                      disabled={isSubmitting || !txHash.trim()}
                      className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl font-bold uppercase tracking-widest text-xs transition-colors"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : "Verify Hash"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-8 h-full">
            <Card className="bg-black/60 border-white/10 p-6 rounded-[40px] shadow-2xl border backdrop-blur-md shrink-0">
              <div className="flex flex-col gap-6">
                <div className="relative aspect-square rounded-[32px] overflow-hidden border border-white/10">
                  {order.productImage ? (
                    <img src={order.productImage} className="object-cover w-full h-full transition-transform duration-700 hover:scale-110" alt="Product" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center font-mono text-white/10">NO_IMAGE</div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-white text-lg line-clamp-2 uppercase italic leading-tight">{order.productName}</h3>
                  <p className="text-3xl font-black text-primary italic">{order.price} ETH</p>
                </div>
                <div className="pt-6 border-t border-white/5 space-y-4 font-mono text-[10px] uppercase tracking-[0.2em]">
                   <div className="flex justify-between"><span className="text-white/20">Protocol</span><span className="text-white">BASE_NATIVE_ETH</span></div>
                   <div className="flex justify-between"><span className="text-white/20">Status</span><span className="text-yellow-500 animate-pulse">Awaiting Signal</span></div>
                </div>
              </div>
            </Card>

            <Card className="bg-[#080808]/90 border-white/10 rounded-[40px] shadow-2xl border backdrop-blur-md flex-1 flex flex-col overflow-hidden h-[600px] min-h-[500px]">
               <div className="p-6 border-b border-white/5 bg-white/5 shrink-0 flex items-center justify-between">
                 <h3 className="text-xs font-black italic text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                   <MessageSquare className="w-4 h-4" /> Order Chat
                 </h3>
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               </div>
               
               <div className="flex-1 relative overflow-hidden bg-black/40">
                 <ChatWindow 
                   orderId={order.id} 
                   sellerId={order.sellerId} 
                   buyerId={order.buyerId} 
                 />
               </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}