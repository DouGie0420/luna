'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import type { Product, BbsPost } from "@/lib/types";
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
import { MoreHorizontal, Loader2, Edit, Trash2, ShieldCheck, CheckCircle } from "lucide-react"
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
import { format } from 'date-fns';

type ProductStatus = NonNullable<Product['status']>;
type PostStatus = NonNullable<BbsPost['status']>;


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
                    <TableHead>商品</TableHead>
                    <TableHead>卖家</TableHead>
                    <TableHead>价格</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
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
                        <TableCell>{product.createdAt ? format(product.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onStatusChange(product.id, 'active')}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        <span>批准 (重新发布)</span>
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

function PostTable({ posts, loading, onStatusChange, onPostDelete }: { posts: BbsPost[] | null, loading: boolean, onStatusChange: (id: string, status: PostStatus) => void, onPostDelete: (post: BbsPost) => void }) {
    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!posts || posts.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">没有需要审核的帖子。</div>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>帖子</TableHead>
                    <TableHead>作者</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {posts.map(post => (
                    <TableRow key={post.id}>
                        <TableCell className="font-medium">
                            <p className="font-semibold">{post.title}</p>
                            <p className="text-xs text-muted-foreground font-mono">{post.id}</p>
                        </TableCell>
                        <TableCell>{post.author.name}</TableCell>
                        <TableCell>{post.createdAt ? format(post.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                        <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onStatusChange(post.id, 'active')}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        <span>批准 (恢复显示)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => onPostDelete(post)}>
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
    
    // Product states
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const productsQuery = useMemo(() => firestore ? query(collection(firestore, 'products'), where('status', '==', 'under_review')) : null, [firestore]);
    const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery);

    // Post states
    const [postToDelete, setPostToDelete] = useState<BbsPost | null>(null);
    const postsQuery = useMemo(() => firestore ? query(collection(firestore, 'bbs'), where('status', '==', 'under_review')) : null, [firestore]);
    const { data: posts, loading: postsLoading } = useCollection<BbsPost>(postsQuery);

    // Product handlers
    const handleProductStatusChange = async (productId: string, status: ProductStatus) => {
        if (!firestore) return;
        const productRef = doc(firestore, 'products', productId);
        try {
            await updateDoc(productRef, { status });
            toast({ title: '商品状态已更新', description: `商品已设置为 "${status}"。` });
        } catch (error) {
            console.error("Failed to update status:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productRef.path, operation: 'update', requestResourceData: { status } }));
        }
    };
    const handleProductDelete = async () => {
        if (!firestore || !productToDelete) return;
        const productRef = doc(firestore, 'products', productToDelete.id);
        try {
            await deleteDoc(productRef);
            toast({ title: '商品已删除', description: `商品 '${productToDelete.name}' 已被永久删除。` });
            setProductToDelete(null);
        } catch (error) {
            console.error("Failed to delete product:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productRef.path, operation: 'delete' }));
        }
    };

    // Post handlers
    const handlePostStatusChange = async (postId: string, status: PostStatus) => {
        if (!firestore) return;
        const postRef = doc(firestore, 'bbs', postId);
        try {
            await updateDoc(postRef, { status });
            toast({ title: '帖子状态已更新', description: `帖子已设置为 "${status}"。` });
        } catch (error) {
            console.error("Failed to update status:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: postRef.path, operation: 'update', requestResourceData: { status } }));
        }
    };
    const handlePostDelete = async () => {
        if (!firestore || !postToDelete) return;
        const postRef = doc(firestore, 'bbs', postToDelete.id);
        try {
            await deleteDoc(postRef);
            toast({ title: '帖子已删除', description: `帖子 '${postToDelete.title}' 已被永久删除。` });
            setPostToDelete(null);
        } catch (error) {
            console.error("Failed to delete post:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: postRef.path, operation: 'delete' }));
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-headline mb-2">问题内容审核</h2>
            <p className="text-muted-foreground mb-8">此页面列出了被标记为需要审核的商品和帖子。请检查并进行相应操作。</p>
            
            <div className="mb-12">
                <h3 className="text-2xl font-headline mb-4">待审核商品</h3>
                <ProductTable products={products} loading={productsLoading} onStatusChange={handleProductStatusChange} onProductDelete={setProductToDelete} />
            </div>

            <div>
                <h3 className="text-2xl font-headline mb-4">待审核帖子</h3>
                 <PostTable posts={posts} loading={postsLoading} onStatusChange={handlePostStatusChange} onPostDelete={setPostToDelete} />
            </div>

            <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>您确定要永久删除此商品吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作无法撤销。这将从数据库中永久删除商品 "{productToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleProductDelete} className="bg-destructive hover:bg-destructive/90">
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>您确定要永久删除此帖子吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                             此操作无法撤销。这将从数据库中永久删除帖子 "{postToDelete?.title}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePostDelete} className="bg-destructive hover:bg-destructive/90">
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
