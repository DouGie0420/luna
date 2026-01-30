'use client';

import { useState, useEffect } from 'react';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { SnakeBorder } from '@/components/snake-border';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc } from '@/firebase';
import type { Product, Promo } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

function PromoPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12 md:py-20">
             <div className="relative mb-20 p-8 text-center border-2 border-primary/50 overflow-hidden">
                <Skeleton className="h-24 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-full max-w-2xl mx-auto mt-4" />
                <Skeleton className="h-6 w-4/5 max-w-xl mx-auto mt-2" />
                <div className="mt-8 flex justify-center gap-4">
                    <Skeleton className="h-14 w-32" />
                    <Skeleton className="h-14 w-32" />
                </div>
             </div>
             <div>
                <h2 className="font-headline text-3xl font-semibold mb-8 text-center"><Skeleton className="h-8 w-48 mx-auto" /></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {[...Array(8)].map((_, i) => (
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
        </div>
    )
}


export default function CyberMondayPromoPage() {
    const firestore = useFirestore();
    // In a real CMS, this ID would be dynamic. For now, we hardcode it.
    const promoRef = firestore ? doc(firestore, 'promos', 'cyber-monday') : null;
    const { data: promo, loading: promoLoading } = useDoc<Promo>(promoRef);

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    useEffect(() => {
        if (!promo) return;

        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const allProducts = await getProducts();
                const featuredIds = promo.featuredProductIds || [];
                // Fallback to first 8 products if specific ones aren't defined in DB
                const promoProducts = featuredIds.length > 0 
                    ? allProducts.filter(p => featuredIds.includes(p.id))
                    : allProducts.slice(0, 8);
                setProducts(promoProducts);
            } catch (error) {
                console.error("Failed to fetch products for promo", error);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, [promo]);
    

    if (promoLoading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <PromoPageSkeleton />
            </>
        )
    }

    if (!promo) {
        return (
             <>
                <PageHeaderWithBackAndClose />
                <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                    <h1 className="font-headline text-4xl">Promotion Not Found</h1>
                    <p className="mt-4 text-muted-foreground">The requested promotion could not be loaded. It might be expired or removed.</p>
                    <Button asChild className="mt-6">
                        <Link href="/">Return to Homepage</Link>
                    </Button>
                </div>
             </>
        )
    }


    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="relative overflow-hidden">
                <div className="container mx-auto px-4 py-12 md:py-20">

                    {/* Hero Section */}
                    <div className="relative mb-20 p-8 text-center border-2 border-primary/50 overflow-hidden">
                        <SnakeBorder />
                        <div 
                            className="absolute inset-0 -z-10 opacity-20"
                            style={{ backgroundImage: `url(${promo.heroBackgroundGif})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                        <div className="absolute inset-0 -z-20 bg-background/90" />

                        <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary animate-glow [text-shadow:0_0_15px_hsl(var(--primary))]">
                            {promo.heroTitle}
                        </h1>
                        <p className="mt-4 text-xl text-foreground/80 max-w-2xl mx-auto">
                            {promo.heroDescription}
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Button size="lg" className="h-14 text-lg">{promo.primaryButtonText}</Button>
                            <Button size="lg" variant="outline" className="h-14 text-lg">{promo.secondaryButtonText}</Button>
                        </div>
                    </div>

                    {/* Featured Products */}
                    <div>
                        <h2 className="font-headline text-3xl font-semibold mb-8 text-center">{promo.productsSectionTitle}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {loadingProducts ? (
                                 [...Array(8)].map((_, i) => (
                                    <div key={i} className="flex flex-col space-y-3">
                                        <Skeleton className="aspect-[4/3] w-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-4/5" />
                                            <Skeleton className="h-4 w-3/5" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
