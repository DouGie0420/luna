'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OrderConfirmDialog } from '@/components/checkout/OrderConfirmDialog';
import type { PaymentMethod } from '@/components/checkout/PaymentMethodSelector';
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  MapPin, 
  Clock, 
  Shield,
  Star,
  MessageSquare,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string;
  imageUrl?: string;
  images?: string[];
  sellerId: string;
  sellerName?: string;
  sellerAvatar?: string;
  createdAt: any;
  views?: number;
  likes?: number;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const productId = params.id as string;

  // 加载商品信息
  useEffect(() => {
    if (!firestore || !productId) return;

    const loadProduct = async () => {
      try {
        const productDoc = await getDoc(doc(firestore, 'products', productId));
        if (productDoc.exists()) {
          setProduct({
            id: productDoc.id,
            ...productDoc.data()
          } as Product);
        } else {
          toast({
            title: 'Product not found',
            description: 'This product may have been removed.',
            variant: 'destructive'
          });
          router.push('/products');
        }
      } catch (error) {
        console.error('Error loading product:', error);
        toast({
          title: 'Error',
          description: 'Failed to load product details.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [firestore, productId, router, toast]);

  // 处理购买确认
  const handlePurchaseConfirm = async (paymentMethod: PaymentMethod) => {
    if (!user || !firestore || !product) return;

    try {
      // 创建订单
      const orderData = {
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        price: product.price,
        buyerId: user.uid,
        sellerId: product.sellerId,
        paymentMethod,
        status: 'pending_payment',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(firestore, 'orders'), orderData);

      // 创建订单聊天
      const chatId = `order_${orderRef.id}`;
      await addDoc(doc(firestore, 'chats', chatId), {
        orderId: orderRef.id,
        productId: product.id,
        productName: product.name,
        sellerId: product.sellerId,
        buyerId: user.uid,
        participants: [product.sellerId, user.uid],
        lastMessage: 'Order created',
        lastMessageTimestamp: serverTimestamp(),
        unreadCount: {
          [product.sellerId]: 1,
          [user.uid]: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({
        title: 'Order created!',
        description: 'Redirecting to payment...',
      });

      // 根据支付方式跳转
      if (paymentMethod === 'usdt') {
        router.push(`/checkout/${orderRef.id}`);
      } else {
        toast({
          title: 'Coming soon',
          description: `${paymentMethod} payment will be available soon.`,
        });
        router.push(`/account/purchases/${orderRef.id}`);
      }

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order. Please try again.',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleBuyNow = () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to sign in to make a purchase.',
        variant: 'destructive'
      });
      router.push('/auth/signin');
      return;
    }

    if (user.uid === product?.sellerId) {
      toast({
        title: 'Cannot buy your own product',
        description: 'You cannot purchase your own listing.',
        variant: 'destructive'
      });
      return;
    }

    setShowOrderDialog(true);
  };

  const handleContactSeller = () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to sign in to contact the seller.',
        variant: 'destructive'
      });
      router.push('/auth/signin');
      return;
    }

    // 跳转到消息页面（稍后实现创建聊天）
    router.push('/messages');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const isOwnProduct = user?.uid === product.sellerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：图片 */}
          <div className="space-y-4">
            <div className="glass-morphism rounded-2xl border border-white/10 overflow-hidden aspect-square">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <ShoppingCart className="h-24 w-24 text-white/20" />
                </div>
              )}
            </div>

            {/* 缩略图（如果有多张图片） */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="glass-morphism rounded-lg border border-white/10 overflow-hidden aspect-square cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：信息 */}
          <div className="space-y-6">
            {/* 标题和价格 */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-4xl font-bold text-white">{product.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsLiked(!isLiked)}
                  className={cn(
                    "rounded-full",
                    isLiked && "text-red-500"
                  )}
                >
                  <Heart className={cn("h-6 w-6", isLiked && "fill-current")} />
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-primary/50 text-primary">
                  {product.category}
                </Badge>
                <Badge variant="outline" className="border-white/30 text-white/70">
                  {product.condition}
                </Badge>
              </div>
              <p className="text-5xl font-bold text-gradient mb-2">
                ${product.price.toFixed(2)}
              </p>
              <p className="text-white/60 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {product.location}
              </p>
            </div>

            {/* 卖家信息 */}
            <div className="glass-morphism rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-bold text-white/60 mb-3">Seller Information</h3>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  {product.sellerAvatar && <AvatarImage src={product.sellerAvatar} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                    {(product.sellerName || 'S').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{product.sellerName || 'Seller'}</h4>
                  <div className="flex items-center gap-1 text-sm text-white/60">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span>4.8 (120 reviews)</span>
                  </div>
                </div>
                {!isOwnProduct && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleContactSeller}
                    className="border-white/20 hover:bg-white/10"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                )}
              </div>
            </div>

            {/* 描述 */}
            <div className="glass-morphism rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-bold text-white mb-3">Description</h3>
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>

            {/* 购买按钮 */}
            <div className="space-y-3">
              {isOwnProduct ? (
                <Button
                  disabled
                  className="w-full py-6 text-lg bg-white/10 cursor-not-allowed"
                >
                  This is your product
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleBuyNow}
                    className="w-full py-6 text-lg bg-gradient-to-r from-primary to-secondary hover-lift"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Buy Now
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 hover:bg-white/10"
                      onClick={handleContactSeller}
                    >
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Message Seller
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 hover:bg-white/10"
                    >
                      <Share2 className="h-5 w-5 mr-2" />
                      Share
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* 安全提示 */}
            <div className="glass-morphism rounded-xl border border-green-500/30 p-4 bg-green-500/5">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white mb-1">Secure Transaction</h4>
                  <p className="text-sm text-white/70">
                    Your payment is protected by our escrow system. Funds are only released when you confirm receipt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 订单确认对话框 */}
      {product && (
        <OrderConfirmDialog
          open={showOrderDialog}
          onOpenChange={setShowOrderDialog}
          product={{
            id: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            sellerId: product.sellerId
          }}
          onConfirm={handlePurchaseConfirm}
        />
      )}
    </div>
  );
}
