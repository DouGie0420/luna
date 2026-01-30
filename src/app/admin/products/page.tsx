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
import { MoreHorizontal } from "lucide-react"
import { getProducts } from "@/lib/data"
import Image from "next/image"

export default async function AdminProductsPage() {
    const products = await getProducts();

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
                        <TableHead>Listed Date</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map(product => (
                        <TableRow key={product.id}>
                            <TableCell className="font-medium flex items-center gap-3">
                                <Image src={product.images[0]} alt={product.name} width={40} height={30} className="rounded-md object-cover" data-ai-hint={product.imageHints[0]} />
                                {product.name}
                            </TableCell>
                            <TableCell>{product.seller.name}</TableCell>
                            <TableCell>{product.price.toLocaleString()} {product.currency}</TableCell>
                            <TableCell>
                                <Badge>Active</Badge>
                            </TableCell>
                            <TableCell>2023-10-26</TableCell>
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
