
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Product, BbsPost } from '@/lib/types';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useTranslation } from '@/hooks/use-translation';
import { Loader2, Star, ShoppingBag, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

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
            <div className="p-4 md:p-6">
                <FavoritesPageSkeleton />
            </div>
        );
    }

    return (
        <div className="relative py-8 px-4 sm:px-6">
            {/* Background */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-yellow-600/4 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-purple-600/5 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mb-6"
            >
                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.12)]">
                    <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent font-headline">
                        {t('accountLayout.myFavorites')}
                    </h1>
                    <p className="text-sm text-muted-foreground/70">
                        {favoritedProducts.length} 件商品 · {favoritedPosts.length} 篇帖子
                    </p>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Tabs defaultValue="products" className="w-full">
                    <TabsList className="bg-white/5 border border-white/8 rounded-xl p-1 mb-5 w-auto inline-flex">
                        <TabsTrigger value="products" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40">
                            <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                            商品 ({favoritedProducts.length})
                        </TabsTrigger>
                        <TabsTrigger value="posts" className="rounded-lg text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/40">
                            <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                            帖子 ({favoritedPosts.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="products">
                        {favoritedProducts.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {favoritedProducts.map(product => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-500/25 to-transparent" />
                                <div className="text-center py-20">
                                    <p className="text-muted-foreground/50 text-sm">您还没有收藏任何商品。</p>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="posts">
                        {favoritedPosts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {favoritedPosts.map(post => (
                                    <BbsPostCard key={post.id} post={post} />
                                ))}
                            </div>
                        ) : (
                            <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-500/25 to-transparent" />
                                <div className="text-center py-20">
                                    <p className="text-muted-foreground/50 text-sm">您还没有收藏任何帖子。</p>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </motion.div>
        </div>
    );
}
