'use client';

import { useMemo } from 'react';
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
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
import { MoreHorizontal, Loader2, ShieldAlert } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminOrdersPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { profile, loading: userLoading } = useUser();

    const ordersQuery = useMemo(() => {
        if (!firestore || !profile) return null;
        // IMPORTANT: Only allow 'admin' or 'ghost' roles to view all orders.
        // This prevents users with lesser roles (like 'staff') from triggering permission errors.
        if (profile.role === 'admin' || profile.role === 'ghost') {
            return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
        }
        return null; // Return null for unauthorized roles, which is handled below.
    }, [firestore, profile]);

    const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

    // The component is loading if the user profile is loading,
    // OR if a query is supposed to run and that query is loading.
    const loading = userLoading || (!!ordersQuery && ordersLoading);

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    // If the query is null, it means the user doesn't have permission.
    // Display an explicit access denied message.
    if (!ordersQuery) {
        return (
             <div>
                <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>{t('admin.layout.accessDenied')}</AlertTitle>
                    <AlertDescription>
                        Only users with 'Admin' or 'Ghost' roles can view all orders.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin.ordersPage.orderId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.createdAt')}</TableHead>
                        <TableHead>{t('admin.ordersPage.buyerId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.sellerId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.amount')}</TableHead>
                        <TableHead>{t('admin.ordersPage.status')}</TableHead>
                        <TableHead className="text-right">{t('admin.ordersPage.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders && orders.length > 0 ? (
                        orders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium font-mono text-xs">{order.id}</TableCell>
                             <TableCell>
                                {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{order.buyerId}</TableCell>
                            <TableCell className="font-mono text-xs">{order.sellerId}</TableCell>
                            <TableCell>{order.totalAmount.toLocaleString()} {order.currency}</TableCell>
                            <TableCell>
                                <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' ? 'destructive' : 'secondary')}>{order.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                {t('admin.ordersPage.noOrders')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
