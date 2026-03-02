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
  Wallet, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [txHash, setTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const orderId = params.id as string;

  // USDT收款地址（应该从后台设置读取）
  const USDT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const USDT_AMOUNT = order?.price || 0;

  // 加载订单信息
  useEffect(() => {
    if (!firestore || !orderId || !user) return;

    const loadOrder = async () => {
      try {
        const orderDoc = await getDoc(doc(firestore, 'orders', orderId));
        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order;
          
          // 验证是否是买家
          if (orderData.buyerId !== user.uid) {
            toast({
              title: 'Access denied',
              description: 'You are not authorized to view this order.',
              variant: 'destructive'
            });
            router.push('/');
            return;
          }

          // 验证订单状态
          if (orderData.status !== 'pending_payment') {
            toast({
              title: 'Order already processed',
              description: 'This order has already been paid or cancelled.',
            });
            router.push(`/account/purchases/${orderId}`);
            return;
          }

          setOrder(orderData);
        } else {
          toast({
            title: 'Order not found',
            description: 'This order does not exist.',
            variant: 'destructive'
          });
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading order:', error);
        toast({
          title: 'Error',
          description: 'Failed to load order details.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [firestore, orderId, user, router, toast]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(USDT_ADDRESS);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: 'USDT address copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitPayment = async () => {
    if (!txHash.trim()) {
      toast({
        title: 'Transaction hash required',
        description: 'Please enter your transaction hash.',
        variant: 'destructive'
      });
      return;
    }

    if (!firestore || !orderId) return;

    setIsSubmitting(true);

    try {
      // 更新订单状态
      await updateDoc(doc(firestore, 'orders', orderId), {
        status: 'payment_submitted',
        txHash: txHash.trim(),
        paymentSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Payment submitted!',
        description: 'Your payment is being verified. You will be notified once confirmed.',
      });

      // 跳转到订单详情页
      router.push(`/account/purchases/${orderId}`);

    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            Complete Payment
          </h1>
          <p className="text-white/60">
            Send USDT to complete your purchase
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：支付信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 订单信息 */}
            <Card className="glass-morphism border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Order Details
              </h2>
              <div className="flex gap-4">
                {order.productImage && (
                  <img
                    src={order.productImage}
                    alt={order.productName}
                    className="w-20 h-20 rounded-lg object-cover border border-white/10"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1">{order.productName}</h3>
                  <p className="text-sm text-white/60 mb-2">Order ID: {orderId.slice(0, 8)}...</p>
                  <p className="text-2xl font-bold text-gradient">
                    ${order.price.toFixed(2)} USDT
                  </p>
                </div>
              </div>
            </Card>

            {/* 支付步骤 */}
            <Card className="glass-morphism border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Payment Instructions
              </h2>

              <div className="space-y-6">
                {/* 步骤1：复制地址 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">Copy USDT Address</h3>
                    <div className="glass-morphism rounded-lg border border-white/10 p-4">
                      <p className="text-sm text-white/60 mb-2">Send USDT (TRC20) to:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-white font-mono text-sm break-all bg-black/40 p-2 rounded">
                          {USDT_ADDRESS}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyAddress}
                          className="flex-shrink-0"
                        >
                          {copied ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 步骤2：发送USDT */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">Send Exact Amount</h3>
                    <div className="glass-morphism rounded-lg border border-primary/30 p-4 bg-primary/5">
                      <p className="text-sm text-white/60 mb-1">Amount to send:</p>
                      <p className="text-3xl font-bold text-gradient">
                        {USDT_AMOUNT.toFixed(2)} USDT
                      </p>
                      <p className="text-xs text-white/40 mt-2">
                        ⚠️ Please send the exact amount
                      </p>
                    </div>
                  </div>
                </div>

                {/* 步骤3：提交交易哈希 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">Submit Transaction Hash</h3>
                    <div className="space-y-3">
                      <Input
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        placeholder="Enter your transaction hash (TxID)"
                        className="bg-black/40 border-white/20 text-white"
                      />
                      <Button
                        onClick={handleSubmitPayment}
                        disabled={isSubmitting || !txHash.trim()}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover-lift"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Submit Payment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 右侧：提示信息 */}
          <div className="space-y-6">
            {/* 安全提示 */}
            <Card className="glass-morphism border-green-500/30 p-6 bg-green-500/5">
              <div className="flex items-start gap-3 mb-4">
                <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white mb-1">Secure Payment</h3>
                  <p className="text-sm text-white/70">
                    Your funds are protected by our escrow system
                  </p>
                </div>
              </div>
            </Card>

            {/* 重要提示 */}
            <Card className="glass-morphism border-yellow-500/30 p-6 bg-yellow-500/5">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white mb-2">Important Notes</h3>
                  <ul className="text-sm text-white/70 space-y-2">
                    <li>• Only send USDT (TRC20)</li>
                    <li>• Send exact amount: {USDT_AMOUNT.toFixed(2)} USDT</li>
                    <li>• Double check the address</li>
                    <li>• Save your transaction hash</li>
                    <li>• Verification takes 5-10 minutes</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* 帮助 */}
            <Card className="glass-morphism border-white/10 p-6">
              <h3 className="font-bold text-white mb-3">Need Help?</h3>
              <p className="text-sm text-white/70 mb-4">
                If you have any questions or issues with payment, please contact support.
              </p>
              <Link href="/support">
                <Button variant="outline" className="w-full border-white/20 hover:bg-white/10">
                  Contact Support
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
