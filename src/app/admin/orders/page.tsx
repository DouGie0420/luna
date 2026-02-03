'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import type { Order, OrderStatus } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldAlert } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const orderStatuses: OrderStatus[] = [
    "Pending",
    "In Escrow",
    "Shipped",
    "Awaiting Confirmation",
    "Completed",
    "Disputed",
    "Cancelled",
];

const statusKeyMap: Record<OrderStatus, string> = {
    "Pending": "pending",
    "In Escrow": "inEscrow",
    "Shipped": "shipped",
    "Awaiting Confirmation": "awaitingConfirmation",
    "Completed": "completed",
    "Disputed": "disputed",
    "Cancelled": "cancelled",
};


export default function AdminOrdersPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const { toast } = useToast();
    const { profile, loading: userLoading } = useUser();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'All'>('All');

    const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');

    const ordersQuery = useMemo(() => {
        if (!firestore || !hasAccess) return null;
        return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'));
    }, [firestore, hasAccess]);

    const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

    const filteredOrders = useMemo(() => {
        if (!orders) return [];
        if (filterStatus === 'All') {
            return orders;
        }
        return orders.filter(order => order.status === filterStatus);
    }, [orders, filterStatus]);

    const loading = userLoading || (!!ordersQuery && ordersLoading);

    const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        if (!firestore) return;
        setProcessingId(orderId);
        try {
            const orderRef = doc(firestore, 'orders', orderId);
            await updateDoc(orderRef, { status: newStatus });
            toast({
                title: t('admin.ordersPage.statusUpdated'),
                description: t('admin.ordersPage.statusUpdatedDesc', { 
                    orderId: orderId.slice(0, 6),
                    status: t(`accountPurchases.status.${statusKeyMap[newStatus]}`)
                 }),
            });
        } catch (error) {
            console.error("Failed to update order status:", error);
            toast({
                variant: "destructive",
                title: t('admin.ordersPage.updateFailed'),
                description: t('admin.ordersPage.updateFailedDesc'),
            });
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!hasAccess) {
        return (
             <div>
                <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>{t('admin.layout.accessDenied')}</AlertTitle>
                    <AlertDescription>
                        您没有权限查看所有订单。
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>

            <Tabs defaultValue="All" className="mb-4" onValueChange={(value) => setFilterStatus(value as OrderStatus | 'All')}>
                <TabsList>
                    <TabsTrigger value="All">{t('accountPurchases.tabs.all')}</TabsTrigger>
                    <TabsTrigger value="In Escrow">{t('accountPurchases.tabs.toShip')}</TabsTrigger>
                    <TabsTrigger value="Shipped">{t('accountPurchases.tabs.toReceive')}</TabsTrigger>
                    <TabsTrigger value="Completed">{t('accountPurchases.tabs.completed')}</TabsTrigger>
                    <TabsTrigger value="Disputed">{t('accountPurchases.tabs.disputed')}</TabsTrigger>
                </TabsList>
            </Tabs>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('admin.ordersPage.orderId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.createdAt')}</TableHead>
                        <TableHead>{t('admin.ordersPage.buyerId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.sellerId')}</TableHead>
                        <TableHead>{t('admin.ordersPage.amount')}</TableHead>
                        <TableHead>{t('admin.ordersPage.status')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredOrders && filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium font-mono text-xs">{order.id}</TableCell>
                             <TableCell>
                                {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{order.buyerId}</TableCell>
                            <TableCell className="font-mono text-xs">{order.sellerId}</TableCell>
                            <TableCell>{typeof order.totalAmount === 'number' ? order.totalAmount.toLocaleString() : (order.totalAmount || 'N/A')} {order.currency || ''}</TableCell>
                            <TableCell>
                               <Select
                                    value={order.status}
                                    onValueChange={(newStatus) => handleStatusChange(order.id, newStatus as OrderStatus)}
                                    disabled={processingId === order.id}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={t('admin.ordersPage.set_status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orderStatuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                 <Badge variant={status === 'Completed' ? 'default' : (status === 'Disputed' || status === 'Cancelled' ? 'destructive' : 'secondary')}>
                                                    {t(`accountPurchases.status.${statusKeyMap[status]}`)}
                                                </Badge>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </TableRow>
                    ))) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t('accountPurchases.noOrdersTitle')}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
