'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile, BadgeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Award, Sparkles, Fingerprint, Globe, CheckCircle } from 'lucide-react';
import { AdminBadgeIcon } from './admin-badge-icon';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

// This type accepts shapes from both UserProfile and the simpler User type
// used in nested objects like post.author.
type AvatarProfile = {
  photoURL?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  name?: string | null;
  displayedBadge?: BadgeType;
  isPro?: boolean;
} | null;


interface UserAvatarProps {
    profile: AvatarProfile;
    className?: string;
}

const badgeIcons: Record<Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>, React.FC<{ className?: string }>> = {
    kyc: (props) => <Fingerprint {...props} />,
    web3: (props) => <Globe {...props} />,
    nft: (props) => <EthereumIcon {...props} />,
    influencer: (props) => <Award {...props} />,
    contributor: (props) => <Sparkles {...props} />,
};

const badgeColors: Record<Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>, string> = {
    kyc: 'text-yellow-400',
    web3: 'text-blue-400',
    nft: 'text-blue-400',
    influencer: 'text-yellow-400',
    contributor: 'text-pink-500',
};

export function UserAvatar({ profile, className }: UserAvatarProps) {
    const displayedBadge = profile?.displayedBadge;

    const OtherBadgeIcon = displayedBadge && !['none', 'pro', 'email', 'admin'].includes(displayedBadge)
        ? badgeIcons[displayedBadge as Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>] 
        : null;
    
    const badgeColorClass = OtherBadgeIcon && displayedBadge
        ? badgeColors[displayedBadge as Exclude<BadgeType, 'none' | 'pro' | 'email' | 'admin'>]
        : '';
        
    const badgeSize = 'h-4 w-4';

    // 🚀 核心优化：获取名字并生成专属的防弹兜底头像
    const name = profile?.displayName || (profile as any)?.name || 'Luna_User';
    const dicebearFallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const imageUrl = profile?.photoURL || (profile as any)?.avatarUrl || dicebearFallback;

    return (
        <div className={cn("relative", className)}>
            <Avatar className="h-full w-full">
                {/* 正常加载逻辑：如果传入的是死链接，shadcn 会自动隐藏这个标签 */}
                <AvatarImage src={imageUrl} alt={name} />
                {/* 终极防线：如果图片死链了，显示带有专属默认头像的 Fallback，不再只有个干巴巴的字母 */}
                <AvatarFallback className="bg-transparent">
                    <img src={dicebearFallback} alt={name} className="h-full w-full object-cover" />
                </AvatarFallback>
            </Avatar>
            
            {displayedBadge === 'pro' ? (
                 <div className="absolute -bottom-1.5 left-0 right-0 z-10 text-center">
                    <p className="font-headline text-[8px] text-yellow-300 drop-shadow-lg whitespace-nowrap pt-px">PRO</p>
                </div>
            ) : displayedBadge === 'admin' ? (
                <div className="absolute -bottom-1.5 left-0 right-0 z-10 flex justify-center">
                    <AdminBadgeIcon className="h-5 w-5 relative left-px" />
                </div>
            ) : displayedBadge === 'email' ? (
                <div className="absolute -bottom-1 -right-1 z-10">
                    <CheckCircle className={cn(badgeSize, "text-green-400")} />
                </div>
            ) : OtherBadgeIcon ? (
                 <div className="absolute -bottom-1 -right-1 z-10">
                    <OtherBadgeIcon className={cn(badgeSize, badgeColorClass)} />
                </div>
            ) : null}
        </div>
    );
}