'use client';

import { useEffect, useState } from "react";
import { useUser, useFirestore } from "@/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart, Eye } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function AdminOrdersPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 严格匹配你的四级权限需求
  const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      toast({ variant: "destructive", title: "访问受限", description: "您没有权限管理订单。" });
      router.push("/admin");
    }
  }, [profile, authLoading, hasAccess, router]);

  const fetchOrders = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const q = query(collection(firestore, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(data);
    } catch (error) {
      console.error("Fetch orders error:", error);
      toast({ variant: "destructive", title: "同步失败" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) fetchOrders();
  }, [firestore, hasAccess]);

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">订单管理</h1>
        <Badge variant="outline">角色: {profile?.role?.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> 所有订单</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>买家 ID</TableHead>
                <TableHead>卖家 ID</TableHead>
                <TableHead>总金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.buyerId || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs">{order.sellerId || 'N/A'}</TableCell>
                  <TableCell>
                    {/* 关键修复点：增加类型判断和兜底 */}
                    {typeof order.totalAmount === 'number' 
                      ? order.totalAmount.toLocaleString() 
                      : (order.totalAmount || '0')} {order.currency || ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === 'Completed' ? 'default' : (order.status === 'Disputed' ? 'destructive' : 'secondary')}>
                      {order.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}