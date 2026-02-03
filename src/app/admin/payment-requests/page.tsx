'use client';
import React, { useMemo, useState } from 'react';
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, query, where, orderBy, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import type { PaymentChangeRequest } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, ShieldAlert, Clock, Building, QrCode } from "lucide-react";
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createNotification } from '@/lib/notifications';
import { useTranslation } from '@/hooks/use-translation';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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

const QrCodeDisplay = ({ label, qrUrl, onOpen }: { label: string, qrUrl: string | null | undefined, onOpen: () => void }) => (
     <div className="flex justify-between items-center">
        <p className="font-medium">{label}</p>
        {qrUrl ? (
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm" onClick={onOpen}>查看二维码</Button>
            </DialogTrigger>
        ) : (
             <p className="text-sm text-muted-foreground/70">未提供</p>
        )}
    </div>
);


export default function PaymentRequestsPage() {
  const { user: adminUser, profile: adminProfile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<PaymentChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [qrToView, setQrToView] = useState<{label: string, url: string} | null>(null);

  const isManager = ['admin', 'ghost', 'staff', 'support'].includes(adminProfile?.role || '');

  const q = useMemo(() => {
    if (!firestore || !isManager) return null;
    return query(
      collection(firestore, 'paymentChangeRequests'), 
      where('status', '==', 'pending'), 
      orderBy('createdAt', 'desc')
    );
  }, [firestore, isManager]);

  const { data: requests, loading: dataLoading } = useCollection<PaymentChangeRequest>(q);

  const handleAction = async (req: PaymentChangeRequest, action: 'approved' | 'rejected') => {
    if (!firestore || !adminProfile) return;
    setProcessingId(req.id);
    
    try {
      if (action === 'approved') {
        await updateDoc(doc(firestore, 'users', req.userId), { 
          paymentInfo: req.requestedPaymentInfo,
          updatedAt: serverTimestamp() 
        });
        await createNotification(firestore, req.userId, { type: 'paymentRequestApproved', actor: adminProfile, requestId: req.id });
      } else {
        await createNotification(firestore, req.userId, { type: 'paymentRequestRejected', actor: adminProfile, requestId: req.id, reason: rejectionReason });
      }
      
      await updateDoc(doc(firestore, 'paymentChangeRequests', req.id), { 
        status: action, 
        reviewerId: adminUser?.uid,
        reviewedAt: serverTimestamp(),
        ...(action === 'rejected' && { rejectionReason: rejectionReason })
      });
      
      toast({ title: "操作成功", description: `申请 #${req.id.slice(0,6)}... 已被 ${action === 'approved' ? '批准' : '拒绝'}.` });
      if(rejectionTarget) setRejectionTarget(null);
      setRejectionReason('');

    } catch (err: any) {
      toast({ variant: "destructive", title: "操作失败", description: err.message });
    } finally {
        setProcessingId(null);
    }
  };

  if (authLoading || dataLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  if (!isManager) {
    return (
      <div className="p-20 text-center bg-zinc-950 text-white flex flex-col items-center border border-zinc-800 rounded-lg">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">权限不足</h2>
        <p className="text-zinc-500 mt-2 font-mono text-sm">当前角色: [{adminProfile?.role || 'null'}]</p>
      </div>
    );
  }

  return (
    <Dialog onOpenChange={(open) => !open && setQrToView(null)}>
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 italic">Payment Requests <span className="text-sm font-normal text-zinc-500">收款申请审核</span></h1>
            {requests && requests.length > 0 ? (
                <div className="space-y-6">
                    {requests.map(req => (
                    <Card key={req.id} className="overflow-hidden">
                        <CardHeader className="p-4 bg-muted/30 flex flex-row justify-between items-center text-sm border-b">
                            <div className="font-mono text-xs">
                                <p>USER: {req.userName} ({req.userId})</p>
                                <p>REQ ID: {req.id}</p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock size={14}/> 
                                <span>{req.createdAt?.toDate?.().toLocaleString() || '刚刚'}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                {/* Current Info */}
                                <div className="p-6 border-r">
                                    <CardTitle className="text-base mb-4">当前收款信息</CardTitle>
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> 银行账户</h4>
                                            <div className="space-y-3 pl-6 text-xs">
                                                <InfoRow label="银行名称" value={req.currentPaymentInfo?.bankAccount?.bankName} />
                                                <InfoRow label="户名" value={req.currentPaymentInfo?.bankAccount?.accountName} />
                                                <InfoRow label="账号" value={req.currentPaymentInfo?.bankAccount?.accountNumber} isMono />
                                            </div>
                                        </div>
                                         <div>
                                            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> 收款二维码</h4>
                                            <div className="space-y-4 pl-6 text-xs">
                                                <QrCodeDisplay label="支付宝" qrUrl={req.currentPaymentInfo?.alipayQrUrl} onOpen={() => setQrToView({label: '旧支付宝二维码', url: req.currentPaymentInfo!.alipayQrUrl!})} />
                                                <QrCodeDisplay label="微信支付" qrUrl={req.currentPaymentInfo?.wechatPayQrUrl} onOpen={() => setQrToView({label: '旧微信支付二维码', url: req.currentPaymentInfo!.wechatPayQrUrl!})} />
                                                <QrCodeDisplay label="PromptPay" qrUrl={req.currentPaymentInfo?.promptPayQrUrl} onOpen={() => setQrToView({label: '旧PromptPay二维码', url: req.currentPaymentInfo!.promptPayQrUrl!})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* New Info */}
                                <div className="p-6 bg-secondary/20">
                                    <CardTitle className="text-base mb-4 text-green-400">申请变更为</CardTitle>
                                     <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> 银行账户</h4>
                                            <div className="space-y-3 pl-6 text-xs">
                                                <InfoRow label="银行名称" value={req.requestedPaymentInfo?.bankAccount?.bankName} />
                                                <InfoRow label="户名" value={req.requestedPaymentInfo?.bankAccount?.accountName} />
                                                <InfoRow label="账号" value={req.requestedPaymentInfo?.bankAccount?.accountNumber} isMono />
                                            </div>
                                        </div>
                                         <div>
                                            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> 收款二维码</h4>
                                            <div className="space-y-4 pl-6 text-xs">
                                                <QrCodeDisplay label="支付宝" qrUrl={req.requestedPaymentInfo?.alipayQrUrl} onOpen={() => setQrToView({label: '新支付宝二维码', url: req.requestedPaymentInfo!.alipayQrUrl!})} />
                                                <QrCodeDisplay label="微信支付" qrUrl={req.requestedPaymentInfo?.wechatPayQrUrl} onOpen={() => setQrToView({label: '新微信支付二维码', url: req.requestedPaymentInfo!.wechatPayQrUrl!})} />
                                                <QrCodeDisplay label="PromptPay" qrUrl={req.requestedPaymentInfo?.promptPayQrUrl} onOpen={() => setQrToView({label: '新PromptPay二维码', url: req.requestedPaymentInfo!.promptPayQrUrl!})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                         <div className="p-4 bg-muted/20 border-t flex justify-end gap-2">
                            <Button size="sm" variant="destructive" onClick={() => setRejectionTarget(req)} disabled={processingId === req.id}>
                                <XCircle size={16} className="mr-2"/> 拒绝
                            </Button>
                             <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(req, 'approved')} disabled={processingId === req.id}>
                                {processingId === req.id ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle2 size={16} className="mr-2"/>}
                                批准
                            </Button>
                        </div>
                    </Card>
                    ))}
                </div>
            ) : (
            <div className="text-center py-20 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">所有收款申请已处理完毕</p>
            </div>
            )}
        </div>

         <Dialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>确认拒绝申请？</DialogTitle>
                    <CardDescription>
                       请填写拒绝原因，将通过系统通知告知用户。
                    </CardDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                    <Label htmlFor="rejection-reason" className="sr-only">拒绝原因</Label>
                    <Textarea
                    id="rejection-reason"
                    placeholder="例如：您上传的支付宝二维码无法识别，请重新上传。"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectionTarget(null)}>取消</Button>
                    <Button
                        variant="destructive"
                        onClick={() => rejectionTarget && handleAction(rejectionTarget, 'rejected')}
                        disabled={!rejectionReason.trim() || processingId === rejectionTarget?.id}
                    >
                        {processingId === rejectionTarget?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        确认拒绝
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <DialogContent className="max-w-xs">
            <DialogHeader>
                <DialogTitle>{qrToView?.label}</DialogTitle>
            </DialogHeader>
            <div className="relative aspect-square w-full">
                {qrToView && <Image src={qrToView.url} alt={qrToView.label} fill className="object-contain rounded-md" />}
            </div>
        </DialogContent>
    </Dialog>
  );
}
