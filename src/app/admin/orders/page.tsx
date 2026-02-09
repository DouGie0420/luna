'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart, AlertCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { useTranslation } from "@/hooks/use-translation";
import type { Order, OrderStatus } from "@/lib/types";


const statusMap: OrderStatus[] = [
  'Pending',
  'In Escrow',
  'Shipped',
  'Awaiting Confirmation',
  'Completed',
  'Disputed',
  'Released',
  'Refunded',
  'Cancelled'
];

const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
        case 'Completed':
        case 'Released':
             return 'default';
        case 'Disputed':
        case 'Cancelled':
        case 'Refunded':
             return 'destructive';
        default: return 'secondary';
    }
};

export default function AdminOrdersPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');
  
  const ordersQuery = useMemo(() => {
      if (!firestore || !hasAccess) return null;

      const baseQuery = collection(firestore, 'orders');

      if (activeTab === 'all') {
          return query(baseQuery, orderBy('createdAt', 'desc'));
      } else {
          // This requires a composite index (status ASC, createdAt DESC)
          // Firestore will generate an error with a link to create it if it doesn't exist.
          return query(baseQuery, where('status', '==', activeTab), orderBy('createdAt', 'desc'));
      }
  }, [firestore, hasAccess, activeTab]);

  const { data: orders, loading: dataLoading, error } = useCollection<Order>(ordersQuery);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !hasAccess) return;
    setProcessingId(orderId);
    try {
        const docRef = doc(firestore, "orders", orderId);
        await updateDoc(docRef, { status: newStatus });
        toast({ title: t('admin.ordersPage.statusUpdated'), description: t('admin.ordersPage.statusUpdatedDesc', { orderId: orderId.slice(0,6), status: t(getStatusTranslationKey(newStatus), newStatus) }) });
    } catch (error) {
        toast({ 
            variant: "destructive", 
            title: t('admin.ordersPage.updateFailed'), 
            description: t('admin.ordersPage.updateFailedDesc') 
        });
    } finally {
        setProcessingId(null);
    }
  };

  const handleResolveDisputeClick = async (order: Order, releaseToSeller: boolean) => {
    setProcessingId(order.id);
    toast({ title: "Simulating Blockchain Transaction...", description: "Please wait." });
    
    // Simulate a delay for blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update the status in Firestore to show the result of the mock transaction
    await handleStatusUpdate(order.id, releaseToSeller ? 'Released' : 'Refunded');
    
    // No need to setProcessingId(null) here because handleStatusUpdate does it.
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在安全加载订单数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-destructive">数据库查询失败</h2>
        <p className="text-muted-foreground max-w-md">无法按状态筛选订单。这很可能是因为缺少数据库索引。</p>
        <p className="mt-2 text-xs text-muted-foreground">请打开浏览器开发者控制台（通常是F12），找到包含 `https://console.firebase.google.com/...` 的错误信息，点击链接即可一键创建所需的索引。</p>
        <pre className="mt-4 p-4 text-xs bg-muted rounded-md text-left overflow-auto">{error.message}</pre>
        <Button onClick={() => setActiveTab('all')}>显示全部订单</Button>
      </div>
    );
  }
  
  const getStatusTranslationKey = (status: OrderStatus) => {
    const key = status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '');
    return `accountPurchases.status.${key}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
          <p className="text-sm text-muted-foreground">管理并查看系统所有交易记录</p>
        </div>
        <Badge variant="secondary" className="px-4 py-1">
          当前权限: {profile?.role?.toUpperCase()}
        </Badge>
      </div>
       <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                {statusMap.map(status => (
                  <TabsTrigger key={status} value={status}>
                    {t(getStatusTranslationKey(status), status)}
                  </TabsTrigger>
                ))}
            </TabsList>
            <Card className="mt-4 border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" /> 
                    订单列表 ({orders?.length || 0})
                  </CardTitle>
                  <CardDescription>当前筛选: {activeTab === 'all' ? '全部' : t(getStatusTranslationKey(activeTab), activeTab)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>订单信息</TableHead>
                          <TableHead>买家 / 卖家</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!orders || orders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                              该状态下暂无订单记录
                            </TableCell>
                          </TableRow>
                        ) : (
                          orders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <p className="font-semibold">{order.productName}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  ID: {order.id.slice(0, 8)}...
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-xs">买: <span className="font-mono">{order.buyerId.slice(0, 8)}...</span></p>
                                <p className="text-xs">卖: <span className="font-mono">{order.sellerId.slice(0, 8)}...</span></p>
                              </TableCell>
                              <TableCell className="font-medium">
                                {order?.totalAmount != null 
                                  ? Number(order.totalAmount).toLocaleString() 
                                  : "0"}{" "}
                                <span className="text-[10px] text-muted-foreground">{order.currency || 'USD'}</span>
                              </TableCell>
                              <TableCell>
                                 <Badge variant={getStatusBadgeVariant(order.status)}>
                                    {t(getStatusTranslationKey(order.status), order.status)}
                                 </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={processingId === order.id}>
                                        {processingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{t('admin.ordersPage.set_status')}</DropdownMenuLabel>
                                     {statusMap.map(status => (
                                          <DropdownMenuItem 
                                            key={status} 
                                            onSelect={() => handleStatusUpdate(order.id, status)}
                                            disabled={order.status === status}
                                          >
                                            {t(getStatusTranslationKey(status), status)}
                                          </DropdownMenuItem>
                                        ))}
                                    {(order.status === 'In Escrow' || order.status === 'Shipped') && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => handleStatusUpdate(order.id, 'Disputed')}>
                                                Open Dispute Case
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {order.status === 'Disputed' && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel className="text-amber-500">Dispute Actions</DropdownMenuLabel>
                                            <DropdownMenuItem className="focus:bg-green-500/20" onSelect={() => handleResolveDisputeClick(order, true)}>
                                                Release to Seller
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="focus:bg-red-500/20" onSelect={() => handleResolveDisputeClick(order, false)}>
                                                Refund to Buyer
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
            </Card>
        </Tabs>
    </div>
  );
}

    