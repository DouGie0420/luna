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

const orders = [
    { id: "ORD001", product: "Vintage Film Camera", buyer: "Charlie Brown", seller: "Alex Doe", amount: "6,500 THB", status: "In Escrow" },
    { id: "ORD002", product: "Handmade Leather Wallet", buyer: "Alex Doe", seller: "Billie Jean", amount: "120 RMB", status: "Completed" },
    { id: "ORD003", product: "Gen-5 Smart Watch", buyer: "Billie Jean", seller: "Charlie Brown", amount: "150 USDT", status: "Disputed" },
]

export default function AdminOrdersPage() {
    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">Manage Orders</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Seller</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{order.product}</TableCell>
                            <TableCell>{order.buyer}</TableCell>
                            <TableCell>{order.seller}</TableCell>
                            <TableCell>{order.amount}</TableCell>
                            <TableCell>
                                <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' ? 'destructive' : 'secondary')}>{order.status}</Badge>
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
