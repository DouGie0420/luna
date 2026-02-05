
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { ethers } from 'ethers';
import type { PaymentChangeRequest, PaymentInfo } from '@/lib/types';
import { compressImage } from '@/lib/image-compressor';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, QrCode, PlusCircle, AlertCircle, Edit, Banknote, Building, UploadCloud, X, Gem } from "lucide-react";
import Image from 'next/image';
import { updateUserProfile } from '@/lib/user';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string | null | undefined, isMono?: boolean }) => (
    <div className="flex justify-between items-center text-sm">
        <p className="text-muted-foreground">{label}</p>
        {value ? (
            <p className={`font-semibold ${isMono ? 'font-mono' : ''} break-all text-right`}>{value}</p>
        ) : (
            <p className="text-sm text-muted-foreground/70">未设置</p>
        )}
    </div>
);

const QrCodeDisplay = ({ label, qrUrl }: { label: string, qrUrl: string | null | undefined }) => (
     <div className="flex justify-between items-center">
        <p className="font-medium">{label}</p>
        {qrUrl ? (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">查看二维码</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle>{label}</DialogTitle>
                    </DialogHeader>
                    <div className="relative aspect-square w-full">
                        <Image src={qrUrl} alt={`${label} QR Code`} fill className="object-contain rounded-md" />
                    </div>
                </DialogContent>
            </Dialog>
        ) : (
             <p className="text-sm text-muted-foreground/70">未设置</p>
        )}
    </div>
);

const FileUploader = ({
  preview,
  onFileChange,
  onRemove,
  id,
  title,
  description,
  disabled,
}: {
  preview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  id: string;
  title: string;
  description: string;
  disabled: boolean;
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-center font-semibold">
        {title}
      </Label>
      {preview ? (
        <div className="relative aspect-square w-32 mx-auto">
          <Image src={preview} alt="Preview" fill className="object-contain rounded-md border bg-muted/20" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={onRemove}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <input
            id={id}
            type="file"
            className="sr-only"
            onChange={onFileChange}
            accept="image/*"
            disabled={disabled}
          />
        </label>
      )}
    </div>
  );
};


