'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile, BadgeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Award, Sparkles, Fingerprint, Globe, BadgeCheck } from 'lucide-react';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

const ProIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 51 30" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path fillRule="evenodd" clipRule="evenodd" d="M12.13 0.5H4.68C2.09 0.5 0 2.59 0 5.18V29.55H12.13V0.5ZM4.68 7.56H12.13V22.44C12.13 26.54 8.79 29.88 4.68 29.88H0V7.56H4.68Z" fill="#FDE047"/>
        <path d="M24.7727 7.5H19.3181V28H24.7727V7.5Z" fill="#FDE047"/>
        <path d="M24.7727 7.5C24.7727 5.39543 23.0773 3.7 20.9727 3.7H19.3181V7.5H24.7727Z" fill="#FDE047"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M42.9091 18C42.9091 24.3513 37.7604 29.5 31.4091 29.5C25.0578 29.5 19.9091 24.3513 19.9091 18C19.9091 11.6487 25.0578 6.5 31.4091 6.5C37.7604 6.5 42.9091 11.6487 42.9091 18ZM36.9659 18C36.9659 21.3137 34.4962 23.9318 31.4091 23.9318C28.322 23.9318 25.8523 21.3137 25.8523 18C25.8523 14.6863 28.322 12.0682 31.4091 12.0682C34.4962 12.0682 36.9659 14.6863 36.9659 18Z" fill="#FDE047"/>
        <circle cx="45.9091" cy="5.90909" r="4.5" fill="#E80A89"/>
    </svg>
);

interface UserAvatarProps {
    profile: (UserProfile | null) | { photoURL?: string | null; displayName?: string | null; displayedBadge?: BadgeType; isPro?: boolean };
    className?: string;
}

const badgeIcons: Record<Exclude<BadgeType, 'none'>, React.FC<{ className?: string }>> = {
    email: (props) => <CheckCircle2 {...props} />,
    kyc: (props) => <Fingerprint {...props} />,
    web3: (props) => <Globe {...props} />,
    pro: (props) => <ProIcon {...props} />,
    nft: (props) => <EthereumIcon {...props} />,
    influencer: (props) => <Award {...props} />,
    contributor: (props) => <Sparkles {...props} />,
    admin: (props) => <BadgeCheck {...props} />,
};

const badgeColors: Record<Exclude<BadgeType, 'none'>, string> = {
    email: 'text-green-400',
    kyc: 'text-yellow-400',
    web3: 'text-blue-400',
    pro: '',
    nft: 'text-blue-400',
    influencer: 'text-yellow-400',
    contributor: 'text-pink-500',
    admin: 'text-blue-500',
};

export function UserAvatar({ profile, className }: UserAvatarProps) {
    const displayedBadge = profile?.displayedBadge;

    const BadgeIcon = displayedBadge && displayedBadge !== 'none' 
        ? badgeIcons[displayedBadge] 
        : null;
    
    const badgeColorClass = displayedBadge && displayedBadge !== 'none'
        ? badgeColors[displayedBadge]
        : '';
        
    const badgeSize = displayedBadge === 'pro' ? 'h-4 w-auto' : 'h-4 w-4';

    return (
        <div className={cn("relative", className)}>
            <Avatar className="h-full w-full">
                <AvatarImage src={profile?.photoURL || undefined} alt={profile?.displayName || 'User'} />
                <AvatarFallback>{profile?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            
            {BadgeIcon && (
                 <div className="absolute -bottom-1 -right-1 z-10">
                    <BadgeIcon className={cn(badgeSize, badgeColorClass)} />
                </div>
            )}
        </div>
    );
}
