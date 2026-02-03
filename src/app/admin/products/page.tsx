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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Loader2, Edit, Trash2, ShieldCheck, CheckCircle } from "lucide-react"
import Image from "next/image"
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';

type ProductStatus = NonNullable<Product['status']>;
type PostStatus = NonNullable<BbsPost['status']>;


function ProductTable({ products, loading, onStatusChange, onSetReason, onHardDelete }: { 
    products: Product[] | null, 
    loading: boolean, 
    onStatusChange: (id: string, status: ProductStatus) => void, 
    onSetReason: (product: Product) => void,
    onHardDelete: (id: string) => void
}) {
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
                    <TableHead className="w-[100px]">卖家</TableHead>
                    <TableHead className="w-[120px]">价格</TableHead>
                    <TableHead className="w-[180px]">提交时间</TableHead>
                    <TableHead className="w-[120px]">原因</TableHead>
                    <TableHead className="w-[80px] text-right">操作</TableHead>
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
                        <TableCell>
                            <Badge variant={product.reviewReason ? "destructive" : "secondary"}>{product.reviewReason || 'N/A'}</Badge>
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
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        <span>批准 (重新发布)</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onSetReason(product)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>添加/更新原因</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-destructive focus:bg-destructive/10"
                                        onClick={() => onHardDelete(product.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>彻底删除</span>
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

function PostTable({ posts, loading, onStatusChange, onSetReason, onHardDelete }: { 
    posts: BbsPost[] | null, 
    loading: boolean, 
    onStatusChange: (id: string, status: PostStatus) => void, 
    onSetReason: (post: BbsPost) => void,
    onHardDelete: (id: string) => void
}) {
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
                    <TableHead className="w-[100px]">作者</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                    <TableHead className="w-[180px]">提交时间</TableHead>
                    <TableHead className="w-[120px]">原因</TableHead>
                    <TableHead className="w-[80px] text-right">操作</TableHead>
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
                        <TableCell />
                        <TableCell>{post.createdAt ? format(post.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                         <TableCell>
                            <Badge variant={post.reviewReason ? "destructive" : "secondary"}>{post.reviewReason || 'N/A'}</Badge>
                        </TableCell>
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
                                    <DropdownMenuItem onClick={() => onSetReason(post)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>添加/更新原因</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                        className="text-destructive focus:bg-destructive/10"
                                        onClick={() => onHardDelete(post.id)}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>彻底删除</span>
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
    
    // Review Item State
    const [itemToReview, setItemToReview] = useState<{ type: 'product' | 'post', item: Product | BbsPost } | null>(null);
    const [reviewReason, setReviewReason] = useState('涉黄');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Hard delete state
    const [itemToHardDelete, setItemToHardDelete] = useState<{ type: 'product' | 'post'; id: string } | null>(null);

    // Product states
    const productsQuery = useMemo(() => firestore ? query(collection(firestore, 'products'), where('status', '==', 'under_review')) : null, [firestore]);
    const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery);

    // Post states
    const postsQuery = useMemo(() => firestore ? query(collection(firestore, 'bbs'), where('status', '==', 'under_review')) : null, [firestore]);
    const { data: posts, loading: postsLoading } = useCollection<BbsPost>(postsQuery);

    const handleStatusChange = async (collectionName: 'products' | 'bbs', itemId: string, status: ProductStatus | PostStatus) => {
        if (!firestore) return;
        const itemRef = doc(firestore, collectionName, itemId);
        try {
            await updateDoc(itemRef, { status, reviewReason: null }); // Also clear the reason when approving
            toast({ title: '状态已更新', description: `项目已设置为 "${'status'}"。` });
        } catch (error) {
            console.error("Failed to update status:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'update', requestResourceData: { status } }));
        }
    };
    
    const handleConfirmSetReason = async () => {
        if (!firestore || !itemToReview) return;

        const finalReason = reviewReason === '其它违规' ? customReason : reviewReason;
        if (!finalReason || !finalReason.trim()) {
            toast({ variant: 'destructive', title: '原因不能为空' });
            return;
        }

        const collectionPath = itemToReview.type === 'product' ? 'products' : 'bbs';
        const itemRef = doc(firestore, collectionPath, itemToReview.item.id);

        setIsSubmitting(true);
        try {
            await updateDoc(itemRef, { reviewReason: finalReason });
            toast({ title: '原因已记录' });
            setItemToReview(null);
            setReviewReason('涉黄');
            setCustomReason('');
        } catch (error) {
            console.error("Failed to set review reason:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'update', requestResourceData: { reviewReason: finalReason } }));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleConfirmHardDelete = async () => {
        if (!firestore || !itemToHardDelete) return;

        setIsSubmitting(true);
        const { type, id } = itemToHardDelete;
        const collectionPath = type === 'product' ? 'products' : 'bbs';
        const itemRef = doc(firestore, collectionPath, id);

        try {
            await deleteDoc(itemRef);
            toast({ title: '项目已彻底删除' });
            setItemToHardDelete(null);
        } catch (error) {
            console.error("Failed to hard delete item:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: itemRef.path, operation: 'delete' }));
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div>
            <h2 className="text-3xl font-headline mb-2">问题内容管理</h2>
            <p className="text-muted-foreground mb-8">此页面列出了被标记为需要审核的商品和帖子。请检查并进行相应操作。</p>
            
            <div className="mb-12">
                <h3 className="text-2xl font-headline mb-4">待审核商品</h3>
                <ProductTable 
                    products={products} 
                    loading={productsLoading} 
                    onStatusChange={(id, status) => handleStatusChange('products', id, status)} 
                    onSetReason={(product) => setItemToReview({ type: 'product', item: product })} 
                    onHardDelete={(id) => setItemToHardDelete({ type: 'product', id })}
                />
            </div>

            <div>
                <h3 className="text-2xl font-headline mb-4">待审核帖子</h3>
                 <PostTable 
                    posts={posts} 
                    loading={postsLoading} 
                    onStatusChange={(id, status) => handleStatusChange('bbs', id, status)}
                    onSetReason={(post) => setItemToReview({ type: 'post', item: post })} 
                    onHardDelete={(id) => setItemToHardDelete({ type: 'post', id })}
                />
            </div>

            <Dialog open={!!itemToReview} onOpenChange={(open) => !open && setItemToReview(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>为 "{('name' in (itemToReview?.item || {})) ? itemToReview?.item.name : itemToReview?.item.title}" 添加审核原因</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="reason-select">选择原因</Label>
                        <Select value={reviewReason} onValueChange={setReviewReason}>
                            <SelectTrigger id="reason-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="涉黄">涉黄 (Pornographic)</SelectItem>
                                <SelectItem value="涉暴">涉暴 (Violent)</SelectItem>
                                <SelectItem value="其它违规">其它违规 (Other)</SelectItem>
                            </SelectContent>
                        </Select>
                        {reviewReason === '其它违规' && (
                            <div className="grid gap-2">
                                <Label htmlFor="custom-reason">请具体说明</Label>
                                <Input id="custom-reason" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToReview(null)} disabled={isSubmitting}>取消</Button>
                        <Button onClick={handleConfirmSetReason} disabled={isSubmitting}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={!!itemToHardDelete} onOpenChange={(open) => !open && setItemToHardDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>您确定要彻底删除吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将从数据库中永久删除该项目，且无法恢复。这与将商品状态设置为“隐藏”不同。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setItemToHardDelete(null)} disabled={isSubmitting}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmHardDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            确认彻底删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
