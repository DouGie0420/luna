'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from '@/lib/user';
import type { UserProfile, PaymentInfo, PaymentChangeRequest } from '@/lib/types';
import { Loader2, Banknote, QrCode, UploadCloud, X, Save, Wallet, AlertCircle, Edit, Info } from "lucide-react";
import Image from 'next/image';
import { compressImage } from '@/lib/image-compressor';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

const QrUploader = ({
    preview,
    onFileChange,
    onRemove,
    id,
    title,
    disabled
}: {
    preview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    id: string;
    title: string;
    disabled: boolean;
}) => {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id} className="font-semibold">{title}</Label>
            {preview ? (
                <div className="relative aspect-square w-48">
                    <Image src={preview} alt={`${title} QR Code Preview`} fill className="object-contain rounded-md border bg-muted/20 p-2" />
                     {!disabled && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                            onClick={onRemove}
                            disabled={disabled}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ) : (
                <label htmlFor={id} className="relative flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <div className="flex flex-col items-center justify-center text-center">
                        <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">点击上传收款码</p>
                    </div>
                    <input id={id} type="file" className="sr-only" onChange={onFileChange} accept="image/*" disabled={disabled} />
                </label>
            )}
        </div>
    );
};

const RequestChangeForm = ({ profile, onFormSubmit }: { profile: UserProfile, onFormSubmit: () => void }) => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [formData, setFormData] = useState<PaymentInfo>(profile.paymentInfo || {});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [parent, child] = name.split('.');
        if (child) {
            setFormData(prev => ({ ...prev, [parent]: { ...(prev as any)[parent], [child]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    }

    const handleQrCodeChange = async (e: React.ChangeEvent<HTMLInputElement>, type: keyof Pick<PaymentInfo, 'alipayQrUrl' | 'wechatPayQrUrl' | 'promptPayQrUrl'>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressedDataUrl = await compressImage(file);
            setFormData(prev => ({ ...prev, [type]: compressedDataUrl }));
        } catch (error) {
            console.error("QR Code compression error:", error);
            toast({ variant: 'destructive', title: 'Image Error', description: 'Could not process the image.' });
        }
    };
    
    const handleRemoveQr = (type: keyof Pick<PaymentInfo, 'alipayQrUrl' | 'wechatPayQrUrl' | 'promptPayQrUrl'>) => {
        setFormData(prev => ({ ...prev, [type]: undefined }));
    };

    const handleSubmit = async () => {
        if (!firestore || !profile) return;
        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'paymentChangeRequests'), {
                userId: profile.uid,
                userName: profile.displayName,
                status: 'pending',
                createdAt: serverTimestamp(),
                currentPaymentInfo: profile.paymentInfo || {},
                requestedPaymentInfo: formData,
            });
            toast({ title: "修改申请已提交", description: "管理员审核后将会通知您。" });
            onFormSubmit();
        } catch (error) {
            console.error("Failed to submit payment change request:", error);
            toast({ variant: 'destructive', title: "提交失败", description: "无法提交您的修改申请，请稍后再试。" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="grid gap-8 py-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Banknote /> 银行账户</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="accountName">账户名</Label>
                        <Input id="accountName" name="bankAccount.accountName" placeholder="例如：SOMCHAI K." value={formData.bankAccount?.accountName || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="accountNumber">银行账号</Label>
                        <Input id="accountNumber" name="bankAccount.accountNumber" placeholder="例如：123-4-56789-0" value={formData.bankAccount?.accountNumber || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="bankName">银行名称</Label>
                        <Input id="bankName" name="bankAccount.bankName" placeholder="例如：Kasikorn Bank" value={formData.bankAccount?.bankName || ''} onChange={handleInputChange} />
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><QrCode /> 收款二维码</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-8">
                    <QrUploader id="alipay-qr" title="支付宝收款码" preview={formData.alipayQrUrl || null} onFileChange={(e) => handleQrCodeChange(e, 'alipayQrUrl')} onRemove={() => handleRemoveQr('alipayQrUrl')} disabled={isSubmitting} />
                    <QrUploader id="wechatpay-qr" title="微信支付收款码" preview={formData.wechatPayQrUrl || null} onFileChange={(e) => handleQrCodeChange(e, 'wechatPayQrUrl')} onRemove={() => handleRemoveQr('wechatPayQrUrl')} disabled={isSubmitting} />
                    <QrUploader id="promptpay-qr" title="PromptPay收款码" preview={formData.promptPayQrUrl || null} onFileChange={(e) => handleQrCodeChange(e, 'promptPayQrUrl')} onRemove={() => handleRemoveQr('promptPayQrUrl')} disabled={isSubmitting} />
                </CardContent>
            </Card>
            <DialogFooter>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    提交修改申请
                </Button>
            </DialogFooter>
        </div>
    );
};


export default function WalletPage() {
    const { t } = useTranslation();
    const { user, profile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const [isRequestingChange, setIsRequestingChange] = useState(false);
    
    const pendingRequestQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'paymentChangeRequests'),
            where('userId', '==', user.uid),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
    }, [firestore, user]);

    const { data: pendingRequests, loading: requestsLoading } = useCollection<PaymentChangeRequest>(pendingRequestQuery);
    const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
    const pendingRequest = hasPendingRequest ? pendingRequests![0] : null;

    if (userLoading || requestsLoading) {
        return (
             <div className="p-6 md:p-8 lg:p-12 space-y-8">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!user || !profile) {
        return <p>请先登录</p>
    }

    return (
        <div className="p-6 md:p-8 lg:p-12">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline">收款方式管理</h1>
                <Dialog open={isRequestingChange} onOpenChange={setIsRequestingChange}>
                    <DialogTrigger asChild>
                        <Button disabled={hasPendingRequest}>
                            <Edit className="mr-2 h-4 w-4" />
                            {hasPendingRequest ? "审核中" : "申请修改"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>申请修改收款信息</DialogTitle>
                            <DialogDescription>提交您的新收款信息以供管理员审核。审核通过前，旧信息将继续生效。</DialogDescription>
                        </DialogHeader>
                        <RequestChangeForm profile={profile} onFormSubmit={() => setIsRequestingChange(false)} />
                    </DialogContent>
                </Dialog>
            </div>
            
             {hasPendingRequest && (
                <Alert className="mb-8 border-yellow-400/50 text-yellow-300 [&>svg]:text-yellow-300">
                    <Info className="h-4 w-4" />
                    <AlertTitle>您有待审核的修改申请</AlertTitle>
                    <AlertDescription>
                        您于 {pendingRequest.createdAt?.toDate ? formatDistanceToNow(pendingRequest.createdAt.toDate(), { addSuffix: true }) : ''} 提交的收款信息修改申请正在等待管理员审核。
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Banknote /> 银行账户</CardTitle>
                        <CardDescription>用于接收泰铢（THB）或人民币（RMB）转账。</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="accountName">账户名</Label>
                            <Input id="accountName" value={profile.paymentInfo?.bankAccount?.accountName || ''} readOnly />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="accountNumber">银行账号</Label>
                            <Input id="accountNumber" value={profile.paymentInfo?.bankAccount?.accountNumber || ''} readOnly />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="bankName">银行名称</Label>
                            <Input id="bankName" value={profile.paymentInfo?.bankAccount?.bankName || ''} readOnly />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22.5c-6.25 0-8.25-1.5-8.25-7.5s2-7.5 8.25-7.5c6.25 0 8.25 1.5 8.25 7.5S18.25 22.5 12 22.5Z"/><path d="M14.47 12.35v-1.1L12 10.5l-2.47.75v1.1c0 .41.53.65.88.47l1.12-.57c.19-.1.41-.1.6 0l1.12.57c.35.18.88-.06.88-.47Z"/><path d="M12 7.5v3"/></svg>
                            USDT 提现地址
                        </CardTitle>
                        <CardDescription>用于接收USDT（TRC20网络）数字货币。</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="grid gap-2">
                            <Label htmlFor="usdtAddress">USDT 地址 (TRC20)</Label>
                            <div className="relative">
                                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="usdtAddress" 
                                    value={profile.walletAddress || ''} 
                                    readOnly
                                    className="pl-10"
                                />
                            </div>
                            {profile.isWeb3Verified && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    此地址已与您绑定的Metamask钱包关联。如需更改，请在右上角用户菜单中重新绑定新钱包。
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><QrCode /> 收款二维码</CardTitle>
                        <CardDescription>您的支付宝、微信和PromptPay收款码。</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-8">
                        <QrUploader id="alipay-qr" title="支付宝收款码" preview={profile.paymentInfo?.alipayQrUrl || null} onFileChange={()=>{}} onRemove={()=>{}} disabled={true} />
                        <QrUploader id="wechatpay-qr" title="微信支付收款码" preview={profile.paymentInfo?.wechatPayQrUrl || null} onFileChange={()=>{}} onRemove={()=>{}} disabled={true} />
                        <QrUploader id="promptpay-qr" title="PromptPay收款码" preview={profile.paymentInfo?.promptPayQrUrl || null} onFileChange={()=>{}} onRemove={()=>{}} disabled={true} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
