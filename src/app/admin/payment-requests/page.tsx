// @ts-nocheck
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  where,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Banknote,
  QrCode,
  Building,
  Wallet,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import type { PaymentChangeRequest, PaymentInfo } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { createNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PAGE_SIZE = 50;

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string | null | undefined, isMono?: boolean }) => (
    <div className="flex justify-between items-center text-sm py-1">
        <p className="text-muted-foreground">{label}</p>
        {value ? (
            <p className={`font-semibold ${isMono ? 'font-mono' : ''} break-all text-right`}>{value}</p>
        ) : (
            <p className="text-sm text-muted-foreground/70">未提供</p>
        )}
    </div>
);

const QrCodeDisplay = ({ label, qrUrl }: { label: string, qrUrl: string | null | undefined }) => (
     <div className="flex justify-between items-center">
        <p className="font-medium">{label}</p>
        {qrUrl ? (
            <Dialog>
                <DialogTrigger asChild><Button variant="secondary" size="sm">查看二维码</Button></DialogTrigger>
                <DialogContent className="max-w-xs"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><div className="relative aspect-square w-full"><Image src={qrUrl} alt={`${label} QR Code`} fill className="object-contain rounded-md" /></div></DialogContent>
            </Dialog>
        ) : ( <p className="text-sm text-muted-foreground/70">未提供</p> )}
    </div>
);


export default function AdminPaymentRequestsPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [requests, setRequests] = useState<PaymentChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<any>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<PaymentChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');

  const fetchRequests = useCallback(async (loadMore = false) => {
    if (!firestore || !hasAccess) {
      setLoading(false);
      return;
    }

    if (loadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const constraints = [
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      ];

      if (loadMore && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }

      const q = query(collection(firestore, 'paymentChangeRequests'), ...constraints);

      const documentSnapshots = await getDocs(q);
      const newRequests = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentChangeRequest));

      setRequests(prev => loadMore ? [...prev, ...newRequests] : newRequests);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [firestore, hasAccess, lastVisible]);
  
  useEffect(() => {
    fetchRequests();
  }, [firestore, hasAccess]);


  const handleApprove = async (request: PaymentChangeRequest) => {
    if (!firestore || !profile) return;
    setProcessingId(request.id);
    try {
      const batch = writeBatch(firestore);
      const requestRef = doc(firestore, 'paymentChangeRequests', request.id);
      const userRef = doc(firestore, 'users', request.userId);

      batch.update(userRef, { paymentInfo: request.requestedPaymentInfo });
      batch.update(requestRef, { status: 'approved', reviewedAt: new Date(), reviewerId: profile.uid });

      await batch.commit();

      await createNotification(firestore, request.userId, { type: 'paymentRequestApproved', actor: profile, requestId: request.id });
      
      setRequests(prev => prev.filter(r => r.id !== request.id));
      toast({ title: '申请已批准' });
    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${request.userId} or paymentChangeRequests/${request.id}`,
            operation: 'update',
        }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!firestore || !rejectionTarget || !profile || !rejectionReason.trim()) return;
    setProcessingId(rejectionTarget.id);

    try {
        const requestRef = doc(firestore, "paymentChangeRequests", rejectionTarget.id);
        await updateDoc(requestRef, {
            status: 'rejected',
            rejectionReason: rejectionReason,
            reviewedAt: new Date(),
            reviewerId: profile.uid,
        });

        await createNotification(firestore, rejectionTarget.userId, {
            type: 'paymentRequestRejected',
            actor: profile,
            requestId: rejectionTarget.id,
            reason: rejectionReason,
        });

        setRequests(prev => prev.filter(r => r.id !== rejectionTarget.id));
        toast({ title: '申请已拒绝' });
        setRejectionTarget(null);
        setRejectionReason('');
    } catch (error: any) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `paymentChangeRequests/${rejectionTarget.id}`,
            operation: 'update',
        }));
    } finally {
        setProcessingId(null);
    }
  };

  const isLoading = authLoading || loading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if(error) {
    return (
         <div className="flex h-[60vh] items-center justify-center">
             <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="mt-4 text-lg font-semibold text-destructive">数据库查询失败</h2>
                <p className="mt-2 text-sm text-muted-foreground">无法加载收款申请。这很可能是因为缺少数据库索引。</p>
                <p className="mt-1 text-xs text-muted-foreground">请检查Firebase控制台以创建所需的复合索引。</p>
                <pre className="mt-4 p-4 text-xs bg-muted rounded-md text-left overflow-auto">{error.message}</pre>
             </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">收款方式变更申请</h1>
          <p className="text-sm text-muted-foreground">审核用户提交的收款信息修改，批准后将更新其收款能力。</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">当前权限: {profile?.role?.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            待处理申请 ({requests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请人</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead>详情</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.userName} <span className="font-mono text-xs text-muted-foreground">({req.userId.slice(0, 8)}...)</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.createdAt?.toDate ? formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="h-4 w-4"/></Button></DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>审核 {req.userName} 的申请</DialogTitle></DialogHeader>
                          <div className="divide-y divide-border -m-6">
                            <div className="p-6">
                                <h4 className="text-base font-semibold mb-3 flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> 银行账户</h4>
                                <div className="space-y-3">
                                    <InfoRow label="银行名称" value={req.requestedPaymentInfo.bankAccount?.bankName} />
                                    <InfoRow label="户名" value={req.requestedPaymentInfo.bankAccount?.accountName} />
                                    <InfoRow label="账号" value={req.requestedPaymentInfo.bankAccount?.accountNumber} isMono />
                                </div>
                            </div>
                            <div className="p-6">
                                <h4 className="text-base font-semibold mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> USDT (TRC20)</h4>
                                <InfoRow label="钱包地址" value={req.requestedPaymentInfo.usdtAddress} isMono />
                            </div>
                            <div className="p-6">
                                <h4 className="text-base font-semibold mb-4 flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> 收款二维码</h4>
                                <div className="space-y-4">
                                    <QrCodeDisplay label="支付宝" qrUrl={req.requestedPaymentInfo.alipayQrUrl} />
                                    <QrCodeDisplay label="微信支付" qrUrl={req.requestedPaymentInfo.wechatPayQrUrl} />
                                    <QrCodeDisplay label="PromptPay" qrUrl={req.requestedPaymentInfo.promptPayQrUrl} />
                                </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" variant="outline" className="text-destructive hover:bg-destructive/10"
                          onClick={() => setRejectionTarget(req)} disabled={!!processingId}
                        >
                          {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />} 拒绝
                        </Button>
                        <Button
                          size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(req)} disabled={!!processingId}
                        >
                          {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} 批准
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <AlertCircle className="mx-auto h-6 w-6 mb-2" />
                    暂无待处理的收款信息修改申请
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => fetchRequests(true)} disabled={loadingMore}>
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>确认拒绝申请</AlertDialogTitle>
                <AlertDialogDescription>请提供拒绝 “{rejectionTarget?.userName}” 申请的理由。该理由将通过通知发送给用户。</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2 py-4">
                <Label htmlFor="rejection-reason">拒绝理由</Label>
                <Textarea id="rejection-reason" placeholder="例如：银行账户信息不完整或不清晰。" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
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
