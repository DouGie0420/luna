
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Product, BbsPost } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';
import { Loader2, Star, ShoppingBag, MessageSquare } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductCard } from '@/components/product-card';
import { BbsPostCard } from '@/components/bbs-post-card';
import { Skeleton } from '@/components/ui/skeleton';

function FavoritesPageSkeleton() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-9 w-48" />
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
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

export default function FavoritesPage() {
    const { t } = useTranslation();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const [favoritedProducts, setFavoritedProducts] = useState<Product[]>([]);
    const [favoritedPosts, setFavoritedPosts] = useState<BbsPost[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !user) {
            if (!userLoading) setLoading(false);
            return;
        };

        const fetchFavorites = async () => {
            setLoading(true);
            try {
                const productsQuery = query(collection(firestore, 'products'), where('favoritedBy', 'array-contains', user.uid));
                const postsQuery = query(collection(firestore, 'bbs'), where('favoritedBy', 'array-contains', user.uid));

                const [productsSnapshot, postsSnapshot] = await Promise.all([
                    getDocs(productsQuery),
                    getDocs(postsQuery),
                ]);

                const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BbsPost));

                setFavoritedProducts(products);
                setFavoritedPosts(posts);
            } catch (error) {
                console.error("Error fetching favorites:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [firestore, user, userLoading]);

    if (userLoading || loading) {
        return (
            <div className="p-6 md:p-12">
                <h1 className="text-3xl font-headline mb-8">{t('accountLayout.myFavorites')}</h1>
                <FavoritesPageSkeleton />
            </div>
        );
    }
    
    return (
        <div className="p-6 md:p-12">
            <div className="flex items-center gap-3 mb-8">
                <Star className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">{t('accountLayout.myFavorites')}</h1>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="products">
                        <ShoppingBag className="mr-2 h-4 w-4" />
                        商品 ({favoritedProducts.length})
                    </TabsTrigger>
                    <TabsTrigger value="posts">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        帖子 ({favoritedPosts.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="products" className="mt-6">
                    {favoritedProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {favoritedProducts.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">您还没有收藏任何商品。</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="posts" className="mt-6">
                     {favoritedPosts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {favoritedPosts.map(post => (
                                <BbsPostCard key={post.id} post={post} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">您还没有收藏任何帖子。</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
