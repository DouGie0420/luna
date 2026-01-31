'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, ShieldCheck, ShoppingBag, ShoppingCart, ThumbsUp, Meh, ThumbsDown, Gem, Users, UserPlus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useTranslation } from "@/hooks/use-translation";
import Link from 'next/link';

export function SellerProfileCard({ product }: { product: Product }) {
    const { t } = useTranslation();
    const { seller, location } = product;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={seller.avatarUrl} alt={seller.name} />
                                <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-bold text-lg">{seller.name}</p>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Star className="h-4 w-4 fill-primary text-primary" />
                                    <span>{seller.rating.toFixed(1)} ({t('sellerProfile.onSaleCount').replace('{count}', (seller.itemsOnSale ?? 0).toString())})</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{location.city}, {location.countryCode}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-start gap-1 text-sm font-medium">
                                {seller.isPro && (
                                    <div className="flex items-center gap-1.5 text-green-400">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>{t('userProfile.pro')}</span>
                                    </div>
                                )}
                                {seller.isWeb3Verified && (
                                    <div className="flex items-center gap-1.5 text-blue-400">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span>{t('userProfile.web3')}</span>
                                    </div>
                                )}
                                {seller.kycStatus === 'Verified' && (
                                    <div className="flex items-center gap-1.5 text-cyan-400">
                                        <ShieldCheck className="h-4 w-4" />
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
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={seller.avatarUrl} alt={seller.name} />
                            <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-xl font-bold">{seller.name}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="h-4 w-4 fill-primary text-primary" />
                                <span>{seller.rating.toFixed(1)} ({seller.reviews} {t('sellerProfile.reviews')})</span>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg animate-glow">
                        <Gem className="h-10 w-10 text-primary" />
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground">{t('accountPage.creditLevel')}</p>
                            <p className="text-2xl font-bold">{seller.creditLevel || 'Newcomer'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">{t('accountPage.creditScore')}</p>
                            <p className="text-2xl font-bold">{seller.creditScore || 0}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href={`/user/${seller.id}/listings`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                            <ShoppingBag className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                <p className="font-bold hover:underline">
                                    {seller.itemsOnSale ?? 0}
                                </p>
                            </div>
                        </Link>
                        <Link href={`/user/${seller.id}/sold`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                            <ShoppingCart className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">{t('sellerProfile.sold')}</p>
                                <p className="font-bold hover:underline">
                                    {seller.itemsSold ?? 0}
                                </p>
                            </div>
                        </Link>
                        <Link href={`/user/${seller.id}/followers`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                            <Users className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">{t('userProfile.followers')}</p>
                                <p className="font-bold hover:underline">{seller.followersCount || 0}</p>
                            </div>
                        </Link>
                        <Link href={`/user/${seller.id}/following`} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                            <UserPlus className="h-6 w-6 text-primary" />
                            <div>
                                <p className="text-sm text-muted-foreground">{t('userProfile.following')}</p>
                                <p className="font-bold hover:underline">{seller.followingCount || 0}</p>
                            </div>
                        </Link>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">{t('userProfile.verifications')}</h4>
                         <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                            {seller.isPro && (
                                <div className="flex items-center gap-1.5 text-green-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{t('userProfile.pro')}</span>
                                </div>
                            )}
                            {seller.isWeb3Verified && (
                                <div className="flex items-center gap-1.5 text-blue-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{t('userProfile.web3')}</span>
                                </div>
                            )}
                            {seller.kycStatus === 'Verified' && (
                                <div className="flex items-center gap-1.5 text-cyan-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{t('userProfile.kyc')}</span>
                                </div>
                            )}
                            {!seller.isPro && !seller.isWeb3Verified && seller.kycStatus !== 'Verified' && (
                                <p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">{t('sellerProfile.reviewDetails')}</h4>
                        <div className="space-y-1">
                             <Link href={`/user/${seller.id}/reviews?type=good`} className="block rounded-lg -mx-3 px-3 py-1.5 hover:bg-accent transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-green-400"><ThumbsUp className="h-4 w-4" /> {t('sellerProfile.goodReviews')}</span>
                                    <span className="font-medium hover:underline">{seller.goodReviews ?? 0}</span>
                                </div>
                             </Link>
                             <Link href={`/user/${seller.id}/reviews?type=neutral`} className="block rounded-lg -mx-3 px-3 py-1.5 hover:bg-accent transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-yellow-400"><Meh className="h-4 w-4" /> {t('sellerProfile.neutralReviews')}</span>
                                    <span className="font-medium hover:underline">{seller.neutralReviews ?? 0}</span>
                                </div>
                             </Link>
                             <Link href={`/user/${seller.id}/reviews?type=bad`} className="block rounded-lg -mx-3 px-3 py-1.5 hover:bg-accent transition-colors">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="flex items-center gap-2 text-red-400"><ThumbsDown className="h-4 w-4" /> {t('sellerProfile.badReviews')}</span>
                                    <span className="font-medium hover:underline">{seller.badReviews ?? 0}</span>
                                </div>
                             </Link>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
