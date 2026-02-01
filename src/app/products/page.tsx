'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Flame, Sparkles, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { getProducts } from '@/lib/data';
import Link from 'next/link';

function ProductsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="relative text-center mb-12 py-16">
                <Skeleton className="h-16 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-full max-w-2xl mx-auto mt-4" />
            </div>
            <div className="flex justify-between items-center mb-8">
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
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
    )
}

export default function AllProductsPage() {
    const { t } = useTranslation();
    const { toast } = useToast();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeFilter, setActiveFilter] = useState<'newest' | 'trending' | 'popular'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const allProducts = await getProducts();
            const localProductsJSON = localStorage.getItem('luna_new_products');
            const localProducts: Product[] = localProductsJSON ? JSON.parse(localProductsJSON) : [];
            const combined = [...localProducts, ...allProducts];
            const uniqueProducts = Array.from(new Map(combined.map(p => [p.id, p])).values());
            setProducts(uniqueProducts);
            setLoading(false);
        };
        fetchProducts();
    }, []);

    const filteredAndSortedProducts = useMemo(() => {
        let processedProducts = products ? [...products] : [];

        if (debouncedSearchTerm) {
            processedProducts = processedProducts.filter(product => {
                const lowercasedTerm = debouncedSearchTerm.toLowerCase();
                return (
                    product.name?.toLowerCase().includes(lowercasedTerm) ||
                    product.description?.toLowerCase().includes(lowercasedTerm) ||
                    product.category?.toLowerCase().includes(lowercasedTerm)
                );
            });
        }

        switch (activeFilter) {
            case 'trending':
                processedProducts.sort((a, b) => ((b.likes || 0) + (b.favorites || 0)) - ((a.likes || 0) + (a.favorites || 0)));
                break;
            case 'popular':
                 processedProducts.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
            case 'newest':
            default:
                // Mock data doesn't have a date, so this is just for show.
                break;
        }

        return processedProducts;

    }, [debouncedSearchTerm, activeFilter, products]);

    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <ProductsPageSkeleton />
            </>
        );
    }
    
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="relative text-center mb-12 py-16 overflow-hidden rounded-lg border border-primary/20 bg-card/50">
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-b from-card via-transparent to-transparent z-10" />
                    <Image src="https://picsum.photos/seed/lunar-vale-bg/1920/400" alt="Lunar Vale background" fill className="object-cover opacity-20" data-ai-hint="canyon moon" />
                    <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary animate-glow [text-shadow:0_0_15px_hsl(var(--primary))] relative z-20">
                        {t('homePage.canyonOfTheMoon')}
                    </h1>
                    <p className="mt-4 text-xl text-foreground/80 max-w-2xl mx-auto relative z-20">
                        Discover treasures and rarities from across the system.
                    </p>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                    <div className="flex items-center gap-2">
                         <Button variant={activeFilter === 'newest' ? 'default' : 'outline'} onClick={() => setActiveFilter('newest')}>
                            <Sparkles />
                            Newest
                        </Button>
                        <Button variant={activeFilter === 'trending' ? 'default' : 'outline'} onClick={() => setActiveFilter('trending')}>
                            <Flame />
                            Trending
                        </Button>
                        <Button variant={activeFilter === 'popular' ? 'default' : 'outline'} onClick={() => setActiveFilter('popular')}>
                            <Star />
                            Popular
                        </Button>
                    </div>
                     <div className="flex-1 max-w-sm">
                        <Input 
                            placeholder="Search all items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button asChild>
                       <Link href="/products/new">
                           <Plus className="mr-2 h-4 w-4" />
                           {t('userNav.listAnItem')}
                       </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                    {filteredAndSortedProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </>
    );
}
