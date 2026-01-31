'use client';

import { useCollection, useFirestore } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Order } from "@/lib/types";
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

export default function AdminOrdersPage() {
    const firestore = useFirestore();
    const ordersQuery = firestore ? query(collection(firestore, 'orders')) : null;
    const { data: orders, loading } = useCollection<Order>(ordersQuery);

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">Manage Orders</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Product ID</TableHead>
                        <TableHead>Buyer ID</TableHead>
                        <TableHead>Seller ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders && orders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium font-mono text-xs">{order.id}</TableCell>
                            <TableCell className="font-mono text-xs">{order.productId}</TableCell>
                            <TableCell className="font-mono text-xs">{order.buyerId}</TableCell>
                            <TableCell className="font-mono text-xs">{order.sellerId}</TableCell>
                            <TableCell>{order.totalAmount.toLocaleString()} {order.currency}</TableCell>
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
