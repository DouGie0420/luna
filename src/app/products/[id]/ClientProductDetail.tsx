'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface GlobalSettings {
  paymentMethods?: {
    eth: boolean;
    alipay: boolean;
    wechat: boolean;
    promptpay: boolean;
  };
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductTitleWithBadge } from '@/components/product-title-with-badge';
import { SellerProfileCard } from '@/components/seller-profile-card';
import { ProductCommentSection } from '@/components/product-comment-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Edit, Trash2, Loader2, MapPin, Sparkles, ShieldAlert,
  Zap, UserPlus, MessageSquare,
  Wallet, QrCode, Smartphone, CreditCard, ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { doc, updateDoc, arrayRemove, arrayUnion, increment, collection, query, where, limit, getDocs, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapComponent } from '@/components/map';
import { APIProvider } from '@vis.gl/react-google-maps';

import { OrderConfirmDialog } from '@/components/checkout/OrderConfirmDialog';
import type { PaymentMethod } from '@/components/checkout/PaymentMethodSelector';

const safeClass = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const memphisStyles = `
  @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.1)} 66%{transform:translate(-20px,15px) scale(0.95)} }
  @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,20px) scale(1.05)} 66%{transform:translate(20px,-15px) scale(1.1)} }
  @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,25px) scale(0.9)} }
  .memphis-blob1 { animation: blob1 8s ease-in-out infinite; }
  .memphis-blob2 { animation: blob2 10s ease-in-out infinite; }
  .memphis-blob3 { animation: blob3 12s ease-in-out infinite; }
  .memphis-dots {
    background-image: radial-gradient(circle, rgba(255,230,109,0.18) 1.5px, transparent 1.5px),
                      radial-gradient(circle, rgba(255,107,107,0.12) 1px, transparent 1px);
    background-size: 22px 22px, 11px 11px;
    background-position: 0 0, 11px 11px;
  }
  .memphis-stripes {
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(78,205,196,0.08) 0px, rgba(78,205,196,0.08) 2px,
      transparent 2px, transparent 14px
    );
  }
  .memphis-zigzag {
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255,142,83,0.07) 0px, rgba(255,142,83,0.07) 3px,
      transparent 3px, transparent 12px
    ), repeating-linear-gradient(
      -45deg,
      rgba(168,85,247,0.07) 0px, rgba(168,85,247,0.07) 3px,
      transparent 3px, transparent 12px
    );
  }
`;

function ProductPageSkeleton() {
    return (
        <div className="min-h-screen bg-[#050508]">
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                    <div className="lg:col-span-3 space-y-4"><Skeleton className="aspect-video w-full rounded-[32px] bg-white/5 border border-white/10" /></div>
                    <div className="lg:col-span-2 space-y-6"><Skeleton className="h-[600px] w-full rounded-[32px] bg-white/5 border border-white/10" /></div>
                </div>
            </div>
        </div>
    );
}

