'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProducts } from '@/lib/data';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/layout/search-bar';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { useTranslation } from '@/hooks/use-translation';
import { Search as SearchIcon } from 'lucide-react';

function SearchPageContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';
    
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const popularSearches = [
        'Cyberpunk',
        'Futuristic',
        'Neon',
        'Glitch',
        'Gadgets',
    ];

    useEffect(() => {
        if (!query) {
            setLoading(false);
            setResults([]);
            return;
        }

        const fetchAndFilter = async () => {
            setLoading(true);
            const allProducts = await getProducts();
            const lowerCaseQuery = query.toLowerCase();
            
            const filteredResults = allProducts.filter(product => 
                product.name.toLowerCase().includes(lowerCaseQuery) ||
                product.description.toLowerCase().includes(lowerCaseQuery) ||
                product.category.toLowerCase().includes(lowerCaseQuery) ||
                product.seller.name.toLowerCase().includes(lowerCaseQuery)
            );
            
            const localProductsJSON = localStorage.getItem('luna_new_products');
            const localProducts: Product[] = localProductsJSON ? JSON.parse(localProductsJSON) : [];
            
            const localFilteredResults = localProducts.filter(product => 
                product.name.toLowerCase().includes(lowerCaseQuery) ||
                product.description.toLowerCase().includes(lowerCaseQuery) ||
                product.category.toLowerCase().includes(lowerCaseQuery) ||
                product.seller.name.toLowerCase().includes(lowerCaseQuery)
            );

            const combined = [...localFilteredResults, ...filteredResults];
            const uniqueResults = Array.from(new Map(combined.map(p => [p.id, p])).values());

            setResults(uniqueResults);
            setLoading(false);
        };

        fetchAndFilter();

    }, [query]);

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto mb-12">
                    <SearchBar placeholderKeywords={popularSearches} />
                </div>
                
                {loading ? (
                    <div>
                        <h1 className="text-3xl font-headline mb-8">
                            <Skeleton className="h-9 w-64" />
                        </h1>
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
                ) : (
                    <div>
                        {query ? (
                            <>
                                <h1 className="text-3xl font-headline mb-8">
                                    {results.length > 0 
                                        ? t('searchPage.resultsFor').replace('{query}', query)
                                        : t('searchPage.noResultsFor').replace('{query}', query)
                                    }
                                </h1>
                                {results.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                        {results.map(product => (
                                            <ProductCard key={product.id} product={product} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 border-2 border-dashed rounded-lg border-border/50">
                                        <h2 className="text-2xl font-headline mb-2">{t('searchPage.tryAnotherSearch')}</h2>
                                        <p className="text-muted-foreground">{t('searchPage.noResultsDescription')}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-lg">
                                <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h1 className="text-2xl font-headline mt-4">{t('searchPage.searchForAnything')}</h1>
                                <p className="text-muted-foreground mt-2">{t('searchPage.searchHint')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}


export default function SearchPage() {
    return (
        <Suspense>
            <SearchPageContent />
        </Suspense>
    );
}
