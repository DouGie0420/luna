'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar'; // 🚀 引入房东头像组件

// 🚀 内置官方 USDT Logo
const USDTLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 2000 2000" xmlns="http://www.w3.org/2000/svg">
    <path fill="#26A17B" d="M1000 0c552.285 0 1000 447.715 1000 1000s-447.715 1000-1000 1000S0 1552.285 0 1000 447.715 0 1000 0z"/>
    <path fill="#FFF" d="M1087.5 618.75v191.667c191.666 12.5 347.917 47.916 347.917 89.583 0 41.667-156.25 77.083-347.917 89.583v454.167H912.5V989.583c-191.667-12.5-347.917-47.916-347.917-89.583 0-41.667 156.25-77.083 347.917-89.583V618.75h491.667V462.5H604.167v156.25h483.333z"/>
  </svg>
);

const cardStyles = `
  .shard-clip { clip-path: polygon(0% 2%, 100% 0%, 98% 98%, 2% 100%); }
  .tech-mono { font-family: 'JetBrains Mono', monospace; }
  
  /* 🚀 全局流体呼吸边框 */
  @keyframes breatheGlow {
    0% { box-shadow: 0 0 10px rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
    50% { box-shadow: 0 0 25px rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.4); }
    100% { box-shadow: 0 0 10px rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
  }
  .breathe-card-border { animation: breatheGlow 4s ease-in-out infinite; }
`;

export function PropertyCard({ property }: { property: any }) {
    if (!property) return null;

    return (
        <Link href={`/products/rental/${property.id}`}>
            <motion.div 
                whileHover={{ y: -10, scale: 1.01 }}
                // 🚀 加入 breathe-card-border 和 1.5px 边框
                className="group relative bg-[#0B0B0B] border-[1.5px] border-white/10 rounded-[2.5rem] overflow-hidden transition-all hover:border-purple-500/50 hover:shadow-[0_0_40px_rgba(26,11,46,1)] breathe-card-border"
            >
                <style dangerouslySetInnerHTML={{ __html: cardStyles }} />
                
                {/* 图片区：非对称剪裁 */}
                <div className="relative h-72 w-full overflow-hidden shard-clip">
                    <Image 
                        src={Array.isArray(property.images) ? property.images[0] : (property.images || '/placeholder.jpg')} 
                        alt={property.title || property.name || "Luna Asset"} 
                        fill 
                        className="object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    
                    {/* 地理坐标浮层 */}
                    <div className="absolute top-4 left-6 tech-mono text-[8px] text-white/40 tracking-[0.3em] font-bold">
                        LOC::{property.location?.lat?.toFixed(3) || '13.000'} / {property.location?.lng?.toFixed(3) || '100.000'}
                    </div>

                    {/* 信任分勋章 */}
                    <div className="absolute bottom-4 right-6 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-purple-400/50">
                        <Star className="w-3 h-3 text-white fill-white" />
                        <span className="tech-mono text-[10px] font-black text-white">{property.trustScore || 99.8}</span>
                    </div>
                </div>

                {/* 信息区 */}
                <div className="p-8 pb-6 flex flex-col gap-5">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-3 overflow-hidden flex-1">
                            <h3 className="text-xl font-black italic tracking-tighter titanium-text truncate">
                                {property.title || property.name}
                            </h3>
                            
                            {/* 🚀 插入：房东信息（在标题下面） */}
                            <div className="flex items-center gap-2 text-xs text-white/50">
                                <UserAvatar profile={{ displayName: property.seller?.name || property.ownerDisplayName, photoURL: property.seller?.avatarUrl || property.ownerAvatarUrl }} className="h-5 w-5 ring-1 ring-white/10" />
                                <span className="font-headline tracking-[0.1em] font-bold uppercase truncate">
                                    {property.seller?.name || property.ownerDisplayName || 'Protocol User'}
                                </span>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Per Night</p>
                            {/* 🚀 USDT Logo 与真实价格动态读取，彻底告别写死 150 */}
                            <div className="flex items-center justify-end gap-1.5">
                                <USDTLogo className="w-5 h-5 drop-shadow-[0_0_8px_rgba(38,161,123,0.5)]" />
                                <span className="text-2xl font-black text-white tech-mono tracking-tighter">
                                    {Number(property.price || property.pricePerDay || 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 🚀 位置与房源类型 */}
                    <div className="flex items-center gap-3 text-white/60 text-xs font-medium border-t border-white/5 pt-5">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                        <span className="uppercase tracking-widest truncate max-w-[120px]">
                            {property.location?.city || property.location?.countryCode || 'Cyber City'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                        <span className="uppercase tracking-widest text-purple-400 font-bold truncate">
                            {property.propertyType || property.category || 'Rental Node'}
                        </span>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}