

'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { notFound, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/data';
import type { Product } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductTitleWithBadge } from '@/components/product-title-with-badge';
import { SellerProfileCard } from '@/components/seller-profile-card';
import { ProductPurchaseActions } from '@/components/product-purchase-actions';
import { ProductCommentSection } from '@/components/product-comment-section';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser, useFirestore, useDoc } from '@/firebase';
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
import { doc, updateDoc, arrayRemove, arrayUnion, increment, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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

    const productRef = useMemo(() => (firestore && id ? doc(firestore, 'products', id) : null), [firestore, id]);
    const { data: product, loading } = useDoc<Product>(productRef);
    
    const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(true);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
    
    useEffect(() => {
      if (!firestore) {
        setLoadingRecs(false);
        return;
      }
  
      const fetchRecs = async () => {
        setLoadingRecs(true);
        // Query without ordering to avoid needing an index
        const recsQuery = query(
            collection(firestore, 'products'),
            where('status', '==', 'active'),
            limit(12) // Fetch a bit more to ensure we have enough after filtering
        );
        try {
            const querySnapshot = await getDocs(recsQuery);
            let recs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            
            // Sort on the client-side
            recs.sort((a, b) => (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0));

            const filteredRecs = recs.filter(p => p.id !== id).slice(0, 5);
            setRecommendedProducts(filteredRecs);
        } catch (error) {
            console.error("Failed to fetch recommendations from Firestore, falling back to mock data:", error);
            // Fallback to mock data if Firestore fails for any reason
            const allProducts = await getProducts();
            const recs = allProducts.filter(rec => rec.id !== id).slice(0, 5);
            setRecommendedProducts(recs);
        } finally {
            setLoadingRecs(false);
        }
      };
  
      fetchRecs();
    }, [firestore, id]);

    const isOwner = user && product && user.uid === product.sellerId;
    const hasAdminAccess = profile && ['staff', 'ghost', 'admin', 'support'].includes(profile.role || '');
    
    const isLiked = user && product && product.likedBy?.includes(user.uid);
    const isFavorited = user && product && product.favoritedBy?.includes(user.uid);


    const handleInteraction = (type: 'like' | 'favorite') => {
        if (!user || !firestore || !product) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }

        const productRef = doc(firestore, 'products', product.id);
        let updateData: any;

        if (type === 'like') {
            updateData = {
                likedBy: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                likes: increment(isLiked ? -1 : 1)
            };
        } else { // favorite
            updateData = {
                favoritedBy: isFavorited ? arrayRemove(user.uid) : arrayUnion(user.uid),
                favorites: increment(isFavorited ? -1 : 1)
            };
        }
        
        updateDoc(productRef, updateData).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: productRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    };

    const handleProductUpdate = (updatedProduct: Product) => {
        // useDoc will update the product automatically, so we just close the dialog.
        setIsEditDialogOpen(false);
        toast({ title: 'Product Updated', description: 'Your changes have been saved.' });
    };

    const handleDeleteProduct = async () => {
        if (!product || !firestore) return;
        setIsSubmittingDelete(true);
    
        const productRef = doc(firestore, "products", product.id);
        const updateData = { status: 'under_review' as const };
        
        // TODO: checkWeb3Escrow() - If product is linked to a Web3 transaction,
        // ensure funds can be handled correctly before hiding the product.

        updateDoc(productRef, updateData)
            .then(() => {
                toast({
                    title: "商品已提交审核",
                    description: "该商品已从前台隐藏，等待管理员审核。",
                });
                router.push('/products');
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: productRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmittingDelete(false);
                setIsDeleteDialogOpen(false);
            });
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
                            isLiked={!!isLiked}
                            isFavorited={!!isFavorited}
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
                                    {(isOwner || hasAdminAccess) && (
                                        <DialogTrigger asChild>
                                            <Button variant="outline" className="rounded-full h-9 px-4">
                                                <Edit className="mr-2 h-4 w-4" />
                                                编辑商品
                                            </Button>
                                        </DialogTrigger>
                                    )}
                                    {hasAdminAccess && !isOwner && (
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
                        {loadingRecs ? (
                            [...Array(5)].map((_, i) => (
                                <div key={i} className="flex flex-col space-y-3">
                                    <Skeleton className="aspect-video w-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-4/5" />
                                        <Skeleton className="h-4 w-3/5" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            recommendedProducts.map((p) => (
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
                            ))
                        )}
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
