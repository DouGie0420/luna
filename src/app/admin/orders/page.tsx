'use client';

import { useEffect, useState, useCallback } from "react";
import { useUser, useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart, Eye, AlertCircle } from "lucide-react";
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
  'Cancelled'
];

export default function AdminOrdersPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');

  const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');

  const fetchOrders = useCallback(async () => {
    if (!firestore || !hasAccess) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const q = query(collection(firestore, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Order));
      setOrders(data);
    } catch (err: any) {
      console.error("Fetch orders error:", err);
      setError(err.message || "无法加载订单数据");
      toast({ 
        variant: "destructive", 
        title: "同步失败", 
        description: "请检查数据库连接或权限设置" 
      });
    } finally {
      setLoading(false);
    }
  }, [firestore, hasAccess, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!hasAccess) {
        toast({ variant: "destructive", title: "访问受限" });
        router.push("/admin");
      } else {
        fetchOrders();
      }
    }
  }, [authLoading, hasAccess, fetchOrders, router, toast]);

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    if (!firestore || !hasAccess) return;
    
    try {
        const docRef = doc(firestore, "orders", orderId);
        await updateDoc(docRef, { status: newStatus });
        toast({ title: t('admin.ordersPage.statusUpdated'), description: t('admin.ordersPage.statusUpdatedDesc', { orderId: orderId.slice(0,6), status: newStatus }) });
        // Optimistically update UI
        setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    } catch (error) {
        toast({ 
            variant: "destructive", 
            title: t('admin.ordersPage.updateFailed'), 
            description: t('admin.ordersPage.updateFailedDesc') 
        });
    }
  };

  const filteredOrders = activeTab === 'all' 
    ? orders 
    : orders.filter(order => order.status === activeTab);


  if (authLoading || loading) {
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
        <h2 className="text-xl font-bold">加载出错</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => fetchOrders()}>重试一次</Button>
      </div>
    );
  }
  
  const getStatusTranslationKey = (status: OrderStatus) => {
    return `accountPurchases.status.${status.charAt(0).toLowerCase() + status.slice(1).replace(/\s/g, '')}`;
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
                    订单列表 ({filteredOrders.length})
                  </CardTitle>
                  <CardDescription>当前筛选: {activeTab === 'all' ? '全部' : t(getStatusTranslationKey(activeTab), activeTab)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>订单 ID / 时间</TableHead>
                          <TableHead>买家 / 卖家</TableHead>
                          <TableHead>金额</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                              该状态下暂无订单记录
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <p className="font-mono text-xs">{order.id.slice(0, 8)}...</p>
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
                                <Select 
                                    defaultValue={order.status} 
                                    onValueChange={(val: OrderStatus) => handleStatusUpdate(order.id, val)}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusMap.map(status => (
                                          <SelectItem key={status} value={status}>{t(getStatusTranslationKey(status), status)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