export default function WalletPage() {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // --- Web3 State ---
    const [isConnecting, setIsConnecting] = useState(false);
    
    // --- Change Request State ---
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [newPaymentInfo, setNewPaymentInfo] = useState<PaymentInfo>({});

    const [alipayQrPreview, setAlipayQrPreview] = useState<string | null>(null);
    const [wechatPayQrPreview, setWechatPayQrPreview] = useState<string | null>(null);
    const [promptPayQrPreview, setPromptPayQrPreview] = useState<string | null>(null);
    
    const pendingRequestQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'paymentChangeRequests'), 
            where('userId', '==', user.uid),
            where('status', '==', 'pending')
        );
    }, [firestore, user]);
    
    const { data: pendingRequests } = useCollection<PaymentChangeRequest>(pendingRequestQuery);
    const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
    const hasExistingPaymentInfo = profile?.paymentInfo && Object.values(profile.paymentInfo).some(v => v);

    const resetRequestForm = () => {
        setNewPaymentInfo({});
        setAlipayQrPreview(null);
        setWechatPayQrPreview(null);
        setPromptPayQrPreview(null);
    }

    // --- Web3 Logic ---
    const connectWeb3 = async () => {
        if (!firestore || !user) return;
        if (typeof window === 'undefined' || !(window as any).ethereum) {
            toast({ variant: "destructive", title: "未检测到插件", description: "请安装 MetaMask" });
            return;
        }
        setIsConnecting(true);
        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const walletAddress = accounts[0];
            
            await updateUserProfile(firestore, user.uid, { walletAddress, isWeb3Verified: true });
            
            toast({ title: "Web3 钱包已链接", description: `地址已成功绑定。` });
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: '钱包链接失败', description: error.message });
        } finally {
            setIsConnecting(false);
        }
    };
    
    const handleNewInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('bankAccount.')) {
            const field = name.split('.')[1];
            setNewPaymentInfo(prev => ({
                ...prev,
                bankAccount: {
                    ...prev.bankAccount,
                    [field]: value
                }
            }));
        } else {
             setNewPaymentInfo(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'alipay' | 'wechat' | 'promptpay') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSubmittingRequest(true); // show loader
        try {
            const compressedDataUrl = await compressImage(file);
            switch(type) {
                case 'alipay':
                    setAlipayQrPreview(compressedDataUrl);
                    setNewPaymentInfo(prev => ({ ...prev, alipayQrUrl: compressedDataUrl }));
                    break;
                case 'wechat':
                    setWechatPayQrPreview(compressedDataUrl);
                    setNewPaymentInfo(prev => ({ ...prev, wechatPayQrUrl: compressedDataUrl }));
                    break;
                case 'promptpay':
                    setPromptPayQrPreview(compressedDataUrl);
                    setNewPaymentInfo(prev => ({ ...prev, promptPayQrUrl: compressedDataUrl }));
                    break;
            }
        } catch (error) {
            console.error('Image compression error:', error);
            toast({
                variant: 'destructive',
                title: 'Image Error',
                description: 'Failed to process image. Please try another file.',
            });
        } finally {
            setIsSubmittingRequest(false); // hide loader
        }
    };

    const handleRemoveImage = (type: 'alipay' | 'wechat' | 'promptpay') => {
        switch(type) {
            case 'alipay':
                setAlipayQrPreview(null);
                setNewPaymentInfo(prev => ({ ...prev, alipayQrUrl: undefined }));
                break;
            case 'wechat':
                setWechatPayQrPreview(null);
                setNewPaymentInfo(prev => ({ ...prev, wechatPayQrUrl: undefined }));
                break;
            case 'promptpay':
                setPromptPayQrPreview(null);
                setNewPaymentInfo(prev => ({ ...prev, promptPayQrUrl: undefined }));
                break;
        }
    }

    const handleSubmitRequest = async () => {
        if (!user || !profile || !firestore) return;
        
        const isInfoEmpty = !newPaymentInfo.bankAccount?.accountNumber &&
                            !newPaymentInfo.usdtAddress &&
                            !newPaymentInfo.alipayQrUrl &&
                            !newPaymentInfo.wechatPayQrUrl &&
                            !newPaymentInfo.promptPayQrUrl;

        if (isInfoEmpty) {
            toast({ variant: 'destructive', title: '信息不完整', description: '请至少填写一项收款信息。' });
            return;
        }
        
        setIsSubmittingRequest(true);
        const requestData = {
            userId: user.uid,
            userName: profile.displayName || '匿名用户',
            status: 'pending' as const,
            createdAt: serverTimestamp(),
            requestedPaymentInfo: newPaymentInfo,
            currentPaymentInfo: profile.paymentInfo || {}
        };
        try {
            await addDoc(collection(firestore, 'paymentChangeRequests'), requestData);
            toast({ title: '修改申请已提交', description: '管理员审核通过后将会生效。' });
            setIsRequestDialogOpen(false);
            resetRequestForm();
        } catch (error) {
            console.error("Error submitting request:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: collection(firestore, 'paymentChangeRequests').path,
                operation: 'create',
                requestResourceData: requestData
            }));
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    return (
        <div className="container max-w-4xl py-10">
            <Dialog open={isRequestDialogOpen} onOpenChange={(isOpen) => {
                setIsRequestDialogOpen(isOpen);
                if (!isOpen) {
                    resetRequestForm();
                }
            }}>
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">支付与钱包管理</h1>
                    <DialogTrigger asChild>
                        <Button disabled={hasPendingRequest} className="gap-2">
                            {hasPendingRequest ? <AlertCircle className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                            {hasPendingRequest ? '审核中...' : '申请修改收款信息'}
                        </Button>
                    </DialogTrigger>
                </div>

                {hasPendingRequest && (
                    <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
                        <CardHeader className="flex-row items-center gap-4">
                             <AlertCircle className="h-6 w-6 text-yellow-400"/>
                             <div>
                                <CardTitle className="text-yellow-300">存在待审核的申请</CardTitle>
                                <CardDescription className="text-yellow-400/80">
                                    您最近提交的收款信息修改申请正在等待管理员审核。
                                </CardDescription>
                             </div>
                        </CardHeader>
                    </Card>
                )}

                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gem className="h-5 w-5 text-primary" /> 月壤余额 (Lunar Soil)
                            </CardTitle>
                            <CardDescription>您的平台忠诚度积分，可用于平台内的多种活动。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold">
                                {(profile?.lunarSoil || 0).toLocaleString()} <span className="text-xl text-muted-foreground">克</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="h-5 w-5" /> Web3 身份
                            </CardTitle>
                            <CardDescription>连接你的以太坊兼容钱包，用于接收加密货币。</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-secondary/30 rounded-lg border flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold">USDT收款地址 (TRC20)</p>
                                    <p className="font-mono text-sm opacity-70 break-all">{profile?.walletAddress || '未连接'}</p>
                                </div>
                                {!profile?.isWeb3Verified && (
                                    <Button variant="outline" onClick={connectWeb3} disabled={isConnecting}>
                                        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                        {profile?.walletAddress ? "更换钱包" : "连接钱包"}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Banknote className="h-5 w-5" /> 法币收款方式
                            </CardTitle>
                            <CardDescription>这是您当前设置的收款信息，买家将通过这些方式向您付款。</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {hasExistingPaymentInfo ? (
                                 <div className="divide-y divide-border -m-6">
                                    <div className="p-6">
                                        <h4 className="text-base font-semibold mb-3 flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> 银行账户</h4>
                                        <div className="space-y-3">
                                            <InfoRow label="银行名称" value={profile?.paymentInfo?.bankAccount?.bankName} />
                                            <InfoRow label="户名" value={profile?.paymentInfo?.bankAccount?.accountName} />
                                            <InfoRow label="账号" value={profile?.paymentInfo?.bankAccount?.accountNumber} isMono />
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="text-base font-semibold mb-4 flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> 收款二维码</h4>
                                        <div className="space-y-4">
                                            <QrCodeDisplay label="支付宝" qrUrl={profile?.paymentInfo?.alipayQrUrl} />
                                            <QrCodeDisplay label="微信支付" qrUrl={profile?.paymentInfo?.wechatPayQrUrl} />
                                            <QrCodeDisplay label="PromptPay (泰国)" qrUrl={profile?.paymentInfo?.promptPayQrUrl} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">您尚未设置任何法币收款方式。</p>
                                    <DialogTrigger asChild>
                                        <Button className="mt-4" disabled={hasPendingRequest}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            立即设置
                                        </Button>
                                    </DialogTrigger>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>申请修改收款信息</DialogTitle>
                        <DialogDescription>
                            提交后管理员将进行审核。留空表示删除该项。请上传收款二维码图片。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-4">
                        <div>
                            <h4 className="font-semibold text-sm mb-2">银行账户</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-bankName">银行名称</Label>
                                    <Input id="new-bankName" name="bankAccount.bankName" onChange={handleNewInfoChange} placeholder="例如：Kasikorn Bank" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-accountName">户名</Label>
                                    <Input id="new-accountName" name="bankAccount.accountName" onChange={handleNewInfoChange} placeholder="请输入与银行卡一致的姓名" />
                                </div>
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="new-accountNumber">账号</Label>
                                    <Input id="new-accountNumber" name="bankAccount.accountNumber" onChange={handleNewInfoChange} placeholder="请输入银行卡号" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-2">USDT (TRC20) 地址</h4>
                            <div className="grid gap-2">
                                <Label htmlFor="new-usdtAddress" className="sr-only">USDT Address</Label>
                                <Input id="new-usdtAddress" name="usdtAddress" onChange={handleNewInfoChange} placeholder="请输入您的TRC20收款地址" />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-2">二维码收款</h4>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                               <FileUploader
                                    id="alipay-upload"
                                    title="支付宝"
                                    description="上传收款码"
                                    preview={alipayQrPreview}
                                    onFileChange={(e) => handleFileChange(e, 'alipay')}
                                    onRemove={() => handleRemoveImage('alipay')}
                                    disabled={isSubmittingRequest}
                                />
                                <FileUploader
                                    id="wechat-upload"
                                    title="微信支付"
                                    description="上传收款码"
                                    preview={wechatPayQrPreview}
                                    onFileChange={(e) => handleFileChange(e, 'wechat')}
                                    onRemove={() => handleRemoveImage('wechat')}
                                    disabled={isSubmittingRequest}
                                />
                                <FileUploader
                                    id="promptpay-upload"
                                    title="PromptPay"
                                    description="上传收款码"
                                    preview={promptPayQrPreview}
                                    onFileChange={(e) => handleFileChange(e, 'promptpay')}
                                    onRemove={() => handleRemoveImage('promptpay')}
                                    disabled={isSubmittingRequest}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>取消</Button>
                        <Button onClick={handleSubmitRequest} disabled={isSubmittingRequest}>
                             {isSubmittingRequest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            提交申请
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
    
