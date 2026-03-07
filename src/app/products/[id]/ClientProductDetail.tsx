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
  Zap, UserPlus, MessageSquare, TerminalSquare,
  Wallet, QrCode, Smartphone, CreditCard, ShieldCheck 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { doc, updateDoc, arrayRemove, arrayUnion, increment, collection, query, where, limit, getDocs, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapComponent } from '@/components/map';
import { APIProvider } from '@vis.gl/react-google-maps';

import { OrderConfirmDialog } from '@/components/checkout/OrderConfirmDialog';

const safeClass = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

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

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);

    const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [localFollowerCount, setLocalFollowerCount] = useState(0);

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
            toast({ title: 'Please sign in', description: 'You need to sign in to make a purchase.', variant: 'destructive' });
            router.push('/auth/signin');
            return;
        }
        if (!selectedPaymentMethod) {
            toast({ title: '未选择支付方式', description: '请先在上方选择一种支付方式', variant: 'destructive' });
            return;
        }
        setIsOrderDialogOpen(true);
    };

    const handlePurchaseConfirm = async (finalMethod: any) => {
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
            
            toast({ title: 'Order created!', description: 'Redirecting to payment...' });
            
            if (finalMethod === 'ETH') { 
                router.push(`/checkout/${orderRef.id}`);
            } else {
                router.push(`/account/purchases/${orderRef.id}`);
            }
        } catch (error) {
            console.error('Error creating order:', error);
            toast({ title: 'Error', description: 'Failed to create order. Please try again.', variant: 'destructive' });
            throw error;
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#050508] pb-20">
            {/* 全局背景氛围流动光 */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 blur-[120px] rounded-full animate-blob" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-900/10 blur-[150px] rounded-full animate-blob animation-delay-2000" />
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
                        
                        <div className="relative bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] p-6 group transition-all duration-700 hover:bg-white/[0.04]">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            <div className="relative z-10">
                                <ProductImageGallery product={product} isLiked={!!isLiked} isFavorited={!!isFavorited} onLikeToggle={() => handleInteraction('like')} onFavoriteToggle={() => handleInteraction('favorite')} />
                            </div>
                        </div>
                        
                        <Card className="relative overflow-hidden bg-[#0A0A0E]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl group transition-all duration-500 hover:border-white/20">
                            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700" />
                            
                            <CardHeader className="border-b border-white/5 p-8 flex flex-row items-center justify-between relative z-10">
                                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-white">
                                    <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" /> {t('product.description')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8 relative z-10">
                                <p className="text-white/70 leading-relaxed italic whitespace-pre-wrap text-lg font-light">{product.description}</p>
                            </CardContent>
                        </Card>

                        <div className="relative overflow-hidden bg-gradient-to-b from-[#0A0A0E]/90 to-[#050508]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 group transition-all duration-500 hover:border-white/20">
                            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50" />
                            <div className="absolute -bottom-24 -left-10 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
                            
                            <div className="relative z-10">
                                <h3 className="text-sm font-black italic text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                                    <TerminalSquare className="w-4 h-4" /> Communication Terminal
                                </h3>
                                <ProductCommentSection productId={product.id} />
                            </div>
                        </div>

                    </div>

                    {/* ========== 右侧：操作与信息区 ========== */}
                    <div className="lg:col-span-2 flex flex-col gap-10">
                        <div className="sticky top-28 space-y-10 pb-12">
                            
                            <div className="relative overflow-hidden bg-[#0A0A0C]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col gap-8 group transition-all hover:border-white/20">
                                <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full filter blur-[80px] animate-blob opacity-50 pointer-events-none transition-all duration-700 group-hover:bg-primary/20 group-hover:scale-110" />
                                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full filter blur-[80px] animate-blob animation-delay-2000 opacity-30 pointer-events-none" />
                                
                                <div className="relative z-10 space-y-4">
                                    <ProductTitleWithBadge product={product} />
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black titanium-title text-primary italic drop-shadow-[0_0_20px_rgba(168,85,247,0.5)]">
                                            {Number(product.price || 0).toLocaleString('en-US', { maximumFractionDigits: 6 })} ETH
                                        </span>
                                    </div>
                                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] pl-1 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        Node Execution Protocol
                                    </p>
                                </div>

                                {/* 支付通道网格 */}
                                <div className="relative z-10 grid grid-cols-2 gap-4 pt-2">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setSelectedPaymentMethod('ETH')}
                                        className={safeClass(
                                            "h-16 flex items-center justify-center gap-3 border-white/5 transition-all rounded-[1.2rem] relative overflow-hidden", 
                                            selectedPaymentMethod === 'ETH' ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(168,85,247,0.25)] scale-[1.02]" : "bg-black/40 hover:bg-white/10"
                                        )}>
                                      <Wallet className={safeClass("w-5 h-5", selectedPaymentMethod === 'ETH' ? "text-primary" : "text-white/50")} /> 
                                      <span className={safeClass("font-black italic uppercase tracking-widest text-[11px]", selectedPaymentMethod === 'ETH' ? "text-white" : "text-white/50")}>BASE ETH</span>
                                    </Button>

                                    <Button 
                                        variant="outline" 
                                        disabled={true} 
                                        className="h-16 flex items-center justify-center gap-3 border-white/5 transition-all rounded-[1.2rem] opacity-30 grayscale cursor-not-allowed bg-black/40"
                                    >
                                      <Smartphone className="w-5 h-5 text-white/50" /> 
                                      <span className="font-black italic uppercase tracking-widest text-[11px] text-white/50">Alipay</span>
                                    </Button>

                                    <Button 
                                        variant="outline" 
                                        disabled={true} 
                                        className="h-16 flex items-center justify-center gap-3 border-white/5 transition-all rounded-[1.2rem] opacity-30 grayscale cursor-not-allowed bg-black/40"
                                    >
                                      <QrCode className="w-5 h-5 text-white/50" /> 
                                      <span className="font-black italic uppercase tracking-widest text-[11px] text-white/50">WeChat</span>
                                    </Button>

                                    <Button 
                                        variant="outline" 
                                        disabled={true} 
                                        className="h-16 flex items-center justify-center gap-3 border-white/5 transition-all rounded-[1.2rem] opacity-30 grayscale cursor-not-allowed bg-black/40"
                                    >
                                      <CreditCard className="w-5 h-5 text-white/50" /> 
                                      <span className="font-black italic uppercase tracking-widest text-[11px] text-white/50">PromptPay</span>
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
                                        {isOwner ? 'Your Own Product' : (selectedPaymentMethod ? 'EXECUTE / 立即购买' : 'Select Gateway')}
                                    </Button>
                                    <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-primary/70" />
                                        <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest">
                                            Smart Escrow Protection Active
                                        </p>
                                    </div>
                                </div>

                                <div className="relative z-10 pt-8 border-t border-white/5 space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 pl-1 flex items-center gap-2">
                                        <UserPlus className="w-3 h-3" /> Authorized Provider
                                    </h3>
                                    <div className="bg-white/[0.02] rounded-2xl p-2 border border-white/5 hover:border-white/10 transition-colors">
                                        <SellerProfileCard seller={{...product.seller, followerCount: localFollowerCount}} className="bg-transparent border-none p-0 shadow-none" />
                                    </div>
                                </div>
                            </div>

                            {product.location && (
                                <Card className="relative overflow-hidden bg-[#0A0A0C]/90 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] group hover:border-cyan-500/30 transition-all duration-500">
                                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
                                    <div className="absolute -top-24 -right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
                                    
                                    <CardHeader className="border-b border-white/5 p-6 relative z-10">
                                        <CardTitle className="text-sm font-black italic uppercase tracking-widest flex items-center gap-2 text-cyan-400">
                                            <MapPin className="h-4 w-4" /> Location Node
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 h-[250px] relative z-10">
                                         <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                                            {/* 🚀 终极修复：移除了多余的 readOnly */}
                                            <MapComponent center={product.location} zoom={13} />
                                         </APIProvider>
                                         <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(10,10,12,1)]" />
                                    </CardContent>
                                </Card>
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