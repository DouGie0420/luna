'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile, BadgeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ShieldCheck, CheckCircle2, Award, Sparkles, Fingerprint, Globe, BadgeCheck } from 'lucide-react';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

interface UserAvatarProps {
    profile: (UserProfile | null) | { photoURL?: string | null; displayName?: string | null; displayedBadge?: BadgeType };
    className?: string;
}

const badgeIcons: Record<Exclude<BadgeType, 'none'>, React.FC<{ className?: string }>> = {
    email: (props) => <CheckCircle2 {...props} />,
    kyc: (props) => <Fingerprint {...props} />,
    web3: (props) => <Globe {...props} />,
    pro: (props) => <ShieldCheck {...props} />,
    nft: (props) => <EthereumIcon {...props} />,
    influencer: (props) => <Award {...props} />,
    contributor: (props) => <Sparkles {...props} />,
    admin: (props) => <BadgeCheck {...props} />,
};

const badgeColors: Record<Exclude<BadgeType, 'none'>, string> = {
    email: 'text-green-400',
    kyc: 'text-yellow-400',
    web3: 'text-blue-400',
    pro: 'text-green-500',
    nft: 'text-blue-400',
    influencer: 'text-yellow-400',
    contributor: 'text-pink-500',
    admin: 'text-blue-500',
};

export function UserAvatar({ profile, className }: UserAvatarProps) {
    const displayedBadge = profile?.displayedBadge;
    const BadgeIcon = displayedBadge && displayedBadge !== 'none' ? badgeIcons[displayedBadge] : null;

    return (
        <div className={cn("relative", className)}>
            <Avatar className="h-full w-full">
                <AvatarImage src={profile?.photoURL || undefined} alt={profile?.displayName || 'User'} />
                <AvatarFallback>{profile?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            {BadgeIcon && (
                 <div className="absolute -bottom-1 -right-1 z-10 rounded-full bg-black/80 p-0.5 backdrop-blur-sm">
                    <BadgeIcon className={cn("h-4 w-4", badgeColors[displayedBadge!])} />
                </div>
            )}
        </div>
    );
}