export default function ClientProductDetail() {
    const params = useParams();
    const id = params?.id as string;
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const router = useRouter();

    const productRef = useMemo(() => (firestore && id ? doc(firestore, 'products', id) : null), [firestore, id]);
    const { data: product, loading } = useDoc<any>(productRef);
    
    const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'payment_methods') : null), [firestore]);
    const { data: globalSettings } = useDoc<any>(settingsRef);
    
    const pms = {
        eth: globalSettings?.ETH ?? true, 
        alipay: globalSettings?.Alipay ?? false,
        wechat: globalSettings?.WeChat ?? false,
        promptpay: globalSettings?.PromptPay ?? false,
    };

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

    const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [localFollowerCount, setLocalFollowerCount] = useState(0);
    const [ethUsdPrice, setEthUsdPrice] = useState<number | null>(null);

    useEffect(() => {
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
            .then(r => r.json())
            .then(data => setEthUsdPrice(data?.ethereum?.usd || null))
            .catch(() => {});
    }, []);

    useEffect(() => { window.scrollTo(0, 0); }, []);
    
    useEffect(() => {
      if (!firestore) return;
      const fetchRecs = async () => {
        setLoadingRecs(true);
        try {
            const recsQuery = query(collection(firestore, 'products'), where('status', '==', 'active'), limit(12));
            const querySnapshot = await getDocs(recsQuery);
            let recs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            setRecommendedProducts(recs.filter(p => p.id !== id).slice(0, 5));
        } catch (error) { console.error(error); } finally { setLoadingRecs(false); }
      };
      fetchRecs();
    }, [firestore, id]);

    useEffect(() => {
        if (product?.seller?.followerCount !== undefined) {
            setLocalFollowerCount(product.seller.followerCount);
        }
        
        const checkStatus = async () => {
            if (!user || !product?.sellerId || !firestore) return;
            try {
                const userSnap = await getDoc(doc(firestore, 'users', user.uid));
                if (userSnap.exists()) {
                    const following = userSnap.data().following || [];
                    setIsFollowing(following.includes(product.sellerId));
                }
            } catch (e) { console.error("Sync Status Error:", e); }
        };
        checkStatus();
    }, [user, product?.sellerId, product?.seller?.followerCount, firestore]);

    if (loading) return <ProductPageSkeleton />;
    if (!product) notFound();

    const isOwner = !!(user && product && user.uid === product.sellerId);
    const isLiked = user && product && product.likedBy?.includes(user.uid);
    const isFavorited = user && product && product.favoritedBy?.includes(user.uid);

    const handleInteraction = (type: 'like' | 'favorite') => {
        if (!user || !firestore || !product) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }
        const ref = doc(firestore, 'products', product.id);
        const updateData = type === 'like' 
            ? { likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid), likes: increment(isLiked ? -1 : 1) }
            : { favoritedBy: isFavorited ? arrayRemove(user.uid) : arrayUnion(user.uid), favorites: increment(isFavorited ? -1 : 1) };
        updateDoc(ref, updateData).catch(() => toast({ variant: 'destructive', title: `Failed to update ${type}` }));
    };

    const handleOpenPurchaseDialog = () => {
        if (!user) {
            toast({ title: t('product.pleaseSignIn'), description: t('product.pleaseSignInDesc'), variant: 'destructive' });
            router.push('/auth/signin');
            return;
        }
        if (!selectedPaymentMethod) {
            toast({ title: t('product.noPaymentSelected'), description: t('product.noPaymentSelectedDesc'), variant: 'destructive' });
            return;
        }
        setIsOrderDialogOpen(true);
    };

    const handlePurchaseConfirm = async (finalMethod: PaymentMethod) => {
        if (!user || !firestore || !product) return;
        try {
            const orderData = {
                productId: product.id,
                productName: product.title || product.name || 'Unknown Product',
                productImage: product.images?.[0] || '',
                price: product.price,
                buyerId: user.uid,
                sellerId: product.sellerId,
                paymentMethod: finalMethod,
                status: 'pending_payment',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const orderRef = await addDoc(collection(firestore, 'orders'), orderData);
            
            toast({ title: t('product.orderCreated'), description: t('product.orderCreatedDesc') });
            
            if (finalMethod === 'eth' || finalMethod === 'usdt') { 
                router.push(`/checkout/${orderRef.id}`);
            } else {
                router.push(`/account/purchases/${orderRef.id}`);
            }
        } catch (error) {
            console.error('Error creating order:', error);
            toast({ title: t('product.orderError'), description: t('product.orderErrorDesc'), variant: 'destructive' });
            throw error;
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden pb-20" style={{ background: 'radial-gradient(ellipse at 20% 0%, #1a0a2e 0%, #0d0d1a 40%, #050508 100%)' }}>
            <style dangerouslySetInnerHTML={{ __html: memphisStyles }} />
            {/* 背景装饰层 */}
            <div className="fixed inset-0 pointer-events-none z-0">
                {/* 细网格纹理 */}
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                {/* 主光晕 - 左上紫 */}
                <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)' }} />
                {/* 右侧青蓝光晕 */}
                <div className="absolute top-[20%] right-[-15%] w-[45vw] h-[45vw] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }} />
                {/* 底部粉紫光晕 */}
                <div className="absolute bottom-[-10%] left-[30%] w-[50vw] h-[40vw] rounded-full blur-[140px]" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.10) 0%, transparent 70%)' }} />
                {/* 中央微亮点 */}
                <div className="absolute top-[45%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vw] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-50">
                <PageHeaderWithBackAndClose />
            </div>

            <header className="relative h-[32vh] w-full overflow-hidden border-b border-white/5 z-10">
                <div className="absolute inset-0 flex">
                    <div className="relative w-1/2 h-full"><Image src={product.images?.[0] || '/placeholder.jpg'} alt="P1" fill className="object-cover" priority={true} /></div>
                    <div className="relative w-1/2 h-full border-l border-black/50"><Image src={product.images?.[1] || product.images?.[0]} alt="P2" fill className="object-cover" priority={true} /></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/40 to-transparent" />
                <div className="absolute bottom-6 left-0 right-0 space-y-1 z-20 text-center">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-4xl font-black titanium-title tracking-tighter uppercase text-white drop-shadow-[0_0_30px_rgba(0,0,0,1)]">{product.title || product.name}</h1>
                        <p className="text-cyan-400 font-bold tracking-[0.4em] uppercase text-[10px] flex items-center justify-center gap-2 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                            <MapPin className="w-3 h-3 shrink-0" /> 
                            <span className="translate-y-[0.5px]">{product.location?.address || product.location?.city}</span>
                        </p>
                    </motion.div>
                </div>
            </header>
            
            <main className="container mx-auto px-4 py-12 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10 gap-y-12">
                    
                    {/* ========== 左侧：展示区 ========== */}
                    <div className="lg:col-span-3 flex flex-col gap-10">
                        
                        {/* 图片相册：流体毛玻璃 */}
                        <div className="relative bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 group transition-all duration-700 hover:bg-white/[0.04]">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="relative z-10">
                                <ProductImageGallery product={product} isLiked={!!isLiked} isFavorited={!!isFavorited} onLikeToggle={() => handleInteraction('like')} onFavoriteToggle={() => handleInteraction('favorite')} />
                            </div>
                        </div>
                        
                        {/* 描述卡片：同 Communication Terminal 风格 */}
                        <div className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 group transition-all duration-500 hover:border-purple-500/30">
                            <div className="memphis-blob1 absolute -top-16 -right-16 w-52 h-52 rounded-full blur-[70px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFE66D 0%, #FF8E53 60%, transparent 100%)' }} />
                            <div className="memphis-blob3 absolute -bottom-16 -left-10 w-44 h-44 rounded-full blur-[60px] opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #A855F7 0%, #FF6B6B 60%, transparent 100%)' }} />
                            <div className="absolute inset-0 memphis-zigzag pointer-events-none rounded-[32px]" />
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent opacity-50" />

                            <div className="relative z-10">
                                <h3 className="text-sm font-black italic text-yellow-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                                    <Sparkles className="w-4 h-4" /> {t('product.description')}
                                </h3>
                                <p className="text-white/90 leading-relaxed whitespace-pre-wrap text-base">{product.description}</p>
                            </div>
                        </div>

                        {/* Communication Terminal — Memphis zigzag */}
                        <div className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 group transition-all duration-500 hover:border-purple-500/30">
                            <div className="memphis-blob2 absolute -top-16 -left-16 w-52 h-52 rounded-full blur-[70px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF6B6B 0%, #A855F7 60%, transparent 100%)' }} />
                            <div className="memphis-blob1 absolute -bottom-16 -right-16 w-44 h-44 rounded-full blur-[60px] opacity-25 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFE66D 0%, transparent 70%)' }} />
                            <div className="absolute inset-0 memphis-zigzag pointer-events-none rounded-[32px]" />
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50" />
                            <div className="relative z-10">
                                <h3 className="text-sm font-black italic text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                                    <MessageSquare className="w-4 h-4" /> {t('product.communicationTerminal')}
                                </h3>
                                <ProductCommentSection productId={product.id} sellerId={product.sellerId} />
                            </div>
                        </div>

                    </div>

                    {/* ========== 右侧：操作与信息区 ========== */}
                    <div className="lg:col-span-2 flex flex-col gap-10">
                        {/* 粘性滚动容器，确保右侧在滚动时始终优雅固定 */}
                        <div className="sticky top-28 space-y-10 pb-12">
                            
                            {/* 核心支付交易卡片 — Memphis fluid */}
                            <div className="relative overflow-hidden bg-[#0A0A0C]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col gap-8 group transition-all hover:border-purple-500/30">
                                {/* Memphis fluid blobs */}
                                <div className="memphis-blob1 absolute -top-16 -right-16 w-64 h-64 rounded-full blur-[70px] opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFE66D 0%, #FF6B6B 60%, transparent 100%)' }} />
                                <div className="memphis-blob2 absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-[70px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #4ECDC4 0%, #A855F7 60%, transparent 100%)' }} />
                                <div className="memphis-blob3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[90px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #FF8E53 0%, transparent 70%)' }} />
                                {/* Memphis dot pattern overlay */}
                                <div className="absolute inset-0 memphis-dots pointer-events-none rounded-[32px]" />

                                <div className="relative z-10 space-y-4">
                                    <ProductTitleWithBadge product={product} />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-5xl font-black titanium-title text-primary italic drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                            {Number(product.price || 0).toLocaleString('en-US', { maximumFractionDigits: 6 })} ETH
                                        </span>
                                        {ethUsdPrice && (
                                            <span className="text-2xl font-black text-white/70 font-mono tracking-tight">
                                                ≈ <span className="text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]">${(Number(product.price || 0) * ethUsdPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> <span className="text-base font-bold text-white/40">USD</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] pl-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        {t('product.nodeExecutionProtocol')}
                                    </p>
                                </div>

                                {/* 支付通道网格 */}
                                <div className="relative z-10 grid grid-cols-2 gap-4 pt-2">
                                    <Button
                                        variant="outline"
                                        disabled={!pms.eth}
                                        onClick={() => setSelectedPaymentMethod('eth')}
                                        className={safeClass(
                                            "h-16 flex items-center justify-center gap-3 transition-all rounded-[1.2rem] relative overflow-hidden",
                                            !pms.eth ? "opacity-40 grayscale cursor-not-allowed bg-white/5 border-white/10" : "hover:bg-white/15 border-white/20",
                                            selectedPaymentMethod === 'eth' ? "border-primary bg-primary/15 shadow-[0_0_20px_rgba(168,85,247,0.3)] scale-[1.02]" : ""
                                        )}>
                                      <Wallet className={safeClass("w-5 h-5", selectedPaymentMethod === 'eth' ? "text-primary" : "text-white/80")} />
                                      <span className={safeClass("font-black italic uppercase tracking-widest text-[11px]", selectedPaymentMethod === 'eth' ? "text-white" : "text-white/80")}>ETH</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        disabled={!pms.alipay}
                                        onClick={() => setSelectedPaymentMethod('alipay')}
                                        className={safeClass(
                                            "h-16 flex items-center justify-center gap-3 transition-all rounded-[1.2rem]",
                                            !pms.alipay ? "opacity-40 grayscale cursor-not-allowed bg-white/5 border-white/10" : "hover:bg-white/15 border-white/20",
                                            selectedPaymentMethod === 'alipay' ? "border-blue-400 bg-blue-400/15 shadow-[0_0_20px_rgba(96,165,250,0.3)] scale-[1.02]" : ""
                                        )}>
                                      <Smartphone className={safeClass("w-5 h-5", selectedPaymentMethod === 'alipay' ? "text-blue-400" : "text-white/80")} />
                                      <span className={safeClass("font-black italic uppercase tracking-widest text-[11px]", selectedPaymentMethod === 'alipay' ? "text-white" : "text-white/80")}>Alipay</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        disabled={!pms.wechat}
                                        onClick={() => setSelectedPaymentMethod('wechat')}
                                        className={safeClass(
                                            "h-16 flex items-center justify-center gap-3 transition-all rounded-[1.2rem]",
                                            !pms.wechat ? "opacity-40 grayscale cursor-not-allowed bg-white/5 border-white/10" : "hover:bg-white/15 border-white/20",
                                            selectedPaymentMethod === 'wechat' ? "border-green-500 bg-green-500/15 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-[1.02]" : ""
                                        )}>
                                      <QrCode className={safeClass("w-5 h-5", selectedPaymentMethod === 'wechat' ? "text-green-500" : "text-white/80")} />
                                      <span className={safeClass("font-black italic uppercase tracking-widest text-[11px]", selectedPaymentMethod === 'wechat' ? "text-white" : "text-white/80")}>WeChat</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        disabled={!pms.promptpay}
                                        onClick={() => setSelectedPaymentMethod('promptpay')}
                                        className={safeClass(
                                            "h-16 flex items-center justify-center gap-3 transition-all rounded-[1.2rem]",
                                            !pms.promptpay ? "opacity-40 grayscale cursor-not-allowed bg-white/5 border-white/10" : "hover:bg-white/15 border-white/20",
                                            selectedPaymentMethod === 'promptpay' ? "border-sky-400 bg-sky-400/15 shadow-[0_0_20px_rgba(56,189,248,0.3)] scale-[1.02]" : ""
                                        )}>
                                      <CreditCard className={safeClass("w-5 h-5", selectedPaymentMethod === 'promptpay' ? "text-sky-400" : "text-white/80")} />
                                      <span className={safeClass("font-black italic uppercase tracking-widest text-[11px]", selectedPaymentMethod === 'promptpay' ? "text-white" : "text-white/80")}>PromptPay</span>
                                    </Button>
                                </div>
                                
                                <div className="relative z-10 pt-6">
                                    <Button 
                                        onClick={handleOpenPurchaseDialog}
                                        disabled={isOwner || !selectedPaymentMethod}
                                        className={safeClass(
                                            "w-full h-20 font-black uppercase italic tracking-[0.3em] transition-all rounded-[1.5rem] text-xl",
                                            (!selectedPaymentMethod || isOwner) 
                                                ? "bg-white/5 text-white/30 cursor-not-allowed border border-white/5" 
                                                : "bg-gradient-to-r from-primary to-purple-600 text-black shadow-[0_0_40px_rgba(168,85,247,0.4)] hover:scale-[1.03] active:scale-[0.98]"
                                        )}
                                    >
                                        {isOwner ? t('product.yourOwnProduct') : (selectedPaymentMethod ? t('product.executeNow') : t('product.selectGateway'))}
                                    </Button>
                                    <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-primary/70" />
                                        <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest">
                                            {t('product.smartEscrowProtection')}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative z-10 pt-8 border-t border-white/5 space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 pl-1 flex items-center gap-2">
                                        <UserPlus className="w-3 h-3" /> {t('product.authorizedProvider')}
                                    </h3>
                                    <div className="bg-white/[0.02] rounded-2xl p-2 border border-white/5 hover:border-white/10 transition-colors">
                                        <SellerProfileCard seller={{...product.seller, followerCount: localFollowerCount}} className="bg-transparent border-none p-0 shadow-none" />
                                    </div>
                                </div>
                            </div>

                            {/* ✅ 调整位置：地图模块紧跟在卖家名片下方，并提升美学质感 */}
                            {product.location && (
                                <div className="relative overflow-hidden bg-[#0A0A0C]/70 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] group hover:border-yellow-500/30 transition-all duration-500">
                                    <div className="memphis-blob2 absolute -top-16 -right-12 w-48 h-48 rounded-full blur-[65px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFE66D 0%, #FF8E53 60%, transparent 100%)' }} />
                                    <div className="memphis-blob3 absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-[55px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)' }} />
                                    <div className="absolute inset-0 memphis-zigzag pointer-events-none rounded-[32px]" />
                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent opacity-50" />

                                    <div className="relative z-10 px-6 pt-6 pb-3">
                                        <h3 className="text-sm font-black italic text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <MapPin className="w-4 h-4" /> {t('product.locationNode')}
                                        </h3>
                                    </div>
                                    <div className="relative z-10 h-[250px] mx-4 mb-4 rounded-2xl overflow-hidden">
                                        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                                            <MapComponent center={product.location} zoom={13} markerPosition={product.location} readOnly />
                                        </APIProvider>
                                        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(10,10,12,0.6)]" />
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </main>

            <OrderConfirmDialog 
                open={isOrderDialogOpen}
                onOpenChange={setIsOrderDialogOpen}
                product={{
                    id: product.id,
                    name: product.title || product.name,
                    price: product.price,
                    imageUrl: product.images?.[0] || '',
                    sellerId: product.sellerId
                }}
                onConfirm={handlePurchaseConfirm}
            />

            <style jsx global>{`
                .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
                .cyber-scrollbar::-webkit-scrollbar { width: 4px; }
                .cyber-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.3); border-radius: 4px; }
                
                @keyframes blob {
                  0% { transform: translate(0px, 0px) scale(1); }
                  33% { transform: translate(30px, -50px) scale(1.1); }
                  66% { transform: translate(-20px, 20px) scale(0.9); }
                  100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 15s infinite alternate ease-in-out; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
}