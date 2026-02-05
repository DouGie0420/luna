
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Star, MapPin, ShieldCheck, ShoppingBag, ShoppingCart, ThumbsUp, Meh, ThumbsDown, Gem, Users, UserPlus, Globe, Fingerprint } from 'lucide-react';
import type { Product, UserProfile } from '@/lib/types';
import { useTranslation } from "@/hooks/use-translation";
import Link from 'next/link';
import React, { useMemo } from 'react';
import { useDoc, useFirestore } from "@/firebase";
import { doc } from 'firebase/firestore';

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);


export function SellerProfileCard({ product }: { product: Product }) {
    const { t } = useTranslation();
    const { seller, location } = product;
    const firestore = useFirestore();

    const sellerProfileRef = useMemo(() => 
        firestore ? doc(firestore, 'users', seller.id) : null,
    [firestore, seller.id]);
    const { data: sellerProfile } = useDoc<UserProfile>(sellerProfileRef);

    const displayUser = sellerProfile || seller;
    const onSaleCount = sellerProfile?.onSaleCount ?? displayUser.onSaleCount ?? 0;
    const displayName = displayUser.displayName || displayUser.name;
    const profileUrl = `/@${displayUser.loginId || displayUser.id}`;


    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <UserAvatar profile={displayUser} className="h-16 w-16" />
                            <div className="flex-1">
                                <p className="font-bold text-lg">{displayName}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="h-4 w-4 fill-primary text-primary" />
                                    <span>{(displayUser.rating || 0).toFixed(1)} ({t('sellerProfile.onSaleCount').replace('{count}', onSaleCount.toString())})</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{location.city}, {location.countryCode}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-start gap-1 text-sm font-medium">
                                {displayUser.isPro && (
                                    <div className="flex items-center gap-1.5 text-green-500">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>{t('userProfile.pro')}</span>
                                    </div>
                                )}
                                {displayUser.isWeb3Verified && (
                                    <div className="flex items-center gap-1.5 text-blue-400">
                                        <Globe className="h-4 w-4" />
                                        <span>WEB3</span>
                                    </div>
                                )}
                                {displayUser.isNftVerified && (
                                    <div className="flex items-center gap-1.5 text-blue-400">
                                        <EthereumIcon className="h-4 w-4 stroke-blue-400" />
                                        <span>NFT</span>
                                    </div>
                                )}
                                {displayUser.kycStatus === 'Verified' && (
                                    <div className="flex items-center gap-1.5 text-yellow-400">
                                        <Fingerprint className="h-4 w-4" />
                                        <span>{t('userProfile.kyc')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <UserAvatar profile={displayUser} className="h-12 w-12" />
                        <div>
                            <p className="text-xl font-bold">{displayName}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-4 w-4 fill-primary text-primary" />
                                <span>{(displayUser.rating || 0).toFixed(1)} ({displayUser.reviewsCount || 0} {t('sellerProfile.reviews')})</span>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg animate-glow">
                        <Gem className="h-10 w-10 text-primary" />
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{t('accountPage.creditLevel')}</p>
                            <p className="text-2xl font-bold">{displayUser.creditLevel || 'Newcomer'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">{t('accountPage.creditScore')}</p>
                            <p className="text-2xl font-bold">{displayUser.creditScore || 0}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href={`${profileUrl}/listings`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors group">
                            <ShoppingBag className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground group-hover:underline">{t('sellerProfile.onSale')}</p>
                                <p className="font-bold">
                                    {onSaleCount}
                                </p>
                            </div>
                        </Link>
                        <Link href={`${profileUrl}/sold`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors group">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground group-hover:underline">{t('sellerProfile.sold')}</p>
                                <p className="font-bold">
                                    {displayUser.salesCount ?? 0}
                                </p>
                            </div>
                        </Link>
                        <Link href={`${profileUrl}/followers`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors group">
                            <Users className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground group-hover:underline">{t('userProfile.followers')}</p>
                                <p className="font-bold">{displayUser.followersCount || 0}</p>
                            </div>
                        </Link>
                        <Link href={`${profileUrl}/following`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors group">
                            <UserPlus className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground group-hover:underline">{t('userProfile.following')}</p>
                                <p className="font-bold">{displayUser.followingCount || 0}</p>
                            </div>
                        </Link>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">{t('userProfile.verifications')}</h4>
                         <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                            {displayUser.isPro && (
                                <div className="flex items-center gap-1.5 text-green-500">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{t('userProfile.pro')}</span>
                                </div>
                            )}
                            {displayUser.isWeb3Verified && (
                                <div className="flex items-center gap-1.5 text-blue-400">
                                    <Globe className="h-4 w-4" />
                                    <span>WEB3</span>
                                </div>
                            )}
                            {displayUser.isNftVerified && (
                                <div className="flex items-center gap-1.5 text-blue-400">
                                    <EthereumIcon className="h-4 w-4 stroke-blue-400" />
                                    <span>NFT</span>
                                </div>
                            )}
                            {displayUser.kycStatus === 'Verified' && (
                                <div className="flex items-center gap-1.5 text-yellow-400">
                                    <Fingerprint className="h-4 w-4" />
                                    <span>{t('userProfile.kyc')}</span>
                                </div>
                            )}
                            {!displayUser.isPro && !displayUser.isWeb3Verified && !displayUser.isNftVerified && displayUser.kycStatus !== 'Verified' && (
                                <p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">{t('sellerProfile.reviewDetails')}</h4>
                        <div className="space-y-1">
                             <Link href={`${profileUrl}/reviews?type=good`} className="block rounded-lg -mx-3 px-3 py-1.5 hover:bg-accent transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-green-400"><ThumbsUp className="h-4 w-4" /> {t('sellerProfile.goodReviews')}</span>
                                    <span className="font-medium hover:underline">{displayUser.goodReviews ?? 0}</span>
                                </div>
                             </Link>
                             <Link href={`${profileUrl}/reviews?type=neutral`} className="block rounded-lg -mx-3 px-3 py-1.5 hover:bg-accent transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-yellow-400"><Meh className="h-4 w-4" /> {t('sellerProfile.neutralReviews')}</span>
                                    <span className="font-medium hover:underline">{displayUser.neutralReviews ?? 0}</span>
                                </div>
                             </Link>
                             <Link href={`${profileUrl}/reviews?type=bad`} className="block rounded-lg -mx-3 px-3 py-1.5 hover:bg-accent transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-red-400"><ThumbsDown className="h-4 w-4" /> {t('sellerProfile.badReviews')}</span>
                                    <span className="font-medium hover:underline">{displayUser.badReviews ?? 0}</span>
                                </div>
                             </Link>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
