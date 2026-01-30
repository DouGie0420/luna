'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from '@/hooks/use-translation';
import { type Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function MyListingsPage() {
    const { t } = useTranslation();
    const [userProducts, setUserProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            const allProducts = await getProducts();
            // In a real app, this would be filtered by the current user
            setUserProducts(allProducts.slice(0, 4));
            setLoading(false);
        };
        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="p-6 md:p-8 lg:p-12">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex flex-col space-y-3">
                            <Skeleton className="aspect-[4/3] w-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-4/5" />
                                <Skeleton className="h-4 w-3/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-6 md:p-8 lg:p-12">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline">{t('accountListings.title')}</h1>
                <Button asChild>
                    <Link href="/products/new">{t('accountListings.newItem')}</Link>
                </Button>
            </div>

            {userProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {userProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">{t('accountListings.noListingsTitle')}</h2>
                    <p className="text-muted-foreground mt-2 mb-6">{t('accountListings.noListingsDescription')}</p>
                    <Button asChild>
                       <Link href="/products/new">{t('accountListings.listItem')}</Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
