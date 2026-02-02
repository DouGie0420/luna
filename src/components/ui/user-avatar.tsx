'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile, BadgeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Award, Sparkles, Fingerprint, Globe, BadgeCheck, ShieldCheck } from 'lucide-react';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);


interface UserAvatarProps {
    profile: (UserProfile | null) | { photoURL?: string | null; displayName?: string | null; displayedBadge?: BadgeType; isPro?: boolean };
    className?: string;
}

const badgeIcons: Record<Exclude<BadgeType, 'none' | 'pro' | 'email'>, React.FC<{ className?: string }>> = {
    kyc: (props) => <Fingerprint {...props} />,
    web3: (props) => <Globe {...props} />,
    nft: (props) => <EthereumIcon {...props} />,
    influencer: (props) => <Award {...props} />,
    contributor: (props) => <Sparkles {...props} />,
    admin: (props) => <BadgeCheck {...props} />,
};

const badgeColors: Record<Exclude<BadgeType, 'none' | 'pro' | 'email'>, string> = {
    kyc: 'text-yellow-400',
    web3: 'text-blue-400',
    nft: 'text-blue-400',
    influencer: 'text-yellow-400',
    contributor: 'text-pink-500',
    admin: 'text-blue-500',
};

export function UserAvatar({ profile, className }: UserAvatarProps) {
    const displayedBadge = profile?.displayedBadge;

    const OtherBadgeIcon = displayedBadge && displayedBadge !== 'none' && displayedBadge !== 'pro' && displayedBadge !== 'email'
        ? badgeIcons[displayedBadge as Exclude<BadgeType, 'none' | 'pro' | 'email'>] 
        : null;
    
    const badgeColorClass = OtherBadgeIcon && displayedBadge
        ? badgeColors[displayedBadge as Exclude<BadgeType, 'none' | 'pro' | 'email'>]
        : '';
        
    const badgeSize = 'h-4 w-4';

    return (
        <div className={cn("relative", className)}>
            <Avatar className="h-full w-full">
                <AvatarImage src={profile?.photoURL || undefined} alt={profile?.displayName || 'User'} />
                <AvatarFallback>{profile?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            
            {displayedBadge === 'pro' ? (
                 <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
                    <span className="font-headline text-[10px] text-yellow-300 drop-shadow-lg whitespace-nowrap">PRO</span>
                </div>
            ) : displayedBadge === 'email' ? (
                // Email verified is the default, so we don't show a badge for it unless explicitly selected
                <div className="absolute -bottom-1 -right-1 z-10">
                    {/* You can add a specific icon for email if you want, but for now it's hidden to declutter */}
                </div>
            ) : OtherBadgeIcon ? (
                 <div className="absolute -bottom-1 -right-1 z-10">
                    <OtherBadgeIcon className={cn(badgeSize, badgeColorClass)} />
                </div>
            ) : null}
        </div>
    );
}
