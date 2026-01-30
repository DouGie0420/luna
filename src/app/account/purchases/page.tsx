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
import Image from "next/image"

const purchases = [
    { id: "ORD002", product: { name: "Handmade Leather Wallet", image: "https://images.unsplash.com/photo-1549492423-400259a5e3c2?q=80&w=600&auto=format&fit=crop", imageHint: "neon abstract" }, seller: "Billie Jean", amount: "120 RMB", status: "Completed", date: "2023-10-25" },
    { id: "ORD004", product: { name: "Ceramic Vase", image: "https://images.unsplash.com/photo-1597589684358-2c2e07e8a3a4?q=80&w=600&auto=format&fit=crop", imageHint: "glitch art" }, seller: "Alex Doe", amount: "2,500 THB", status: "In Escrow", date: "2023-10-28" },
]

export default function MyPurchasesPage() {
    return (
        <div>
            <h1 className="text-3xl font-headline mb-6">My Purchases</h1>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40%]">Product</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {purchases.map(order => (
                        <TableRow key={order.id}>
                             <TableCell className="font-medium">
                                <div className="flex items-center gap-4">
                                    <div className="aspect-square w-16 relative">
                                        <Image src={order.product.image} alt={order.product.name} fill className="object-cover" data-ai-hint={order.product.imageHint} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{order.product.name}</span>
                                        <span className="text-xs text-muted-foreground">Sold by {order.seller}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>{order.id}</TableCell>
                            <TableCell>{order.amount}</TableCell>
                            <TableCell>
                                <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'}>{order.status}</Badge>
                            </TableCell>
                            <TableCell>{order.date}</TableCell>
                             <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                    <Button variant="outline" size="sm">View Order</Button>
                                    <Button variant="ghost" size="sm">Contact Seller</Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
