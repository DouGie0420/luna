'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";
import { Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck, Plus, Check, Globe, Fingerprint } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import type { UserProfile, Product } from "@/lib/types";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProductCard } from "@/components/product-card";
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { doc, collection, query, where, updateDoc, increment, arrayUnion, arrayRemove, getDocs } from "firebase/firestore";

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

function UserProfileSkeleton() {
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
                            <Skeleton className="h-24 w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}


export default function UserProfilePage() {
    const params = useParams();
    const { t } = useTranslation();
    const loginId = params.loginId as string;
    
    const { user: currentUser, profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [user, setUser] = useState<UserProfile | null>(null);
    const [userLoading, setUserLoading] = useState(true);

    const productsQuery = useMemo(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'products'), where('sellerId', '==', user.uid), where('status', '==', 'active'));
    }, [firestore, user]);
    const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery);
    
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (!firestore || !loginId) return;
        
        const fetchUser = async () => {
            setUserLoading(true);
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('loginId', '==', loginId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setUser(null);
            } else {
                const userData = querySnapshot.docs[0].data() as UserProfile;
                setUser(userData);
                 if (currentUserProfile && userData) {
                    setIsFollowing(currentUserProfile.following?.includes(userData.uid) || false);
                }
            }
            setUserLoading(false);
        }
        fetchUser();

    }, [firestore, loginId, currentUserProfile]);
    

    const handleFollowToggle = async () => {
        if (!currentUser || !currentUserProfile || !user || !firestore) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }

        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const targetUserRef = doc(firestore, 'users', user.uid);
        const newFollowingState = !isFollowing;

        try {
            await updateDoc(currentUserRef, {
                following: newFollowingState ? arrayUnion(user.uid) : arrayRemove(user.uid),
                followingCount: increment(newFollowingState ? 1 : -1)
            });
            await updateDoc(targetUserRef, {
                followers: newFollowingState ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
                followersCount: increment(newFollowingState ? 1 : -1)
            });
            
            setIsFollowing(newFollowingState);
            toast({ title: newFollowingState ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess') });

        } catch (error) {
            console.error("Failed to update follow status:", error);
            toast({ variant: 'destructive', title: 'Action failed. Please try again.' });
        }
    };

    if (userLoading || productsLoading) {
        return <UserProfileSkeleton />;
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
                                        <CardTitle>{user.displayName}</CardTitle>
                                    </div>
                                    <Separator className="my-1.5" />
                                    <div className="flex items-center gap-x-3 text-sm text-muted-foreground">
                                        <Link href={`/u/${user.loginId}/followers`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.followersCount || 0}</span> {t('userProfile.followers')}
                                        </Link>
                                        <span>&middot;</span>
                                        <Link href={`/u/${user.loginId}/following`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.followingCount || 0}</span> {t('userProfile.following')}
                                        </Link>
                                        <span>&middot;</span>
                                        <Link href={`/u/${user.loginId}/listings`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.postsCount || 0}</span> {t('userProfile.posts')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                             {currentUser && currentUser.uid !== user.uid && (
                                <Button 
                                    onClick={handleFollowToggle} 
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
                                        {(user.rating || 0).toFixed(1)} 
                                        <span className="text-xs text-muted-foreground font-normal"> ({user.reviewsCount || 0} {t('accountPage.reviews')})</span>
                                    </p>
                                </div>
                            </div>
                            <Link href={`/u/${user.loginId}/listings`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                <div className="flex items-center gap-3 p-3">
                                    <ShoppingBag className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                        <p className="font-bold group-hover:underline">{user.onSaleCount ?? 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href={`/u/${user.loginId}/sold`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                <div className="flex items-center gap-3 p-3">
                                    <ShoppingCart className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('sellerProfile.sold')}</p>
                                        <p className="font-bold group-hover:underline">{user.salesCount || 0}</p>
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
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <EthereumIcon className="h-4 w-4 stroke-blue-400" />
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

                {products && products.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('userProfile.latestListings').replace('{userName}', user.displayName)}</CardTitle>
                             <Button asChild variant="ghost">
                                <Link href={`/u/${user.loginId}/listings`}>View All</Link>
                             </Button>
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
