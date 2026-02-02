'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile, BadgeType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Shield, ShieldCheck, CheckCircle, Award, Sparkles, Fingerprint, Globe } from 'lucide-react';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.038 24l7.07-13.34-7.07 4.545-7.07-4.545L12.038 24zM12.038 0L4.968 10.66l7.07 4.545 7.07-4.545L12.038 0z"/>
    </svg>
);

interface UserAvatarProps {
    profile: (UserProfile | null) | { photoURL?: string | null; displayName?: string | null; displayedBadge?: BadgeType };
    className?: string;
}

const badgeIcons: Record<Exclude<BadgeType, 'none'>, React.FC<{ className?: string }>> = {
    email: (props) => <CheckCircle {...props} />,
    kyc: (props) => <Fingerprint {...props} />,
    web3: (props) => <Globe {...props} />,
    pro: (props) => <ShieldCheck {...props} />,
    nft: (props) => <EthereumIcon {...props} />,
    influencer: (props) => <Award {...props} />,
    contributor: (props) => <Sparkles {...props} />,
    admin: (props) => <Shield {...props} />,
};

const badgeColors: Record<Exclude<BadgeType, 'none'>, string> = {
    email: 'text-green-400',
    kyc: 'text-yellow-400',
    web3: 'text-blue-400',
    pro: 'text-green-500',
    nft: 'text-purple-400',
    influencer: 'text-yellow-400',
    contributor: 'text-pink-500',
    admin: 'text-destructive',
};

export function UserAvatar({ profile, className }: UserAvatarProps) {
    const displayedBadge = profile?.displayedBadge;
    const BadgeIcon = displayedBadge && displayedBadge !== 'none' ? badgeIcons[displayedBadge] : null;
    const isAdminBadge = displayedBadge === 'admin';

    return (
        <div className={cn(
            "relative",
            isAdminBadge && "rounded-full border-2 border-dashed border-destructive p-0.5 animate-pulse",
            className
        )}>
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
