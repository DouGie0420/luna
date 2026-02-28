// 覆盖到：src/app/admin/consignment/page.tsx

'use client';

import { useEffect, useState } from "react";
import { useUser, useFirestore } from "@/firebase";
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  updateDoc, 
  where
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
import { Loader2, CheckCircle2, XCircle, Clock, ShieldCheck, MessageSquare, Box } from "lucide-react";
import { format } from "date-fns";

export default function AdminConsignmentPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 权限拦截
  const hasAccess = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      toast({
        variant: "destructive",
        title: "访问被拒绝",
        description: "您没有权限访问寄卖审核管理页面。",
      });
      router.push("/admin");
    }
  }, [profile, authLoading, hasAccess, router]);

  // 🚀 核心抓取逻辑：只抓取前端申请了寄卖的商品
  const fetchConsignmentRequests = async () => {
    if (!firestore) return;
    setLoading(true);
    try {
      const q = query(
        collection(firestore, "products"),
        where("isConsignment", "==", true)
      );
      const querySnapshot = await getDocs(q);
      
      // 在内存中排序，避免复杂的 Firebase 复合索引报错
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                     .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                     
      setProducts(data);
    } catch (error) {
      console.error("Fetch error:", error);
      toast({ variant: "destructive", title: "加载失败", description: "无法获取寄卖申请列表" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchConsignmentRequests();
    }
  }, [firestore, hasAccess]);

  const handleAction = async (productId: string, action: 'approve' | 'reject') => {
    if (!firestore || !profile) return;
    
    setProcessingId(productId);
    try {
      const productRef = doc(firestore, "products", productId);

      if (action === 'approve') {
        // 审核通过，商品正式上架销售
        await updateDoc(productRef, {
          status: 'active',
          consignmentReviewedAt: new Date(),
          consignmentReviewedBy: profile.uid
        });
      } else {
        // 拒绝寄卖，商品被驳回
        await updateDoc(productRef, {
          status: 'rejected',
          consignmentReviewedAt: new Date(),
          consignmentReviewedBy: profile.uid
        });
      }

      toast({
        title: action === 'approve' ? "寄卖审核已通过" : "寄卖已驳回",
        description: `操作员: ${profile.displayName || profile.role}`,
      });
      fetchConsignmentRequests();
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
        <Loader2 className="h-8 w-8 animate-spin text-[#ff00ff]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">官方寄卖审查 (Consignment)</h1>
        <Badge variant="outline" className="px-3 py-1">
          当前权限: {profile?.role?.toUpperCase()}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#ff00ff]" />
            待联系与查验清单
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名称/分类</TableHead>
                <TableHead>卖家联络方式 (高优)</TableHead>
                <TableHead>定价</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>当前状态</TableHead>
                <TableHead className="text-right">审查操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    暂无需要处理的寄卖申请
                  </TableCell>
                </TableRow>
              ) : (
                products.map((prod) => (
                  <TableRow key={prod.id}>
                    
                    <TableCell>
                      <div className="font-bold text-sm max-w-[200px] truncate" title={prod.name}>
                        {prod.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Box size={12}/> {prod.category}
                      </div>
                    </TableCell>

                    {/* 🚀 极其重要的联系方式展示 */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-cyan-500 font-mono font-bold bg-cyan-500/10 px-3 py-1.5 rounded-lg w-fit">
                        <MessageSquare size={14} />
                        {prod.consignmentContact || '未提供'}
                      </div>
                    </TableCell>

                    <TableCell className="font-bold">
                      {prod.price?.toLocaleString()} {prod.currency}
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">
                      {prod.createdAt?.seconds 
                        ? format(new Date(prod.createdAt.seconds * 1000), 'yyyy-MM-dd HH:mm')
                        : 'N/A'}
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={prod.status} />
                    </TableCell>

                    <TableCell className="text-right">
                      {prod.status === 'under_review' ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleAction(prod.id, 'reject')}
                            disabled={!!processingId}
                          >
                            {processingId === prod.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                            驳回
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-[#ff00ff] hover:bg-[#d900d9] text-white"
                            onClick={() => handleAction(prod.id, 'approve')}
                            disabled={!!processingId}
                          >
                            {processingId === prod.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            收货并上架
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
    case 'under_review':
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500 gap-1"><Clock className="h-3 w-3" /> 等待查验仓收货</Badge>;
    case 'active':
      return <Badge variant="outline" className="text-green-500 border-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> 已上架</Badge>;
    case 'rejected':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> 已驳回</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}