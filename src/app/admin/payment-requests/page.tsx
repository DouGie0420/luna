
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import type { PaymentChangeRequest, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { createNotification } from '@/lib/notifications';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function PaymentInfoDisplay({ title, info }: { title: string, info: UserProfile['paymentInfo'] }) {
    if (!info || Object.keys(info).length === 0) {
        return (
            <div>
                <h4 className="font-semibold mb-2">{title}</h4>
                <p className="text-sm text-muted-foreground">无信息</p>
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <h4 className="font-semibold">{title}</h4>
            {info.bankAccount?.accountNumber && (
                <div>
                    <p className="text-xs text-muted-foreground">银行账户</p>
                    <p className="text-sm">{info.bankAccount.bankName}: {info.bankAccount.accountNumber} ({info.bankAccount.accountName})</p>
                </div>
            )}
            {info.alipayQrUrl && (
                <div>
                    <p className="text-xs text-muted-foreground">支付宝</p>
                    <Image src={info.alipayQrUrl} alt="Alipay QR" width={100} height={100} className="rounded-md" />
                </div>
            )}
            {info.wechatPayQrUrl && (
                <div>
                    <p className="text-xs text-muted-foreground">微信支付</p>
                    <Image src={info.wechatPayQrUrl} alt="WeChat Pay QR" width={100} height={100} className="rounded-md" />
                </div>
            )}
            {info.promptPayQrUrl && (
                <div>
                    <p className="text-xs text-muted-foreground">PromptPay</p>
                    <Image src={info.promptPayQrUrl} alt="PromptPay QR" width={100} height={100} className="rounded-md" />
                </div>
            )}
        </div>
    )
}


export default function PaymentRequestsPage() {
    const { user: adminUser, profile: adminProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const requestsQuery = useMemo(() => 
        firestore ? query(collection(firestore, 'paymentChangeRequests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')) : null
    , [firestore]);

    const { data: requests, loading } = useCollection<PaymentChangeRequest>(requestsQuery);

    const [selectedRequest, setSelectedRequest] = useState<PaymentChangeRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!firestore || !selectedRequest || !adminProfile) return;
        
        if (action === 'reject' && !rejectionReason) {
            toast({ variant: 'destructive', title: '请输入拒绝理由' });
            return;
        }

        setIsProcessing(true);

        const requestRef = doc(firestore, 'paymentChangeRequests', selectedRequest.id);
        const userRef = doc(firestore, 'users', selectedRequest.userId);

        const batch = writeBatch(firestore);

        if (action === 'approve') {
            batch.update(userRef, { paymentInfo: selectedRequest.requestedPaymentInfo });
            batch.update(requestRef, { status: 'approved', reviewedAt: new Date(), reviewerId: adminUser?.uid });
        } else {
            batch.update(requestRef, { status: 'rejected', rejectionReason, reviewedAt: new Date(), reviewerId: adminUser?.uid });
        }

        try {
            await batch.commit();
            toast({ title: `申请已${action === 'approve' ? '批准' : '拒绝'}` });

            // Send notification
            if (action === 'approve') {
                await createNotification(firestore, selectedRequest.userId, { type: 'paymentRequestApproved', actor: adminProfile, requestId: selectedRequest.id });
            } else {
                await createNotification(firestore, selectedRequest.userId, { type: 'paymentRequestRejected', actor: adminProfile, requestId: selectedRequest.id, reason: rejectionReason });
            }
            
            setSelectedRequest(null);
            setRejectionReason('');
        } catch (error) {
            console.error("Error processing payment request:", error);
            toast({ variant: 'destructive', title: '操作失败', description: '更新文档时出错' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">收款方式变更申请</h2>
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>用户</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests && requests.length > 0 ? (
                        requests.map(req => (
                            <TableRow key={req.id}>
                                <TableCell className="font-medium flex items-center gap-3">
                                    {req.userName}
                                    <span className='text-xs text-muted-foreground font-mono'>{req.userId}</span>
                                </TableCell>
                                <TableCell>
                                    {req.createdAt?.toDate ? formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                                        <Eye className="mr-2 h-4 w-4" /> 查看
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                没有待处理的申请。
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

             <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>审核收款信息变更</DialogTitle>
                        <DialogDescription>
                            用户: {selectedRequest?.userName} ({selectedRequest?.userId.slice(0, 8)}...)
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6 mt-4 max-h-[60vh] overflow-y-auto p-1">
                       <PaymentInfoDisplay title="当前信息" info={selectedRequest?.currentPaymentInfo} />
                       <PaymentInfoDisplay title="申请的新信息" info={selectedRequest?.requestedPaymentInfo} />
                    </div>
                     <div className="grid gap-2 mt-4">
                        <Label htmlFor="rejection-reason">拒绝理由 (如果拒绝请填写)</Label>
                        <Textarea id="rejection-reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button variant="destructive" onClick={() => handleAction('reject')} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            拒绝
                        </Button>
                        <Button onClick={() => handleAction('approve')} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            批准
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
