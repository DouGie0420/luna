'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchBar } from '@/components/layout/search-bar';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { useTranslation } from '@/hooks/use-translation';
import { Search as SearchIcon } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

function SearchPageContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const queryTerm = searchParams.get('q') || '';
    
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [results, setResults] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(50);


    const popularSearches = [
        'Cyberpunk',
        'Futuristic',
        'Neon',
        'Glitch',
        'Gadgets',
    ];

    useEffect(() => {
        if (!firestore) return;
        setLoading(true);
        const q = query(collection(firestore, 'products'), where('status', '==', 'active'));
        getDocs(q).then(snapshot => {
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setAllProducts(fetchedProducts);
        }).catch(err => {
            console.error("Error fetching products: ", err);
            toast({ title: "Error fetching products", variant: "destructive" });
        }).finally(() => {
            setLoading(false);
        });
    }, [firestore, toast]);

    useEffect(() => {
        if (!queryTerm) {
            setResults([]);
            return;
        }

        if (!loading) {
            const lowerCaseQuery = queryTerm.toLowerCase();
            const filteredResults = allProducts.filter(product => 
                product.name.toLowerCase().includes(lowerCaseQuery)
            );
            setResults(filteredResults);
            setVisibleCount(50); // Reset pagination on new search
        }
    }, [queryTerm, allProducts, loading]);

    const handleLoadMore = () => {
        if (!user) {
            toast({
                variant: 'destructive',
                title: '请登录后查看更多',
                description: '注册或登录以浏览所有搜索结果。',
            });
            return;
        }
        setVisibleCount(prev => prev + 50);
    };

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
                        {queryTerm ? (
                            <>
                                {results.length > 0 ? (
                                    <>
                                        <h1 className="text-3xl font-headline mb-8">
                                            {t('searchPage.resultsFor').replace('{query}', queryTerm)} ({results.length})
                                        </h1>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                            {results.slice(0, visibleCount).map(product => (
                                                <ProductCard key={product.id} product={product} />
                                            ))}
                                        </div>
                                        {results.length > visibleCount && (
                                            <div className="mt-12 text-center">
                                                <Button onClick={handleLoadMore}>
                                                    下一页
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <div className="inline-block text-center py-8 px-16 rounded-full bg-card/50 animate-glow-border-muted">
                                            <SearchIcon className="mx-auto h-12 w-12 text-primary/50 animate-pulse" />
                                            <h1 className="text-3xl font-headline mt-6 mb-2 text-yellow-400" style={{ animation: 'suggestion-fade-in 0.3s ease-out 0.1s forwards' }}>
                                                {t('searchPage.noResultsFor').replace('{query}', queryTerm)}
                                            </h1>
                                            <h2 className="text-xl font-headline text-muted-foreground mb-2" style={{ animation: 'suggestion-fade-in 0.3s ease-out 0.3s forwards' }}>
                                                {t('searchPage.tryAnotherSearch')}
                                            </h2>
                                            <p className="text-muted-foreground" style={{ animation: 'suggestion-fade-in 0.3s ease-out 0.5s forwards' }}>
                                                {t('searchPage.noResultsDescription')}
                                            </p>
                                        </div>
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
