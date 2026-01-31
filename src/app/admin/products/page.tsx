'use client';

import { useCollection, useFirestore } from "@/firebase";
import { collection, query } from "firebase/firestore";
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
import { MoreHorizontal, Loader2 } from "lucide-react"
import Image from "next/image"

export default function AdminProductsPage() {
    const firestore = useFirestore();
    const productsQuery = firestore ? query(collection(firestore, 'products')) : null;
    const { data: products, loading } = useCollection<Product>(productsQuery);

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">Manage Products</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products && products.map(product => (
                        <TableRow key={product.id}>
                            <TableCell className="font-medium flex items-center gap-3">
                                {product.images && product.images.length > 0 && (
                                  <Image src={product.images[0]} alt={product.name} width={40} height={30} className="rounded-md object-cover" data-ai-hint={product.imageHints ? product.imageHints[0] : ''} />
                                )}
                                {product.name}
                            </TableCell>
                            <TableCell>{product.seller.name}</TableCell>
                            <TableCell>{product.price.toLocaleString()} {product.currency}</TableCell>
                            <TableCell>
                                <Badge>Active</Badge>
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
