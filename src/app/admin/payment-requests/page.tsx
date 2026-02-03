'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, User, ShieldAlert, FileText, Building } from "lucide-react";
import { createNotification } from '@/lib/notifications';
import type { PaymentChangeRequest, PaymentInfo } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string | null | undefined, isMono?: boolean }) => (
    <div className="flex justify-between items-center text-sm">
        <p className="text-muted-foreground">{label}</p>
        {value ? (
            <p className={`font-semibold ${isMono ? 'font-mono' : ''} break-all text-right`}>{value}</p>
        ) : (
            <p className="text-sm text-muted-foreground/70">未提供</p>
        )}
    </div>
);

const QrCodeDisplay = ({ label, qrUrl, className }: { label: string, qrUrl: string | null | undefined, className?: string }) => (
     <div className={className}>
        <p className="text-center font-medium text-xs mb-1">{label}</p>
        {qrUrl ? (
            <div className="relative aspect-square w-full bg-muted/20 rounded-md">
                <Image src={qrUrl} alt={`${label} QR Code`} fill className="object-contain" />
            </div>
        ) : (
             <div className="aspect-square w-full bg-muted/20 rounded-md flex items-center justify-center">
                <p className="text-xs text-muted-foreground/70">未提供</p>
            </div>
        )}
    </div>
);

const PaymentInfoDisplay = ({ title, info }: { title: string, info: PaymentInfo }) => (
    <Card className='bg-background/30'>
        <CardHeader className='p-3 border-b'>
            <h4 className="text-sm font-semibold">{title}</h4>
        </CardHeader>
        <CardContent className='p-3 space-y-4'>
            <div className="space-y-2">
                <h5 className="text-xs font-bold flex items-center gap-2"><Building className="h-3 w-3" /> 银行账户</h5>
                <InfoRow label="银行" value={info.bankAccount?.bankName} />
                <InfoRow label="户名" value={info.bankAccount?.accountName} />
                <InfoRow label="账号" value={info.bankAccount?.accountNumber} isMono />
            </div>
             <div className="grid grid-cols-3 gap-2">
                <QrCodeDisplay label="支付宝" qrUrl={info.alipayQrUrl} />
                <QrCodeDisplay label="微信支付" qrUrl={info.wechatPayQrUrl} />
                <QrCodeDisplay label="PromptPay" qrUrl={info.promptPayQrUrl} />
            </div>
        </CardContent>
    </Card>
);

export default function PaymentRequestsPage() {
  const firestore = useFirestore();
  const { profile, loading: authLoading } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<PaymentChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const MANAGER_ROLES = ['admin', 'ghost', 'staff'];
  const currentRole = profile?.role;
  const isManager = currentRole && MANAGER_ROLES.includes(currentRole);

  const q = useMemo(() => {
    if (!firestore || !isManager) return null;
    return query(collection(firestore, 'paymentChangeRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  }, [firestore, isManager]);

  const { data: requests, loading: dLoading } = useCollection<PaymentChangeRequest>(q);

  const handleApprove = async (request: PaymentChangeRequest) => {
    if (!firestore || !profile) return;
    setProcessingId(request.id);
    try {
      // 1. Update the user's main profile with the new payment info
      await updateDoc(doc(firestore, 'users', request.userId), { paymentInfo: request.requestedPaymentInfo });

      // 2. Update the request status
      await updateDoc(doc(firestore, 'paymentChangeRequests', request.id), { 
        status: 'approved', 
        processedAt: serverTimestamp(),
        reviewerId: profile.uid,
        reviewerName: profile.displayName
      });
      
      // 3. Send notification
      await createNotification(firestore, request.userId, {
        type: 'paymentRequestApproved',
        actor: profile,
        requestId: request.id,
      });

      toast({ title: "申请已批准" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "批准失败", description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionTarget || !rejectionReason.trim() || !firestore || !profile) return;

    setProcessingId(rejectionTarget.id);
    try {
      await updateDoc(doc(firestore, 'paymentChangeRequests', rejectionTarget.id), { 
        status: 'rejected', 
        rejectionReason: rejectionReason,
        processedAt: serverTimestamp(),
        reviewerId: profile.uid,
        reviewerName: profile.displayName
      });

      await createNotification(firestore, rejectionTarget.userId, {
        type: 'paymentRequestRejected',
        actor: profile,
        requestId: rejectionTarget.id,
        reason: rejectionReason,
      });
      
      toast({ title: "申请已拒绝" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "操作失败", description: err.message });
    } finally {
      setProcessingId(null);
      setRejectionTarget(null);
      setRejectionReason('');
    }
  };

  if (authLoading || (isManager && dLoading)) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  
  if (!isManager) return (
    <div>
      <h2 className="text-3xl font-headline mb-6">{t('admin.paymentRequestsPage.title')}</h2>
      <div className="p-20 text-center border-2 border-dashed rounded-lg">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">权限不足</h2>
        <p className="text-muted-foreground mt-2">检测到您的角色为: [{currentRole || 'null'}]。此页面仅限管理员访问。</p>
      </div>
    </div>
  );

  return (
    <div>
        <h1 className="text-3xl font-headline mb-6">{t('admin.paymentRequestsPage.title')}</h1>
        <div className="grid gap-6">
            {requests && requests.length > 0 ? requests.map((req: PaymentChangeRequest) => (
            <Card key={req.id} className="bg-card/50">
                <CardHeader className="p-4 border-b flex-row justify-between items-center space-y-0">
                    <div className="text-sm flex items-center gap-3">
                        <User size={16}/> 
                        <div>
                            <span className='font-semibold'>{req.userName}</span>
                            <p className='font-mono text-xs text-muted-foreground'>{req.userId}</p>
                        </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{req.createdAt?.toDate?.().toLocaleString()}</div>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <PaymentInfoDisplay title="当前信息" info={req.currentPaymentInfo || {}} />
                    <PaymentInfoDisplay title="申请变更为" info={req.requestedPaymentInfo} />
                </CardContent>
                <div className="p-4 border-t flex justify-end gap-2">
                    <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setRejectionTarget(req)}
                        disabled={processingId === req.id}
                    >
                        {processingId === req.id ? <Loader2 className='h-4 w-4 animate-spin' /> : <XCircle size={16}/>}
                        拒绝
                    </Button>
                     <Button 
                        size="sm" 
                        onClick={() => handleApprove(req)}
                        disabled={processingId === req.id}
                    >
                        {processingId === req.id ? <Loader2 className='h-4 w-4 animate-spin' /> : <CheckCircle2 size={16}/>}
                        批准
                    </Button>
                </div>
            </Card>
            )) : (
              <div className="text-center py-20 border-2 border-dashed rounded-lg">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">暂无待处理的收款信息修改申请</p>
            </div>
            )}
        </div>

        <AlertDialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认拒绝该申请？</AlertDialogTitle>
                <AlertDialogDescription>
                请提供拒绝的理由，用户将会收到通知。
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
                <AlertDialogAction onClick={handleReject} disabled={!rejectionReason.trim() || !!processingId}>
                {processingId === rejectionTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                确认拒绝
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
