'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection, useUser } from "@/firebase"; // Changed useAuth to useUser
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, ShieldAlert, ArrowRight, Banknote, QrCode } from "lucide-react";
import type { PaymentChangeRequest } from '@/lib/types';
import { format } from 'date-fns';
import Image from 'next/image';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const InfoRow = ({ label, value }: { label: string, value: string | null | undefined }) => (
    <div className="text-sm">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-mono text-xs">{value || 'N/A'}</p>
    </div>
);

const QrCodeDiff = ({ label, oldUrl, newUrl }: { label: string, oldUrl?: string, newUrl?: string }) => {
    if (!oldUrl && !newUrl) return null;
    return (
        <div>
            <p className="font-medium text-sm mb-2">{label}</p>
            <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground mb-1">旧</p>
                    {oldUrl ? <Image src={oldUrl} alt="Old QR" width={80} height={80} className="rounded-md mx-auto" /> : <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">无</div>}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 text-center">
                    <p className="text-xs text-muted-foreground mb-1">新</p>
                     {newUrl ? <Image src={newUrl} alt="New QR" width={80} height={80} className="rounded-md mx-auto" /> : <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">无</div>}
                </div>
            </div>
        );
}

export default function PaymentRequestsPage() {
  const { user, profile, loading: userLoading } = useUser(); // Corrected hook
  const firestore = useFirestore();
  const { toast } = useToast();
  const isManager = ['admin', 'ghost', 'staff', 'support'].includes(profile?.role || '');

  const [rejectionTarget, setRejectionTarget] = useState<PaymentChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const q = useMemo(() => {
    if (!firestore || !isManager) return null;
    return query(collection(firestore, 'paymentChangeRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  }, [firestore, isManager]);

  const { data: reqs, loading: dataLoading } = useCollection<PaymentChangeRequest>(q);

  const handleAction = async (request: PaymentChangeRequest, newStatus: 'approved' | 'rejected') => {
    if (!firestore || !profile) return;
    
    setProcessingId(request.id);
    const { id, userId, requestedPaymentInfo } = request;

    try {
      if (newStatus === 'approved') {
        await updateDoc(doc(firestore, 'users', userId), { paymentInfo: requestedPaymentInfo });
      }
      
      await updateDoc(doc(firestore, 'paymentChangeRequests', id), { 
        status: newStatus,
        reviewedAt: serverTimestamp(),
        reviewerId: profile.uid,
        rejectionReason: newStatus === 'rejected' ? rejectionReason : ''
      });

      toast({ title: "审核完成", description: `请求已被 ${newStatus === 'approved' ? '批准' : '拒绝'}.` });

    } catch (e: any) { 
      toast({ variant: "destructive", title: "错误", description: e.message }); 
    } finally {
        setProcessingId(null);
        setRejectionTarget(null);
        setRejectionReason('');
    }
  };

  if (userLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto"/></div>;
  
  if (!isManager) return (
    <div className="p-20 text-center bg-card rounded-lg">
      <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold">权限不足: [{profile?.role || 'null'}]</h2>
      <p className="text-muted-foreground text-sm mt-2">只有管理员, Staff, Support 或 Ghost 角色可以访问此页面。</p>
      <p className="text-muted-foreground text-xs mt-1">UID: {user?.uid}</p>
    </div>
  );

  return (
    <div className="space-y-6">
        <AlertDialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认拒绝申请？</AlertDialogTitle>
                <AlertDialogDescription>
                请提供拒绝此支付信息修改申请的原因。该原因将通过系统通知发送给用户。
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2 py-4">
                <Label htmlFor="rejection-reason">拒绝理由</Label>
                <Textarea
                id="rejection-reason"
                placeholder="例如：支付宝收款码无法识别..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRejectionTarget(null)}>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => rejectionTarget && handleAction(rejectionTarget, 'rejected')} disabled={!rejectionReason.trim() || !!processingId}>
                {processingId === rejectionTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                确认拒绝
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>


        <h1 className="text-3xl font-headline">收款申请审核</h1>
        {dataLoading && <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto"/></div>}
        
        {reqs && reqs.length > 0 ? (
            reqs.map(r => (
            <Card key={r.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/30">
                    <div>
                        <p className="font-semibold">{r.userName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{r.userId}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {r.createdAt ? format(r.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : ''}
                    </p>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                         <h3 className="font-semibold flex items-center gap-2"><Banknote className="h-4 w-4" /> 银行账户</h3>
                         <InfoRow label="银行名称" value={r.requestedPaymentInfo?.bankAccount?.bankName} />
                         <InfoRow label="户名" value={r.requestedPaymentInfo?.bankAccount?.accountName} />
                         <InfoRow label="账号" value={r.requestedPaymentInfo?.bankAccount?.accountNumber} />
                    </div>
                     <div className="space-y-6">
                         <h3 className="font-semibold flex items-center gap-2"><QrCode className="h-4 w-4" /> 收款二维码</h3>
                         <QrCodeDiff label="支付宝" oldUrl={r.currentPaymentInfo?.alipayQrUrl} newUrl={r.requestedPaymentInfo?.alipayQrUrl} />
                         <QrCodeDiff label="微信支付" oldUrl={r.currentPaymentInfo?.wechatPayQrUrl} newUrl={r.requestedPaymentInfo?.wechatPayQrUrl} />
                         <QrCodeDiff label="PromptPay" oldUrl={r.currentPaymentInfo?.promptPayQrUrl} newUrl={r.requestedPaymentInfo?.promptPayQrUrl} />
                    </div>
                </CardContent>
                <div className="p-4 bg-muted/30 flex justify-end gap-2">
                    <Button variant="destructive" onClick={() => setRejectionTarget(r)} disabled={processingId === r.id}>
                        {processingId === r.id && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                        <XCircle size={16} className="mr-2"/> 拒绝
                    </Button>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(r, 'approved')} disabled={processingId === r.id}>
                        {processingId === r.id && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                        <CheckCircle2 size={16} className="mr-2"/> 批准
                    </Button>
                </div>
            </Card>
            ))
        ) : (
            !dataLoading && <p className="text-center text-muted-foreground py-10">暂无待处理项</p>
        )}
    </div>
  );
}
