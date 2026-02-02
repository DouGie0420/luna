'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";
import { Gem, ShoppingBag, ShoppingCart, Star, MapPin, Users, UserPlus, ShieldCheck, Plus, Check, Globe, Fingerprint } from "lucide-react";
import { getUsers, getProducts } from "@/lib/data";
import { notFound, useParams } from "next/navigation";
import type { User, Product } from "@/lib/types";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProductCard } from "@/components/product-card";
import Link from 'next/link';
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);


export default function UserProfilePage() {
    const params = useParams();
    const { t } = useTranslation();
    const userId = params.id as string;
    
    const [user, setUser] = useState<User | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const { user: currentUser, profile: currentUserProfile } = useUser();
    const [isFollowing, setIsFollowing] = useState(false);
    const { toast } = useToast();
    const canInteract = currentUser && currentUserProfile?.kycStatus === 'Verified';
    
    const [followToast, setFollowToast] = useState<'followed' | 'unfollowed' | null>(null);
    const [permissionErrorToast, setPermissionErrorToast] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            const [allUsers, allProducts] = await Promise.all([getUsers(), getProducts()]);
            const foundUser = allUsers.find(u => u.id === userId);
            
            if (foundUser) {
                setUser(foundUser);
                const userProducts = allProducts.filter(p => p.seller.id === userId).slice(0, 4);
                setProducts(userProducts);
            }
            setLoading(false);
        };
        fetchData();

    }, [userId]);

    // Mock initial follow state
    useEffect(() => {
        if (currentUser && user) {
            // In a real app, check DB. Mocking it here.
            setIsFollowing(Math.random() > 0.5);
        }
    }, [currentUser, user]);
    
    useEffect(() => {
        if (permissionErrorToast) {
            setTimeout(() => {
                toast({
                    variant: 'destructive',
                    title: !currentUser ? t('common.loginToInteract') : t('common.verifyToInteract'),
                });
                setPermissionErrorToast(false);
            }, 0);
        }
    }, [permissionErrorToast, currentUser, t, toast]);

    useEffect(() => {
        if (followToast) {
            setTimeout(() => {
                toast({
                    title: followToast === 'followed' ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess'),
                });
                setFollowToast(null);
            }, 0);
        }
    }, [followToast, t, toast]);


    const handleFollowToggle = () => {
        if (!canInteract) {
            setPermissionErrorToast(true);
            return;
        }
        setIsFollowing(prev => {
            setFollowToast(!prev ? 'followed' : 'unfollowed');
            return !prev;
        });
    };

    if (loading) {
        return (
            <>
            <PageHeaderWithBackAndClose />
            <div className="p-6 md:p-8 lg:p-12">
                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-20 w-20 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <Skeleton className="h-16 w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                                <Skeleton className="h-16 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            </>
        )
    }

    if (!user) {
      return notFound();
    }

    return (
      <>
        <PageHeaderWithBackAndClose />
        <div className="p-6 md:p-8 lg:p-12">
            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <UserAvatar profile={user} className="h-20 w-20" />
                                <div>
                                    <div className="flex items-baseline gap-x-4">
                                        <CardTitle>{user.name}</CardTitle>
                                    </div>
                                    <Separator className="my-1.5" />
                                    <div className="flex items-center gap-x-3 text-sm text-muted-foreground">
                                        <Link href={`/user/${user.id}/followers`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.followersCount || 0}</span> {t('userProfile.followers')}
                                        </Link>
                                        <span>&middot;</span>
                                        <Link href={`/user/${user.id}/following`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.followingCount || 0}</span> {t('userProfile.following')}
                                        </Link>
                                        <span>&middot;</span>
                                        <Link href={`/user/${user.id}/listings`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.postsCount || 0}</span> {t('userProfile.posts')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                             {currentUser && currentUser.uid !== userId && (
                                <Button 
                                    onClick={handleFollowToggle} 
                                    disabled={!canInteract} 
                                    variant={'default'}
                                    className={cn("rounded-md", isFollowing && 'bg-yellow-400 text-black hover:bg-yellow-500')}
                                >
                                    {isFollowing ? (
                                        <><Check className="mr-2 h-4 w-4" />{t('userProfile.alreadyFollowing')}</>
                                    ) : (
                                        <><Plus className="mr-2 h-4 w-4" />{t('userProfile.follow')}</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg animate-glow">
                            <Gem className="h-10 w-10 text-primary" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">{t('accountPage.creditLevel')}</p>
                                <p className="text-2xl font-bold">{user.creditLevel || 'Newcomer'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">{t('accountPage.creditScore')}</p>
                                <p className="text-2xl font-bold">{user.creditScore || 0}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <Star className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('accountPage.rating')}</p>
                                    <p className="font-bold">
                                        {user.rating.toFixed(1) || '0.0'} 
                                        <span className="text-xs text-muted-foreground font-normal"> ({user.reviews || 0} {t('accountPage.reviews')})</span>
                                    </p>
                                </div>
                            </div>
                            <Link href={`/user/${user.id}/listings`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                <div className="flex items-center gap-3 p-3">
                                    <ShoppingBag className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                        <p className="font-bold group-hover:underline">{user.onSaleCount ?? 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href={`/user/${user.id}/sold`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                <div className="flex items-center gap-3 p-3">
                                    <ShoppingCart className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('sellerProfile.sold')}</p>
                                        <p className="font-bold group-hover:underline">{user.itemsSold || 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <div className="p-3 bg-secondary/30 rounded-lg flex flex-col justify-center">
                                <p className="text-sm text-muted-foreground mb-2">{t('userProfile.verifications')}</p>
                                <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                                    {user.isPro && (
                                        <div className="flex items-center gap-1.5 text-green-500">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.pro')}</span>
                                        </div>
                                    )}
                                    {user.isWeb3Verified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <Globe className="h-4 w-4" />
                                            <span>WEB3</span>
                                        </div>
                                    )}
                                    {user.isNftVerified && (
                                        <div className="flex items-center gap-1.5 text-cyan-400">
                                            <EthereumIcon className="h-4 w-4" />
                                            <span>NFT</span>
                                        </div>
                                    )}
                                    {user.kycStatus === 'Verified' && (
                                        <div className="flex items-center gap-1.5 text-yellow-400">
                                            <Fingerprint className="h-4 w-4" />
                                            <span>{t('userProfile.kyc')}</span>
                                        </div>
                                    )}
                                    {!user.isPro && !user.isWeb3Verified && !user.isNftVerified && user.kycStatus !== 'Verified' && (
                                        <p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {products.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('userProfile.latestListings').replace('{userName}', user.name)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </>
    )
}
