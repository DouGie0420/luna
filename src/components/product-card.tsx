'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Gem, Heart, Star, Sparkles, Edit3, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './ui/user-avatar';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { createNotification } from '@/lib/notifications';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: Product;
  className?: string;
}

// 🚀 内置 USDT 官方矢量 Logo
const USDTLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 2000 2000" xmlns="http://www.w3.org/2000/svg">
    <path fill="#26A17B" d="M1000 0c552.285 0 1000 447.715 1000 1000s-447.715 1000-1000 1000S0 1552.285 0 1000 447.715 0 1000 0z"/>
    <path fill="#FFF" d="M1087.5 618.75v191.667c191.666 12.5 347.917 47.916 347.917 89.583 0 41.667-156.25 77.083-347.917 89.583v454.167H912.5V989.583c-191.667-12.5-347.917-47.916-347.917-89.583 0-41.667 156.25-77.083 347.917-89.583V618.75h491.667V462.5H604.167v156.25h483.333z"/>
  </svg>
);

export function ProductCard({ product, className }: ProductCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, profile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isRecommended, setIsRecommended] = useState(false);

  // 🛡️ 终极防御
  if (!product) return null;

  const hasAdminAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');
  const isOwner = user && product.seller?.id === user.uid;
  const canManage = isOwner || hasAdminAccess;

  const isRentalMode = product.isRental === true || !!(product as any).propertyType;
  const collectionPath = isRentalMode ? 'rentalProperties' : 'products';

  useEffect(() => {
    const safeLikedBy = Array.isArray(product.likedBy) ? product.likedBy : [];
    const safeFavoritedBy = Array.isArray(product.favoritedBy) ? product.favoritedBy : [];

    setIsLiked(!!user && safeLikedBy.includes(user.uid));
    setLikesCount(Number(product.likes) || 0);
    setIsFavorited(!!user && safeFavoritedBy.includes(user.uid));
    setFavoritesCount(Number(product.favorites) || 0);
    
    try {
      if (typeof window !== 'undefined') {
        const recommendedItems = JSON.parse(localStorage.getItem('recommended_products') || '[]');
        setIsRecommended(Array.isArray(recommendedItems) && recommendedItems.includes(product.id));
      }
    } catch (e) {}
  }, [product.id, product.likes, product.favorites, user]);

  const handleGuestClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast({ title: '需要认证', description: '请先登录或注册以查看详情。', variant: 'destructive' });
    }
  }

  const handleRecommend = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const recommendedProducts = JSON.parse(localStorage.getItem('recommended_products') || '[]');
      const isCurrentlyRecommended = recommendedProducts.includes(product.id);
      const newRecommended = isCurrentlyRecommended ? recommendedProducts.filter((id: string) => id !== product.id) : [product.id, ...recommendedProducts];
      localStorage.setItem('recommended_products', JSON.stringify(newRecommended));
      setIsRecommended(!isCurrentlyRecommended);
      toast({ title: isCurrentlyRecommended ? '已取消推荐' : '已设为推荐' });
    } catch (e) {}
  };

  const handleInteraction = async (e: React.MouseEvent, type: 'like' | 'favorite') => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !profile || !firestore) {
      toast({ variant: 'destructive', title: t('common.loginToInteract') });
      return;
    }

    const productRef = doc(firestore, collectionPath, product.id);
    if (type === 'like') {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikesCount(prev => prev + (newLikedState ? 1 : -1));
      await updateDoc(productRef, {
        likedBy: newLikedState ? arrayUnion(user.uid) : arrayRemove(user.uid),
        likes: increment(newLikedState ? 1 : -1)
      });
      // 🚀 Lunar Soil 协议：点赞增加月壤积分
      if (product.seller?.id) {
          await updateDoc(doc(firestore, 'users', product.seller.id), {
              lunarSoil: increment(newLikedState ? 2 : -2)
          });
      }
      if (newLikedState) createNotification(firestore, product.seller?.id, { type: 'like-product', actor: profile, product: product });
    } else {
      const newFavoritedState = !isFavorited;
      setIsFavorited(newFavoritedState);
      setFavoritesCount(prev => prev + (newFavoritedState ? 1 : -1));
      await updateDoc(productRef, {
        favoritedBy: newFavoritedState ? arrayUnion(user.uid) : arrayRemove(user.uid),
        favorites: increment(newFavoritedState ? 1 : -1)
      });
      toast({ title: newFavoritedState ? "已添加收藏" : "已移除收藏" });
    }
  };

  const handleSoftDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm("确定要下架此违规内容吗？")) return;
    try {
      await updateDoc(doc(firestore!, collectionPath, product.id), {
        status: 'violated_soft_deleted',
        deletedAt: new Date().toISOString()
      });
      toast({ title: "执行成功", description: "已移至后台违规审核区。" });
      router.refresh();
    } catch (err) {}
  };

  const locationDisplay = [product.location?.city, product.location?.countryCode].filter(Boolean).join(', ');
  const imageSrc = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (typeof product.images === 'string' ? product.images : '/placeholder.jpg');

  const finalHref = product.id.includes('rental/') 
      ? `/products/${product.id}` 
      : `/products/${isRentalMode ? 'rental/' : ''}${product.id}`;

  return (
    <Link href={finalHref} className="group h-full block relative" onClick={handleGuestClick}>
      {/* 🚀 全局流体呼吸边框 */}
      <style jsx>{`
        @keyframes breatheGlow {
          0% { box-shadow: 0 0 10px rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 25px rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.4); }
          100% { box-shadow: 0 0 10px rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        }
        .breathe-card-border { animation: breatheGlow 4s ease-in-out infinite; }
      `}</style>

      <Card className={cn(
        "group relative overflow-hidden h-full flex flex-col transition-all duration-500",
        "breathe-card-border border-[1.5px] bg-[#09090b]/90 backdrop-blur-[24px]",
        isRentalMode ? "rounded-[2.5rem]" : "rounded-2xl",
        className
      )}>
        <CardHeader className="p-0 relative overflow-hidden border-b border-white/5">
          <div className="aspect-[4/3] relative">
            <Image src={imageSrc} alt={(product as any).title || product.name || "Luna Asset"} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
            
            {isRentalMode && canManage && (
               <div className="absolute top-3 left-3 flex gap-2 z-20">
                  <Button size="icon" className="h-9 w-9 rounded-full bg-black/60 backdrop-blur-md border-white/10 hover:bg-primary/40" onClick={(e) => { e.preventDefault(); router.push(`/products/new/rental?edit=${product.id}`); }}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button size="icon" className="h-9 w-9 rounded-full bg-red-500/20 backdrop-blur-md border-red-500/30 hover:bg-red-500/40 text-red-500" onClick={handleSoftDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
               </div>
            )}
            {hasAdminAccess && (
              <Button variant="secondary" size="icon" className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-primary/20" onClick={handleRecommend}>
                <Sparkles className={cn("h-4 w-4", isRecommended && "text-yellow-400 fill-yellow-400")} />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className={cn("flex-grow relative z-10", isRentalMode ? "p-6" : "p-4")}>
          {isRentalMode ? (
            <div className="flex flex-col gap-4">
              <CardTitle className="font-headline text-2xl text-white leading-tight uppercase tracking-tighter truncate">
                {(product as any).title || product.name}
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-white/50">
                <UserAvatar profile={{ displayName: product.seller?.name, photoURL: product.seller?.avatarUrl }} className="h-6 w-6 ring-2 ring-white/10" />
                <span className="font-headline tracking-[0.1em] font-bold uppercase">{product.seller?.name || 'Protocol User'}</span>
              </div>
              <div className="w-full py-4 px-6 bg-white/5 border border-white/10 rounded-2xl flex justify-center items-center shadow-inner mt-2">
                 <span className="text-xl font-black text-white uppercase tracking-[0.3em] italic animate-pulse truncate">
                   {(product as any).propertyType || product.category || 'Rental Node'}
                 </span>
              </div>
            </div>
          ) : (
            <>
              <CardTitle className="font-headline text-lg mb-2 text-white leading-tight group-hover:text-primary transition-colors uppercase tracking-tighter truncate">
                {product.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                <UserAvatar profile={{ displayName: product.seller?.name, photoURL: product.seller?.avatarUrl, displayedBadge: product.seller?.displayedBadge }} className="h-5 w-5 ring-1 ring-white/10" />
                <span className="font-headline tracking-widest">{product.seller?.name || 'Protocol User'}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* 🚀 寄售：发红字发红光警告色 */}
                {product.isConsignment && (
                  <Badge variant="outline" className="gap-1.5 border-red-500/50 bg-red-500/10 text-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">
                    <Gem className="h-3 w-3" /> {t('product.consignmentBadge')}
                  </Badge>
                )}
                {/* 🚀 普通分类：发绿字绿光 */}
                {product.category && !product.isConsignment && (
                  <Badge variant="outline" className="gap-1 border-lime-400/50 bg-lime-400/10 text-lime-400 px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(163,230,53,0.4)]">
                    {product.category}
                  </Badge>
                )}
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className={cn("relative z-10 mt-auto", isRentalMode ? "p-6 pt-0 flex-col items-start gap-6" : "p-4 pt-0 flex justify-between items-center")}>
          {isRentalMode ? (
            <>
              <div className="flex items-center w-full">
                <USDTLogo className="w-10 h-10 mr-3 drop-shadow-[0_0_10px_rgba(38,161,123,0.5)] shrink-0" />
                <span className="text-5xl font-headline italic font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] leading-none truncate max-w-[60%]">
                  {Number(product.price || 0).toLocaleString()}
                </span>
                <span className="text-xs text-white/30 font-black ml-3 uppercase tracking-widest shrink-0">/ NIGHT</span>
              </div>
              <div className="w-full flex justify-between items-center border-t border-white/5 pt-4">
                <div className="flex items-center text-xs text-white font-mono font-black uppercase tracking-[0.1em] overflow-hidden">
                  <MapPin className="h-4 w-4 mr-2 text-primary animate-pulse shrink-0" />
                  <span className="truncate max-w-[120px] drop-shadow-sm">{locationDisplay}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" className={cn("flex items-center gap-2 h-10 px-3 rounded-xl transition-all", isLiked ? "bg-primary/40 border border-primary/50 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)]" : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]")} onClick={(e) => handleInteraction(e, 'like')}>
                    <Heart className={cn("h-5 w-5", isLiked && "fill-white")} />
                    <span className="font-mono text-xs font-black">{likesCount}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className={cn("flex items-center gap-2 h-10 px-3 rounded-xl transition-all", isFavorited ? "bg-yellow-500/40 border border-yellow-400/50 text-white shadow-[0_0_20px_rgba(234,179,8,0.8)]" : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]")} onClick={(e) => handleInteraction(e, 'favorite')}>
                    <Star className={cn("h-5 w-5", isFavorited && "fill-white")} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-hidden space-y-2">
                {/* 🚀 彻底改造：告别笨重粗字体，采用精致瘦瘦的等宽极客风 */}
                <div className="flex items-center gap-2 text-white shadow-primary/20 drop-shadow-lg truncate">
                  <USDTLogo className="w-4 h-4 shrink-0 drop-shadow-md" />
                  <span className="text-lg font-mono font-semibold tracking-widest leading-none mt-0.5">
                    {Number(product.price || 0).toLocaleString()}
                  </span>
                </div>
                
                {/* 🚀 纯白定位信息 */}
                {locationDisplay && (
                  <div className="flex items-center text-[10px] text-white font-mono font-bold uppercase tracking-widest">
                    <MapPin className="h-3 w-3 mr-1 shrink-0 text-white" /> <span className="truncate max-w-[100px]">{locationDisplay}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* 🚀 点赞与收藏按钮强力高亮版 */}
                <Button variant="ghost" size="sm" className={cn("flex items-center gap-1.5 h-9 px-3 rounded-xl transition-all", isLiked ? "bg-primary/40 border border-primary/50 text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)]" : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]")} onClick={(e) => handleInteraction(e, 'like')}>
                  <Heart className={cn("h-4 w-4", isLiked && "fill-white")} />
                  <span className="font-mono text-[11px] font-black">{likesCount}</span>
                </Button>
                <Button variant="ghost" size="sm" className={cn("flex items-center gap-1.5 h-9 px-3 rounded-xl transition-all", isFavorited ? "bg-yellow-500/40 border border-yellow-400/50 text-white shadow-[0_0_20px_rgba(234,179,8,0.8)]" : "bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 hover:text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]")} onClick={(e) => handleInteraction(e, 'favorite')}>
                  <Star className={cn("h-4 w-4", isFavorited && "fill-white")} />
                  <span className="font-mono text-[11px] font-black">{favoritesCount}</span>
                </Button>
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}