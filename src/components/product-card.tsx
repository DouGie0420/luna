'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Heart, Star, Edit3, Trash2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from './ui/button';
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from './ui/user-avatar';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface ProductCardProps {
  product: Product;
  className?: string;
}

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

  // 🛡️ 核心修复：实时同步卖家最新头像并物理隔离变色影响
  const sellerId = product.sellerId || (product.seller as any)?.id || (product.seller as any)?.uid;
  const sellerRef = useMemo(() => (firestore && sellerId ? doc(firestore, 'users', sellerId) : null), [firestore, sellerId]);
  const { data: latestSeller } = useDoc<UserProfile>(sellerRef);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  if (!product) return null;

  const isRentalMode = product.isRental === true || !!(product as any).propertyType;
  const collectionPath = isRentalMode ? 'rentalProperties' : 'products';

  useEffect(() => {
    setIsLiked(!!user && (product.likedBy || []).includes(user.uid));
    setLikesCount(Number(product.likes) || 0);
    setIsFavorited(!!user && (product.favoritedBy || []).includes(user.uid));
  }, [product.id, product.likes, product.favoritedBy, user]);

  const handleInteraction = async (e: React.MouseEvent, type: 'like' | 'favorite') => {
    e.preventDefault(); e.stopPropagation();
    if (!user || !profile || !firestore) return toast({ variant: 'destructive', title: t('common.loginToInteract') });

    const productRef = doc(firestore, collectionPath, product.id);
    if (type === 'like') {
      const newState = !isLiked;
      setIsLiked(newState);
      setLikesCount(p => p + (newState ? 1 : -1));
      await updateDoc(productRef, { likedBy: newState ? arrayUnion(user.uid) : arrayRemove(user.uid), likes: increment(newState ? 1 : -1) });
    } else {
      const newState = !isFavorited;
      setIsFavorited(newState);
      await updateDoc(productRef, { favoritedBy: newState ? arrayUnion(user.uid) : arrayRemove(user.uid), favorites: increment(newState ? 1 : -1) });
    }
  };

  // 🚀 物理级修正：强制清理 ID 前缀，彻底终结 /rental/rental/ 导致的 404
  const cleanId = product.id.replace(/^rental\//, '');
  const finalHref = isRentalMode ? `/products/rental/${cleanId}` : `/products/${cleanId}`;

  const locationDisplay = [product.location?.city, product.location?.countryCode].filter(Boolean).join(', ');
  const imageSrc = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : (typeof product.images === 'string' ? product.images : '/placeholder.jpg');

  return (
    <Link href={finalHref} className="group block relative h-full outline-none">
      
      {/* 🚀 物理级圆角锁死：isolate + WebkitMaskImage 彻底终结长方形闪烁 Bug */}
      <div 
        className={cn(
          "relative flex flex-col h-full w-full overflow-hidden transition-all duration-700",
          "bg-[#08080A] border border-white/5 rounded-[2.5rem] isolate transform-gpu", 
          "hover:bg-[#0C0C12] hover:border-white/40 hover:shadow-[0_40px_80px_rgba(0,0,0,0.8)] hover:-translate-y-2",
          "animate-card-breathe", 
          className
        )}
        style={{ 
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          isolation: 'isolate'
        }}
      >
        
        {/* 📸 图像区域 */}
        <div className="p-0 relative shrink-0 aspect-[4/3] w-full bg-black/50 overflow-hidden">
            <Image 
                src={imageSrc} 
                alt="Luna Asset" 
                fill 
                className="object-cover transition-transform duration-[2s] group-hover:scale-110" 
                unoptimized={imageSrc.includes('alchemy')}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-transparent to-transparent opacity-60" />
            
            {/* 🚀 孟菲斯高对比度 Badge */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20 max-w-[calc(100%-2rem)]">
              {/* 寄售标签 - 如果是寄售商品则显示 */}
              {(product as any).isConsignment === true && (
                <Badge className="px-3 py-1 text-[9px] font-black uppercase tracking-widest border shadow-xl backdrop-blur-md bg-[#ff00ff]/20 border-[#ff00ff]/50 text-[#ff00ff]">
                  寄售
                </Badge>
              )}
              <Badge className={cn(
                "px-3 py-1 text-[9px] font-black uppercase tracking-widest border shadow-xl backdrop-blur-md",
                isRentalMode
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                  : "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
              )}>
                {product.category || (isRentalMode ? 'Property' : 'Asset')}
              </Badge>
            </div>
        </div>
        
        {/* 📝 内容区 */}
        <div className="flex flex-col flex-grow px-6 pt-5 pb-3 z-10">
            {/* 🚀 BBS 同款高级标题字体 */}
            <h3 className="font-headline text-lg font-black text-white/90 leading-tight line-clamp-2 mb-5 group-hover:text-primary transition-colors tracking-tight uppercase italic">
              {(product as any).title || product.name}
            </h3>
            
            <div className="flex items-center gap-3 mt-auto mb-2 min-w-0">
                {/* 🚀 头像色彩守护：光环变色，头像不变色 */}
                <div className="relative h-9 w-9 flex items-center justify-center shrink-0">
                    {/* 底层旋转光环 */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate blur-[1px]" />
                    {/* 顶层物理隔离头像本体 */}
                    <div className="relative h-[32px] w-[32px] rounded-full bg-black ring-[3px] ring-black overflow-hidden z-10">
                        <UserAvatar 
                            profile={{ 
                                displayName: latestSeller?.displayName || product.seller?.name, 
                                photoURL: latestSeller?.photoURL || (product.seller as any)?.avatarUrl 
                            }} 
                            className="h-full w-full object-cover"
                            style={{ filter: 'none !important' as any }}
                        />
                    </div>
                </div>
                <span className="flex-1 text-[11px] font-sans text-white/40 font-black uppercase tracking-widest truncate group-hover:text-white/70 transition-colors">
                    {latestSeller?.displayName || product.seller?.name || 'Protocol Node Synchronization'}
                </span>
            </div>
        </div>

        {/* 💰 价格与操作区 */}
        <div className="px-6 py-6 flex items-center justify-between border-t border-white/5 bg-white/[0.01]">
            <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                    <USDTLogo className="w-4 h-4" />
                    <span className="text-2xl font-headline font-black tracking-tighter text-white">
                        {Number(product.price || 0).toLocaleString()}
                    </span>
                    {isRentalMode && <span className="text-[10px] text-white/30 font-mono uppercase ml-1">/ NT</span>}
                </div>
                
                {/* 📍 地图位置信息 */}
                {locationDisplay && (
                    <div className="flex items-center text-[10px] text-primary/60 font-mono uppercase tracking-[0.15em] font-black overflow-hidden group-hover:text-primary transition-colors">
                        <MapPin className="h-3 w-3 mr-1.5 shrink-0" />
                        <span className="truncate">{locationDisplay}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className={cn("h-10 w-10 p-0 rounded-xl border transition-all", isFavorited ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]" : "bg-white/5 border-white/10 text-white/20")} onClick={(e) => handleInteraction(e, 'favorite')}>
                    <Star className={cn("h-4.5 w-4.5", isFavorited && "fill-yellow-400")} />
                </Button>
                <Button variant="ghost" size="sm" className={cn("h-10 px-4 flex gap-2 rounded-xl border transition-all", isLiked ? "bg-pink-500/10 border-pink-500/40 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.2)]" : "bg-white/5 border-white/10 text-white/20")} onClick={(e) => handleInteraction(e, 'like')}>
                    <Heart className={cn("h-4.5 w-4.5", isLiked && "fill-pink-400")} />
                    <span className="text-xs font-black">{likesCount > 0 ? likesCount : ''}</span>
                </Button>
            </div>
        </div>
      </div>

      <style jsx global>{`
        .font-headline { font-family: 'Playfair Display', serif; }
        @keyframes card-breathe {
          0%, 100% { border-color: rgba(255, 255, 255, 0.05); }
          50% { border-color: rgba(255, 255, 255, 0.25); }
        }
        .animate-card-breathe { animation: card-breathe 5s ease-in-out infinite; }
        
        @keyframes hue-rotate {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
        .animate-hue-rotate { animation: hue-rotate 6s linear infinite; }
      `}</style>
    </Link>
  );
}