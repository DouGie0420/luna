
'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Product } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, Edit, Trash2, ShieldCheck, EyeOff, ShieldX } from "lucide-react"
import Image from "next/image"
import { useTranslation } from "@/hooks/use-translation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type ProductStatus = NonNullable<Product['status']>;

const statusMap: Record<ProductStatus, { label: string; badgeVariant: 'default' | 'secondary' | 'destructive' }> = {
    active: { label: 'Active', badgeVariant: 'default' },
    under_review: { label: 'Under Review', badgeVariant: 'secondary' },
    hidden: { label: 'Hidden', badgeVariant: 'destructive' },
};

function ProductTable({ products, loading, onStatusChange, onProductDelete }: { products: Product[] | null, loading: boolean, onStatusChange: (id: string, status: ProductStatus) => void, onProductDelete: (product: Product) => void }) {
    const { t } = useTranslation();

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!products || products.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No products in this category.</div>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('admin.productsPage.product')}</TableHead>
                    <TableHead>{t('admin.productsPage.seller')}</TableHead>
                    <TableHead>{t('admin.productsPage.price')}</TableHead>
                    <TableHead>{t('admin.productsPage.status')}</TableHead>
                    <TableHead className="text-right">{t('admin.productsPage.actions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {products.map(product => (
                    <TableRow key={product.id}>
                        <TableCell className="font-medium flex items-center gap-3">
                            {product.images && product.images.length > 0 && (
                                <Image src={product.images[0]} alt={product.name} width={40} height={30} className="rounded-md object-cover" data-ai-hint={product.imageHints ? product.imageHints[0] : ''} />
                            )}
                            <div className="flex-1">
                                <p className="font-semibold">{product.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{product.id}</p>
                            </div>
                        </TableCell>
                        <TableCell>{product.seller.name}</TableCell>
                        <TableCell>{product.price.toLocaleString()} {product.currency}</TableCell>
                        <TableCell>
                            <Badge variant={statusMap[product.status || 'active'].badgeVariant}>{statusMap[product.status || 'active'].label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onStatusChange(product.id, 'active')}>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        <span>Approve (Republish)</span>
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => onStatusChange(product.id, 'under_review')}>
                                        <ShieldX className="mr-2 h-4 w-4" />
                                        <span>Flag for Review</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onStatusChange(product.id, 'hidden')}>
                                        <EyeOff className="mr-2 h-4 w-4" />
                                        <span>Hide</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => onProductDelete(product)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function AdminProductsPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { toast } = useToast();
    const [filter, setFilter] = useState<ProductStatus | 'all'>('under_review');
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);


    const productsQuery = useMemo(() => {
        if (!firestore) return null;
        const baseQuery = collection(firestore, 'products');
        if (filter === 'all') {
            return query(baseQuery);
        }
        // Firestore doesn't allow querying for documents where a field does NOT exist.
        // So for 'active', we check for documents where status is 'active' or where it doesn't exist (legacy data).
        // This is complex and best handled by ensuring all documents have a default status.
        // For now, we will only query for the specific status. New items should get 'active' by default.
        return query(baseQuery, where('status', '==', filter));
    }, [firestore, filter]);

    const { data: products, loading } = useCollection<Product>(productsQuery);

    const handleStatusChange = async (productId: string, status: ProductStatus) => {
        if (!firestore) return;
        const productRef = doc(firestore, 'products', productId);
        try {
            await updateDoc(productRef, { status });
            toast({ title: 'Status Updated', description: `Product status set to ${status}.` });
        } catch (error) {
            console.error("Failed to update status:", error);
            const permissionError = new FirestorePermissionError({
                path: productRef.path,
                operation: 'update',
                requestResourceData: { status },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !productToDelete) return;
        const productRef = doc(firestore, 'products', productToDelete.id);
        try {
            await deleteDoc(productRef);
            toast({ title: 'Product Deleted', description: `'${productToDelete.name}' has been deleted.` });
            setProductToDelete(null);
        } catch (error) {
            console.error("Failed to delete product:", error);
            const permissionError = new FirestorePermissionError({
                path: productRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };


    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.productsPage.title')}</h2>
            
            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
                <TabsList>
                    <TabsTrigger value="under_review">Under Review</TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="hidden">Hidden</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                <TabsContent value="under_review">
                    <ProductTable products={products} loading={loading} onStatusChange={handleStatusChange} onProductDelete={setProductToDelete} />
                </TabsContent>
                <TabsContent value="active">
                    <ProductTable products={products} loading={loading} onStatusChange={handleStatusChange} onProductDelete={setProductToDelete} />
                </TabsContent>
                <TabsContent value="hidden">
                    <ProductTable products={products} loading={loading} onStatusChange={handleStatusChange} onProductDelete={setProductToDelete} />
                </TabsContent>
                <TabsContent value="all">
                    <ProductTable products={products} loading={loading} onStatusChange={handleStatusChange} onProductDelete={setProductToDelete} />
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product
                             "{productToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
