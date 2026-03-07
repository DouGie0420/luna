'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { SnakeBorder } from '@/components/snake-border';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc } from '@/firebase';
import type { Product, Promo } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const fallbackPromos: { [id: string]: Promo } = {
    'cyber-monday': {
        id: 'cyber-monday-fallback',
        heroTitle: 'CYBER MONDAY',
        heroDescription: 'GLITCH IN THE SYSTEM! UNREAL DEALS ON ALL TECH & APPAREL.',
        heroBackgroundGif: 'https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif',
        primaryButtonText: 'Shop All Deals',
        secondaryButtonText: 'View Rules',
        productsSectionTitle: 'Featured Cyber Deals',
        featuredProductIds: ['vintage-camera', 'smart-watch', 'wireless-headphones', 'gaming-console', 'drone', 'leather-backpack', 'ukulele', 'espresso-machine']
    },
    'future-is-here': {
        id: 'future-is-here-fallback',
        heroTitle: '未来已来',
        heroDescription: '探索最新潮的赛博装备，定义你的未来风格。',
        heroBackgroundGif: 'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
        primaryButtonText: '探索未来',
        secondaryButtonText: '了解技术',
        productsSectionTitle: '未来科技精选',
        featuredProductIds: ['smart-watch', 'gaming-console', 'drone', 'wireless-headphones']
    },
    'city-neon': {
        id: 'city-neon-fallback',
        heroTitle: '城市霓虹',
        heroDescription: '穿梭于光影之间的时尚单品，点亮你的都市夜晚。',
        heroBackgroundGif: 'https://media.giphy.com/media/f9rOoR41d3kY0/giphy.gif',
        primaryButtonText: '选购霓虹单品',
        secondaryButtonText: '查看穿搭',
        productsSectionTitle: '霓虹时尚焦点',
        featuredProductIds: ['designer-sunglasses', 'leather-backpack', 'leather-wallet', 'vintage-camera']
    },
    'digital-wave': {
        id: 'digital-wave-fallback',
        heroTitle: '数字浪潮',
        heroDescription: '体验前所未有的虚拟现实，沉浸在数字的海洋。',
        heroBackgroundGif: 'https://media.giphy.com/media/l4pTkyYQaK1s14T6M/giphy.gif',
        primaryButtonText: '进入虚拟世界',
        secondaryButtonText: 'VR设备',
        productsSectionTitle: '虚拟现实装备',
        featuredProductIds: ['gaming-console', 'wireless-headphones', 'smart-watch', 'drone']
    }
};


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
    );
}

function PromoContent() {
    const searchParams = useSearchParams();
    const promoId = searchParams.get('id') || 'cyber-monday';
    
    const firestore = useFirestore();
    const promoRef = useMemo(() => 
        firestore ? doc(firestore, 'promos', promoId) : null,
        [firestore, promoId]
    );
    const { data: promoFromDb, loading: promoLoading } = useDoc<Promo>(promoRef);

    const fallbackPromo = fallbackPromos[promoId] || fallbackPromos['cyber-monday'];
    const promo = promoFromDb || fallbackPromo;

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const allProducts = await getProducts();
                const featuredIds = promo.featuredProductIds || [];
                
                const promoProducts = featuredIds.length > 0 
                    ? allProducts.filter(p => featuredIds.includes(p.id))
                    : allProducts.slice(0, 8); // Fallback if no IDs are specified
                
                setProducts(promoProducts);
            } catch (error) {
                console.error("Failed to fetch products for promo", error);
            } finally {
                setLoadingProducts(false);
            }
        };

        if (promo) {
            fetchProducts();
        }
    }, [promo]);

    if (promoLoading) {
        return <PromoPageSkeleton />;
    }
    
    if (!promo) {
        // This case should ideally not happen due to fallback, but as a safeguard:
        return (
             <div className="container mx-auto px-4 py-12 md:py-20 text-center">
                 <h1 className="font-headline text-4xl text-destructive">Promotion Not Found</h1>
                 <p className="mt-4 text-muted-foreground">The requested promotion could not be loaded.</p>
             </div>
        );
    }

    return (
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
                             [...Array(promo.featuredProductIds?.length || 8)].map((_, i) => (
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
    );
}


export default function CyberMondayPromoPage() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <Suspense fallback={<PromoPageSkeleton />}>
                <PromoContent />
            </Suspense>
        </>
    )
}
