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
import { MoreHorizontal, Loader2, Edit, Trash2, ShieldCheck } from "lucide-react"
import Image from "next/image"
import { useTranslation } from "@/hooks/use-translation";
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
        return <div className="text-center py-12 text-muted-foreground">没有需要审核的商品。</div>
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
                                        <span>批准 (重新发布)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>编辑</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => onProductDelete(product)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>确认删除</span>
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
    const { toast } = useToast();
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);


    const productsQuery = useMemo(() => {
        if (!firestore) return null;
        // Only query for products that are under review.
        return query(collection(firestore, 'products'), where('status', '==', 'under_review'));
    }, [firestore]);

    const { data: products, loading } = useCollection<Product>(productsQuery);

    const handleStatusChange = async (productId: string, status: ProductStatus) => {
        if (!firestore) return;
        const productRef = doc(firestore, 'products', productId);
        try {
            await updateDoc(productRef, { status });
            toast({ title: '商品状态已更新', description: `商品已重新发布为 "${status}"。` });
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
            toast({ title: '商品已删除', description: `商品 '${productToDelete.name}' 已被永久删除。` });
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
            <h2 className="text-3xl font-headline mb-2">商品审核</h2>
            <p className="text-muted-foreground mb-6">此页面列出了被标记为需要审核的商品。请检查并进行相应操作。</p>
            
            <ProductTable products={products} loading={loading} onStatusChange={handleStatusChange} onProductDelete={setProductToDelete} />

            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>您确定要永久删除吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这将从数据库中永久删除商品
                             "{productToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
