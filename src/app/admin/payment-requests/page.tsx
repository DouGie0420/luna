'use client';

import { useCollection, useFirestore, useUser } from "@/firebase";
import React, { useMemo } from 'react';
import { collection, query, doc, updateDoc, orderBy } from "firebase/firestore";
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
} from "@/components/ui/select";
import { Loader2, Receipt, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// 假设你的收款申请类型定义如下
interface PaymentRequest {
  id: string;
  uid: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method: string;
  createdAt: any;
  userEmail?: string;
}

export default function PaymentRequestsPage() {
    const { profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // --- 权限判定逻辑 ---
    const userRole = currentUserProfile?.role;
    // 根据你的定义：admin, ghost, staff, support 都有权处理收款申请
    const hasAccess = ['admin', 'ghost', 'staff', 'support'].includes(userRole || '');

    const paymentsQuery = useMemo(() => {
        if (!firestore || !hasAccess) return null;
        return query(collection(firestore, 'paymentRequests'), orderBy('createdAt', 'desc'));
    }, [firestore, hasAccess]);

    const { data: payments, loading } = useCollection<PaymentRequest>(paymentsQuery);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!firestore || !hasAccess) return;

        try {
            const docRef = doc(firestore, "paymentRequests", id);
            await updateDoc(docRef, { status: newStatus });
            toast({ title: '更新成功', description: `申请状态已更新为 ${newStatus}` });
        } catch (error) {
            toast({ 
                variant: "destructive", 
                title: '更新失败', 
                description: '请检查权限设置或网络连接' 
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-xl">
                <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-2xl font-bold">权限不足</h2>
                <p className="text-muted-foreground mt-2">您没有访问收款申请页面的权限。</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-headline flex items-center gap-2">
                    <Receipt className="h-8 w-8" />
                    收款申请管理
                </h2>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>申请人</TableHead>
                            <TableHead>金额</TableHead>
                            <TableHead>方式</TableHead>
                            <TableHead>申请时间</TableHead>
                            <TableHead>状态</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments && payments.length > 0 ? (
                            payments.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.userEmail || '未知用户'}</TableCell>
                                    <TableCell>${req.amount}</TableCell>
                                    <TableCell><Badge variant="outline">{req.method}</Badge></TableCell>
                                    <TableCell>
                                        {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'yyyy/MM/dd HH:mm') : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            defaultValue={req.status} 
                                            onValueChange={(val) => handleStatusUpdate(req.id, val)}
                                        >
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="pending">待处理</SelectItem>
                                                <SelectItem value="approved">已通过</SelectItem>
                                                <SelectItem value="rejected">已拒绝</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                    暂无收款申请数据
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}