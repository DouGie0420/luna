import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const purchases = [
    { id: "ORD002", product: "Handmade Leather Wallet", seller: "Billie Jean", amount: "120 RMB", status: "Completed", date: "2023-10-25" },
    { id: "ORD004", product: "Ceramic Vase", seller: "Alex Doe", amount: "2,500 THB", status: "In Escrow", date: "2023-10-28" },
]

export default function MyPurchasesPage() {
    return (
        <div>
            <h1 className="text-3xl font-headline mb-6">My Purchases</h1>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {purchases.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.id}</TableCell>
                            <TableCell>{order.product}</TableCell>
                            <TableCell>{order.amount}</TableCell>
                            <TableCell>
                                <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'}>{order.status}</Badge>
                            </TableCell>
                            <TableCell>{order.date}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
