'use client';

import { useEffect, useState } from "react";
import { useUser, useFirestore } from "@/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  where,
  getDoc,
  increment,
  writeBatch
} from "firebase/firestore";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Clock, Wallet } from "lucide-react";
import { format } from "date-fns";

export default function AdminPaymentRequestsPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 权限拦截：根据你的定义，这四个级别都有权进入此页面
  const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      toast({
        variant: "destructive",
        title: "访问被拒绝",
        description: "您没有权限访问收款申请管理页面。",
      });
      router.push("/admin");
    }
  }, [profile, authLoading, hasAccess, router]);

  const fetchRequests = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const q = query(
        collection(firestore, "payment_requests"),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({ variant: "destructive", title: "加载失败", description: "无法获取收款申请列表" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchRequests();
    }
  }, [firestore, hasAccess]);

  const handleAction = async (requestId: string, userId: string, amount: number, action: 'approve' | 'reject') => {
    if (!firestore || !profile) return;
    
    setProcessingId(requestId);
    try {
      const batch = writeBatch(firestore);
      const requestRef = doc(firestore, "payment_requests", requestId);
      const userRef = doc(firestore, "users", userId);

      if (action === 'approve') {
        // 更新申请状态
        batch.update(requestRef, {
          status: 'Completed',
          processedAt: new Date(),
          processedBy: profile.uid
        });
        // 这里的业务逻辑示例：如果是提现申请，扣除余额；如果是充值/收款，增加记录
        // 假设这是收款/提现审核：
        batch.update(userRef, {
          updatedAt: new Date()
        });
      } else {
        batch.update(requestRef, {
          status: 'Rejected',
          processedAt: new Date(),
          processedBy: profile.uid
        });
      }

      await batch.commit();
      
      toast({
        title: action === 'approve' ? "申请已批准" : "申请已拒绝",
        description: `操作员: ${profile.displayName || profile.role}`,
      });
      fetchRequests();
    } catch (error) {
      console.error("Action error:", error);
      toast({ variant: "destructive", title: "操作失败" });
    } finally {
      setProcessingId(null);
    }
  };

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
        <h1 className="text-3xl font-bold tracking-tight">收款申请管理</h1>
        <Badge variant="outline" className="px-3 py-1">
          当前权限: {profile?.role?.toUpperCase()}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            待处理申请
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户 ID</TableHead>
                <TableHead>金额</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    暂无收款申请记录
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-mono text-xs">{req.userId}</TableCell>
                    <TableCell className="font-bold">
                      {req.currency || '$'} {req.amount?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{req.type || 'Withdraw'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.createdAt?.seconds 
                        ? format(new Date(req.createdAt.seconds * 1000), 'yyyy-MM-dd HH:mm')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction(req.id, req.userId, req.amount, 'reject')}
                            disabled={!!processingId}
                          >
                            {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                            拒绝
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction(req.id, req.userId, req.amount, 'approve')}
                            disabled={!!processingId}
                          >
                            {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            批准
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">已处理</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'Pending':
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500 gap-1"><Clock className="h-3 w-3" /> 待审核</Badge>;
    case 'Completed':
      return <Badge variant="outline" className="text-green-500 border-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> 已完成</Badge>;
    case 'Rejected':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> 已拒绝</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}