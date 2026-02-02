

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProductById, getProducts } from '@/lib/data';
import type { Product } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductTitleWithBadge } from '@/components/product-title-with-badge';
import { SellerProfileCard } from '@/components/seller-profile-card';
import { ProductPurchaseActions } from '@/components/product-purchase-actions';
import { ProductCommentSection } from '@/components/product-comment-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import { ProductEditForm } from '@/components/product-edit-form';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { doc, updateDoc } from 'firebase/firestore';


function ProductPageSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-8">
                    <div className="lg:col-span-3 space-y-4">
                        <Skeleton className="aspect-video w-full rounded-xl" />
                        <div className="grid grid-cols-8 gap-2">
                            {[...Array(8)].map((_, i) => (
                                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Skeleton className="h-10 w-3/4" />
                        <div className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>
                <div className="mt-12">
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        </>
    );
}


export default function ProductPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();

    const [product, setProduct] = useState<Product | null>(null);
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
    
    const [isLiked, setIsLiked] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchProductData = async () => {
            setLoading(true);
            
            let foundProduct: Product | undefined | null = null;
            
            // 1. Check localStorage first
            const localProductsJSON = localStorage.getItem('luna_new_products');
            if (localProductsJSON) {
                try {
                    const localProducts: Product[] = JSON.parse(localProductsJSON);
                    foundProduct = localProducts.find(p => p.id === id);
                } catch (e) {
                    console.error("Failed to parse local products:", e);
                }
            }

            // 2. If not in localStorage, check mock data
            if (!foundProduct) {
                foundProduct = await getProductById(id);
            }

            if (foundProduct) {
                setProduct(foundProduct);
                // Fetch recommendations
                const allProducts = await getProducts();
                const recs = allProducts.filter(p => p.id !== id).slice(0, 5);
                setRecommendedProducts(recs);
            }
            
            setLoading(false);
        };
        
        fetchProductData();
        
        const checkState = () => {
            const likedItems = JSON.parse(localStorage.getItem('likedProducts') || '[]');
            const favoritedItems = JSON.parse(localStorage.getItem('favoritedProducts') || '[]');
            setIsLiked(likedItems.includes(id));
            setIsFavorited(favoritedItems.includes(id));
        };
        checkState();
        window.addEventListener('focus', checkState);

        return () => {
            window.removeEventListener('focus', checkState);
        }

    }, [id]);

    const handleInteraction = (type: 'like' | 'favorite') => {
        const key = type === 'like' ? 'likedProducts' : 'favoritedProducts';
        const currentItems: string[] = JSON.parse(localStorage.getItem(key) || '[]');
        const isCurrentlySet = currentItems.includes(id);
    
        let newItems: string[];
        if (isCurrentlySet) {
            newItems = currentItems.filter((pid: string) => pid !== id);
        } else {
            newItems = [...currentItems, id];
            if (type === 'favorite') {
                toast({ title: t('productCardActions.addedToFavorites') });
            }
        }
        localStorage.setItem(key, JSON.stringify(newItems));
    
        if (type === 'like') {
            setIsLiked(!isCurrentlySet);
        } else {
            setIsFavorited(!isCurrentlySet);
        }
    };


    const isOwner = user && product && user.uid === product.seller.id;
    const hasAdminAccess = profile && ['staff', 'ghost', 'admin'].includes(profile.role || '');

    const handleProductUpdate = (updatedProduct: Product) => {
        setProduct(updatedProduct);
        setIsEditDialogOpen(false);
    };

    const handleDeleteProduct = async () => {
        if (!product || !firestore) return;
        setIsSubmittingDelete(true);

        const productRef = doc(firestore, "products", product.id);
        try {
            await updateDoc(productRef, { status: 'under_review' });
            toast({
                title: "商品已提交审核",
                description: "该商品已从前台隐藏，等待管理员审核。",
            });
            router.push('/products');
        } catch (error) {
            console.error("Failed to flag product for review:", error);
            toast({
                variant: "destructive",
                title: "操作失败",
                description: "无法提交审核，请检查权限。",
            });
        }
        setIsSubmittingDelete(false);
        setIsDeleteDialogOpen(false);
    };


    if (loading) {
        return <ProductPageSkeleton />;
    }

    if (!product) {
        notFound();
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-8">
                    {/* Left Column: Image Carousel & Actions */}
                    <div className="lg:col-span-3">
                         <ProductImageGallery 
                            product={product} 
                            isLiked={isLiked}
                            isFavorited={isFavorited}
                            onLikeToggle={() => handleInteraction('like')}
                            onFavoriteToggle={() => handleInteraction('favorite')}
                        />
                    </div>

                    {/* Right Column: Product Details & Actions */}
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <div className="relative">
                            <ProductTitleWithBadge product={product} />
                        </div>
                        
                        <ProductPurchaseActions product={product} />

                        <SellerProfileCard product={product} />
                    </div>
                </div>
                
                {/* Description and other sections below */}
                <div className="mt-12 flex flex-col gap-8">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>商品描述</CardTitle>
                                 <div className="flex items-center gap-2">
                                    {isOwner && (
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="rounded-full h-9 px-4">
                                                <Edit className="mr-2 h-4 w-4" />
                                                编辑商品
                                            </Button>
                                        </DialogTrigger>
                                    )}
                                    {hasAdminAccess && (
                                        <Button variant="destructive" className="rounded-full h-9 px-4" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSubmittingDelete}>
                                            {isSubmittingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                            删除商品
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
                            </CardContent>
                        </Card>
                        {isOwner && (
                            <DialogContent className="sm:max-w-[625px]">
                                <DialogHeader>
                                    <DialogTitle>Edit Product</DialogTitle>
                                    <DialogDescription>
                                        Make changes to your product here. Click save when you're done.
                                    </DialogDescription>
                                </DialogHeader>
                                <ProductEditForm product={product} onSave={handleProductUpdate} />
                            </DialogContent>
                        )}
                    </Dialog>
                    
                    <ProductCommentSection productId={product.id} />
                </div>

                <div className="mt-20">
                    <h2 className="font-headline text-3xl font-semibold mb-6">为你推荐</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {recommendedProducts.map((p) => (
                            <Link href={`/products/${p.id}`} key={p.id} className="group aspect-video relative overflow-hidden border border-border">
                                <Image
                                src={p.images[0]}
                                alt={p.name}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint={p.imageHints[0]}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <h3 className="absolute bottom-0 left-0 p-4 font-headline text-lg text-foreground">
                                {p.name}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认提交审核</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作会将商品从前台隐藏并提交给管理员审核。您确定吗？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProduct} disabled={isSubmittingDelete} className="bg-destructive hover:bg-destructive/90">
                           {isSubmittingDelete && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           确认提交
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
