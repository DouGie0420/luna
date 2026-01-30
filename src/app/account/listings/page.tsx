'use client';

import { useEffect, useState } from 'react';
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
import { MoreHorizontal, Edit, Trash2, Sparkles, Share2, Heart, Bookmark } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

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
    );
}

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

    const handleDeleteProduct = (productId: string) => {
        setUserProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
    };

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
                                    <div className="flex items-center gap-1">
                                        <Heart className="h-4 w-4" />
                                        <span>{product.likes || 0} {t('accountListings.likes')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Bookmark className="h-4 w-4" />
                                        <span>{product.favorites || 0} {t('accountListings.favorites')}</span>
                                    </div>
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
