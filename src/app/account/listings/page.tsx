'use client';

import { useEffect, useState, useRef } from 'react';
import { getProducts } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslation } from '@/hooks/use-translation';
import { type Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Edit, Trash2, Sparkles, Share2, Heart, Star } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';

function ProductActions({ product, onDelete }: { product: Product; onDelete: (productId: string) => void; }) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const handleShare = () => {
        const productUrl = `${window.location.origin}/products/${product.id}`;
        navigator.clipboard.writeText(productUrl);
        toast({
            title: t('productCardActions.linkCopied'),
        });
    };

    const handleDelete = () => {
        onDelete(product.id);
        toast({
            title: t('productCardActions.deleteSuccess'),
        });
        setIsDeleteDialogOpen(false);
    };

    const handleComingSoon = () => {
        toast({
            title: t('productCardActions.featureComingSoon'),
        });
    };

    return (
        <>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={handleComingSoon}>
                            <Edit className="mr-2 h-4 w-4"/>
                            <span>{t('productCardActions.edit')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleComingSoon}>
                            <Sparkles className="mr-2 h-4 w-4"/>
                            <span>{t('productCardActions.polish')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleShare}>
                            <Share2 className="mr-2 h-4 w-4"/>
                            <span>{t('productCardActions.share')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                            onSelect={() => setIsDeleteDialogOpen(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            <span>{t('productCardActions.delete')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('productCardActions.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('productCardActions.deleteConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('productCardActions.deleteCancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {t('productCardActions.deleteConfirmAction')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default function MyListingsPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [userProducts, setUserProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [interactionState, setInteractionState] = useState<Record<string, { liked: boolean; favorited: boolean }>>({});
    const { user, loading: userLoading } = useUser();


    useEffect(() => {
        const fetchProducts = async () => {
            if (!user) {
                // When user is null (either loading or not logged in), don't fetch.
                // If not loading and no user, we might want to show a login prompt, but for now, empty list is fine.
                 if (!userLoading) {
                    setProductsLoading(false);
                }
                return;
            }

            setProductsLoading(true);
            const allProductsFromMock = await getProducts();
            
            // Filter mock products by current user
            const myProductsFromMock = allProductsFromMock.filter(p => p.seller.id === user.uid);

            // Get newly created products from localStorage
            const localProductsJSON = localStorage.getItem('luna_new_products');
            const localProducts: Product[] = localProductsJSON ? JSON.parse(localProductsJSON) : [];
            
            // Filter local products for current user
            const myLocalProducts = localProducts.filter(p => p.seller.id === user.uid);
            
            // Combine and de-duplicate, showing newest (local) first
            const combined = [...myLocalProducts, ...myProductsFromMock];
            const uniqueProducts = Array.from(new Map(combined.map(p => [p.id, p])).values());

            setUserProducts(uniqueProducts);
            setProductsLoading(false);
        };
        fetchProducts();
    }, [user, userLoading]);

    const handleDeleteProduct = (productId: string) => {
        // Also remove from localStorage if it exists there
        const localProductsJSON = localStorage.getItem('luna_new_products');
        if (localProductsJSON) {
            const localProducts = JSON.parse(localProductsJSON);
            const updatedLocalProducts = localProducts.filter((p: Product) => p.id !== productId);
            localStorage.setItem('luna_new_products', JSON.stringify(updatedLocalProducts));
        }
        setUserProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
    };
    
    const handleLike = (productId: string) => {
        setInteractionState(prev => {
            const current = prev[productId] || { liked: false, favorited: false };
            const newState = !current.liked;
            if (newState) {
                // toast({ title: t('productCardActions.likeSuccess') });
            }
            return {
                ...prev,
                [productId]: { ...current, liked: newState }
            };
        });
    };
    
    const handleFavorite = (productId: string) => {
        setInteractionState(prev => {
            const current = prev[productId] || { liked: false, favorited: false };
            const newState = !current.favorited;
            if (newState) {
                toast({ title: t('productCardActions.addedToFavorites') });
            }
            return {
                ...prev,
                [productId]: { ...current, favorited: newState }
            };
        });
    };
    
    const isLoading = userLoading || productsLoading;

    if (isLoading) {
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
                    {userProducts.map((product) => {
                        const isLiked = interactionState[product.id]?.liked;
                        const isFavorited = interactionState[product.id]?.favorited;
                        return (
                            <Card key={product.id} className="overflow-hidden h-full flex flex-col group">
                                <CardHeader className="p-0">
                                    <div className="aspect-[4/3] relative overflow-hidden">
                                    <Link href={`/products/${product.id}`}>
                                        <Image
                                        src={product.images[0]}
                                        alt={product.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        data-ai-hint={product.imageHints[0]}
                                        />
                                    </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow">
                                    <Link href={`/products/${product.id}`}>
                                        <CardTitle className="font-headline text-lg mb-2 leading-tight hover:underline">
                                            {product.name}
                                        </CardTitle>
                                    </Link>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(product.id); }}
                                            className={cn(
                                                "flex items-center gap-1 z-10 p-1 h-auto text-sm transition-colors",
                                                isLiked ? "bg-yellow-400 text-black hover:bg-yellow-500 rounded-md" : "hover:text-primary text-muted-foreground"
                                            )}
                                        >
                                            <Heart className="h-4 w-4" />
                                            <span>{(product.likes || 0) + (isLiked ? 1 : 0)} {t('accountListings.likes')}</span>
                                        </Button>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFavorite(product.id); }} className="flex items-center gap-1 z-10 hover:text-primary transition-colors">
                                            <Star className={cn("h-4 w-4", isFavorited && "text-yellow-400 fill-yellow-400")} />
                                            <span>{(product.favorites || 0) + (isFavorited ? 1 : 0)} {t('accountListings.favorites')}</span>
                                        </button>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-lg font-semibold text-primary">
                                        {product.price.toLocaleString()}
                                        <span className="text-xs text-muted-foreground ml-1">{product.currency}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <ProductActions product={product} onDelete={handleDeleteProduct} />
                                    </div>
                                </CardFooter>
                            </Card>
                        )
                    })}
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
