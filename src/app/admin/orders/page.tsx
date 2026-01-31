'use client';

import { useMemo } from 'react';
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
import { useTranslation } from "@/hooks/use-translation";

export default function AdminOrdersPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const ordersQuery = useMemo(() => firestore ? query(collection(firestore, 'orders')) : null, [firestore]);
    const { data: orders, loading } = useCollection<Order>(ordersQuery);

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin.ordersPage.orderId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.productId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.buyerId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.sellerId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.amount')}</TableHead>
                        <TableHead>{t('admin.ordersPage.status')}</TableHead>
                        <TableHead>{t('admin.ordersPage.actions')}</TableHead>
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
