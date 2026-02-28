'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// 🚀 内置类型声明，防止因外部文件缺失导致的编译报错
interface GlobalSettings {
  paymentMethods?: {
    usdt: boolean;
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
import { ProductPurchaseActions } from '@/components/product-purchase-actions';
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
import { ProductEditForm } from '@/components/product-edit-form';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { doc, updateDoc, arrayRemove, arrayUnion, increment, collection, query, where, limit, getDocs, getDoc } from 'firebase/firestore';
import { MapComponent } from '@/components/map';
import { APIProvider } from '@vis.gl/react-google-maps';

// 🚀 安全样式合并函数
const safeClass = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

function ProductPageSkeleton() {
    return (
        <div className="min-h-screen">
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                    <div className="lg:col-span-3 space-y-4"><Skeleton className="aspect-video w-full rounded-[32px] bg-black/75 border border-white/10" /></div>
                    <div className="lg:col-span-2 space-y-6"><Skeleton className="h-64 w-full rounded-[32px] bg-black/75 border border-white/10" /></div>
                </div>
            </div>
        </div>
    );
}

export default function ProductPage() {
    const params = useParams();
    const id = params?.id as string;
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const router = useRouter();

    const productRef = useMemo(() => (firestore && id ? doc(firestore, 'products', id) : null), [firestore, id]);
    const { data: product, loading } = useDoc<any>(productRef);
    
    // 🚀 全局支付控制中心：实时监听后台开关
    const settingsRef = useMemo(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore]);
    const { data: globalSettings } = useDoc<GlobalSettings>(settingsRef);
    
    // 逻辑：如果数据库没配置，默认开启全部以防逻辑锁死；如果配置了，严格遵守配置
    const pms = globalSettings?.paymentMethods || { usdt: true, alipay: true, wechat: true, promptpay: true };

    const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

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
    const hasAdminAccess = !!(profile && ['staff', 'ghost', 'admin', 'support'].includes(profile.role || ''));
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

    const handleToggleFollow = async () => {
        if (!user || !firestore || !product?.sellerId) return;
        const userRef = doc(firestore, 'users', user.uid);
        const hostRef = doc(firestore, 'users', product.sellerId);
        try {
            if (isFollowing) {
                await updateDoc(userRef, { following: arrayRemove(product.sellerId) });
                await updateDoc(hostRef, { followerCount: increment(-1) });
                setLocalFollowerCount(prev => Math.max(0, prev - 1));
            } else {
                await updateDoc(userRef, { following: arrayUnion(product.sellerId) });
                await updateDoc(hostRef, { followerCount: increment(1) });
                setLocalFollowerCount(prev => prev + 1);
            }
            setIsFollowing(!isFollowing);
        } catch (error) { console.error(error); }
    };

    const handleDeleteProduct = async () => {
        if (!product || !firestore) return;
        setIsSubmittingDelete(true);
        try {
            await updateDoc(doc(firestore, "products", product.id), { status: 'under_review' });
            toast({ title: "已提交审核" });
            setTimeout(() => { window.location.href = '/products'; }, 300);
        } catch(e) { setIsSubmittingDelete(false); }
    };

    return (
        <div className="min-h-screen relative overflow-hidden pb-20">
            <div className="fixed inset-0 bg-black/50 pointer-events-none z-[-1]" />
            <PageHeaderWithBackAndClose />

            <header className="relative h-[32vh] w-full overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 flex">
                    <div className="relative w-1/2 h-full"><Image src={product.images?.[0] || '/placeholder.jpg'} alt="P1" fill className="object-cover" /></div>
                    <div className="relative w-1/2 h-full border-l border-black/50"><Image src={product.images?.[1] || product.images?.[0]} alt="P2" fill className="object-cover" /></div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-0 right-0 space-y-1 z-20 text-center">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-4xl font-black titanium-title tracking-tighter uppercase text-white drop-shadow-[0_0_20px_rgba(0,0,0,1)]">{product.title}</h1>
                        <p className="text-purple-400 font-bold tracking-[0.4em] uppercase text-[10px] flex items-center justify-center gap-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                            <MapPin className="w-3 h-3 shrink-0" /> 
                            <span className="translate-y-[0.5px]">{product.location?.address || product.location?.city}</span>
                        </p>
                    </motion.div>
                </div>
            </header>
            
            <main className="container mx-auto px-4 py-12 relative z-10">
                <div className="max-w-6xl mx-auto mb-10 space-y-4">
                    {isOwner && (
                        <div className="bg-black/75 backdrop-blur-2xl border border-primary/30 rounded-[24px] p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 shadow-2xl">
                            <Zap className="text-primary h-6 w-6 animate-pulse" />
                            <p className="text-primary font-black italic uppercase text-xs tracking-widest">Owner_Protocol_Active: Self-trading restricted.</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-12">
                    <div className="lg:col-span-3 flex flex-col gap-12">
                        <div className="bg-black/75 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl p-6">
                            <ProductImageGallery product={product} isLiked={!!isLiked} isFavorited={!!isFavorited} onLikeToggle={() => handleInteraction('like')} onFavoriteToggle={() => handleInteraction('favorite')} />
                        </div>

                        <Card className="bg-black/75 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                            <CardHeader className="border-b border-white/5 p-8 flex flex-row items-center justify-between">
                                <CardTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-white">
                                    <Sparkles className="h-5 w-5 text-primary" /> {t('product.description')}
                                </CardTitle>
                                {(isOwner || hasAdminAccess) && (
                                    <div className="flex items-center gap-3">
                                        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                            <DialogTrigger asChild><Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-primary transition-all text-white"><Edit className="mr-2 h-4 w-4" /> {t('EDIT')}</Button></DialogTrigger>
                                            <DialogContent className="bg-[#09090b] border-white/10 text-white backdrop-blur-3xl"><DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader><ProductEditForm product={product} onSave={() => setIsEditDialogOpen(false)} /></DialogContent>
                                        </Dialog>
                                        {hasAdminAccess && !isOwner && (
                                            <Button variant="destructive" className="rounded-full h-10 w-10 p-0" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="h-4 w-4" /></Button>
                                        )}
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <p className="text-white/70 leading-relaxed italic whitespace-pre-wrap text-lg">{product.description}</p>
                                {product.location && !product.locationHidden && (
                                    <div className="pt-8 border-t border-white/5">
                                        <div className="h-[350px] rounded-2xl overflow-hidden border border-white/10 bg-black/50 grayscale brightness-75 hover:grayscale-0 transition-all duration-700">
                                            <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
                                                <MapComponent center={product.location} marker={product.location} />
                                            </APIProvider>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 flex flex-col gap-12">
                        <div className="sticky top-24 space-y-12 pb-12">
                            <div className="relative overflow-hidden bg-black/85 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col gap-8 group">
                                <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full filter blur-[80px] animate-blob opacity-40 transition-opacity duration-1000 pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-600/10 rounded-full filter blur-[80px] animate-blob animation-delay-4000 opacity-40 transition-opacity duration-1000 pointer-events-none" />
                                
                                <div className="relative z-10 space-y-4">
                                    <ProductTitleWithBadge product={product} />
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black titanium-title text-primary italic drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                                            ฿{(product.price || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] pl-1 animate-pulse">Node Execution Protocol</p>
                                </div>

                                <div className="relative z-10 grid grid-cols-2 gap-3 pt-4">
                                    <Button variant="outline" disabled={!pms.usdt} className={safeClass("h-14 flex items-center justify-center gap-2 border-white/5 bg-black/40 hover:bg-white/10 transition-all rounded-2xl", !pms.usdt && "opacity-20 grayscale cursor-not-allowed")}>
                                      <Wallet className="w-5 h-5 text-green-400" /> <span className="font-black italic uppercase tracking-widest text-[10px]">USDT</span>
                                    </Button>
                                    <Button variant="outline" disabled={!pms.alipay} className={safeClass("h-14 flex items-center justify-center gap-2 border-white/5 bg-black/40 transition-all rounded-2xl", !pms.alipay && "opacity-20 grayscale cursor-not-allowed")}>
                                      <Smartphone className="w-5 h-5 text-blue-400" /> <span className="font-black italic uppercase tracking-widest text-[10px]">Alipay</span>
                                    </Button>
                                    <Button variant="outline" disabled={!pms.wechat} className={safeClass("h-14 flex items-center justify-center gap-2 border-white/5 bg-black/40 transition-all rounded-2xl", !pms.wechat && "opacity-20 grayscale cursor-not-allowed")}>
                                      <QrCode className="w-5 h-5 text-green-500" /> <span className="font-black italic uppercase tracking-widest text-[10px]">WeChat</span>
                                    </Button>
                                    <Button variant="outline" disabled={!pms.promptpay} className={safeClass("h-14 flex items-center justify-center gap-2 border-white/5 bg-black/40 transition-all rounded-2xl", !pms.promptpay && "opacity-20 grayscale cursor-not-allowed")}>
                                      <CreditCard className="w-5 h-5 text-sky-400" /> <span className="font-black italic uppercase tracking-widest text-[10px]">PromptPay</span>
                                    </Button>
                                </div>
                                
                                <div className="relative z-10 pt-4">
                                    <Button className="w-full h-16 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic tracking-[0.3em] shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-[1.02] transition-transform rounded-2xl" disabled={isOwner}>
                                        立即购买 / Purchase
                                    </Button>
                                    <p className="mt-3 text-center text-[10px] text-white/30 font-mono uppercase tracking-widest flex items-center justify-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-primary/50" /> Security Escrow Active
                                    </p>
                                </div>

                                <div className="relative z-10 pt-8 border-t border-white/5 space-y-6">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 pl-1">Authorized Provider</h3>
                                    <SellerProfileCard seller={{...product.seller, followerCount: localFollowerCount}} className="bg-transparent border-none p-0 shadow-none" />
                                    
                                    {!isOwner && (
                                        <div className="flex gap-4 pt-4">
                                            {/* 🚀 统一机甲风格 Follow 按钮 */}
                                            <Button 
                                                onClick={handleToggleFollow} 
                                                className={safeClass(
                                                    "flex-1 rounded-2xl h-14 font-black uppercase italic tracking-[0.2em] transition-all duration-300", 
                                                    isFollowing 
                                                    ? "bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 shadow-inner" 
                                                    : "bg-gradient-to-r from-primary to-purple-600 text-black shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] border-none"
                                                )}
                                            >
                                                <UserPlus className="mr-2 h-5 w-5" /> {isFollowing ? 'Following' : 'Follow'}
                                            </Button>
                                            
                                            {/* 🚀 统一机甲风格 Message 按钮 (修复 404 路由) */}
                                            <Button 
                                                onClick={() => router.push(`/messages?to=${product.sellerId}`)} 
                                                className="flex-1 rounded-2xl h-14 bg-black/40 border border-primary/40 text-primary font-black uppercase italic tracking-[0.2em] hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:scale-[1.02] transition-all duration-300"
                                            >
                                                <MessageSquare className="mr-2 h-5 w-5" /> Message
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col relative group mt-8">
                                <div className="flex items-center gap-3 mb-5 pl-1 relative z-10">
                                    <TerminalSquare className="w-5 h-5 text-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] animate-pulse" />
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white drop-shadow-md">
                                        Terminal <span className="text-primary">Logs</span>
                                    </h3>
                                </div>
                                <ProductCommentSection productId={product.id} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-32">
                    <div className="flex items-center justify-between mb-12">
                        <h2 className="font-headline text-4xl font-black italic uppercase tracking-tighter text-white">Similar <span className="text-primary">Protocols</span></h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-8" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {loadingRecs ? [...Array(5)].map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-[24px] bg-black/75 border border-white/10 backdrop-blur-2xl" />) : 
                            recommendedProducts.map((p) => (
                                <Link href={`/products/${p.id}`} key={p.id} className="group relative aspect-[3/4] rounded-[24px] overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-500 shadow-2xl bg-black/75 backdrop-blur-2xl">
                                    <Image src={p.images?.[0] || '/placeholder.png'} alt={p.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
                                    <div className="absolute bottom-0 left-0 p-6">
                                        <h3 className="font-headline font-black text-xl text-white italic uppercase tracking-tighter line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h3>
                                        <p className="text-primary font-mono text-xs mt-1">{p.price?.toLocaleString()} {p.currency}</p>
                                    </div>
                                </Link>
                            ))
                        }
                    </div>
                </div>
            </main>

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