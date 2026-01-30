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
import { Gem, ShoppingBag, ShoppingCart, Star, MapPin, Users, UserPlus, ShieldCheck } from "lucide-react";
import { getUsers, getProducts } from "@/lib/data";
import { notFound, useParams } from "next/navigation";
import type { User, Product } from "@/lib/types";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProductCard } from "@/components/product-card";
import Link from "next/link";

export default function UserProfilePage() {
    const params = useParams();
    const { t } = useTranslation();
    const userId = params.id as string;
    
    const [user, setUser] = useState<User | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

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
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle>{user.name}</CardTitle>
                                {user.location && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                        <MapPin className="h-4 w-4" />
                                        <span>{user.location.city}, {user.location.countryCode}</span>
                                    </div>
                                )}
                            </div>
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
                             <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <ShoppingBag className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                    <p className="font-bold">{user.itemsOnSale || 0}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <ShoppingCart className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('sellerProfile.sold')}</p>
                                    <p className="font-bold">{user.itemsSold || 0}</p>
                                </div>
                            </div>
                             <Link href={`/user/${user.id}/followers`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-3 p-3">
                                    <Users className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('userProfile.followers')}</p>
                                        <p className="font-bold">{user.followersCount || 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href={`/user/${user.id}/following`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                                <div className="flex items-center gap-3 p-3">
                                    <UserPlus className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('userProfile.following')}</p>
                                        <p className="font-bold">{user.followingCount || 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <div className="p-3 bg-secondary/30 rounded-lg flex flex-col justify-center">
                                <p className="text-sm text-muted-foreground mb-2">{t('userProfile.verifications')}</p>
                                <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                                    {user.isPro && (
                                        <div className="flex items-center gap-1.5 text-green-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.pro')}</span>
                                        </div>
                                    )}
                                    {user.isWeb3Verified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.web3')}</span>
                                        </div>
                                    )}
                                    {user.kycStatus === 'Verified' && (
                                        <div className="flex items-center gap-1.5 text-cyan-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.kyc')}</span>
                                        </div>
                                    )}
                                    {!user.isPro && !user.isWeb3Verified && user.kycStatus !== 'Verified' && (
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
