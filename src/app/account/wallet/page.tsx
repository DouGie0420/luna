'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, addDoc, doc, serverTimestamp } from "firebase/firestore";
import { ethers } from 'ethers';
import type { PaymentChangeRequest, PaymentInfo } from '@/lib/types';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, CreditCard, QrCode, Save, CheckCircle, PlusCircle, AlertCircle, Edit, Banknote, Building, User as UserIcon } from "lucide-react";
import Image from 'next/image';
import { updateUserProfile } from '@/lib/user';
import { Separator } from '@/components/ui/separator';

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string | null | undefined, isMono?: boolean }) => (
    <div className="flex justify-between items-center py-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value ? (
            <p className={`text-sm font-semibold ${isMono ? 'font-mono' : ''}`}>{value}</p>
        ) : (
            <p className="text-sm text-muted-foreground/70">未设置</p>
        )}
    </div>
);

const QrCodeDisplay = ({ label, qrUrl }: { label: string, qrUrl: string | null | undefined }) => (
     <div className="flex justify-between items-center py-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {qrUrl ? (
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">查看二维码</Button>
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
            
            toast({ title: "Web3 钱包已链接", description: `地址 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} 已绑定。` });
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: '钱包链接失败', description: error.message });
        } finally {
            setIsConnecting(false);
        }
    };
    
    const handleNewInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [section, field] = name.split('.');

        if (section === 'bankAccount') {
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

    const handleSubmitRequest = async () => {
        if (!user || !profile || !firestore) return;
        
        setIsSubmittingRequest(true);
        try {
            const requestData: Omit<PaymentChangeRequest, 'id'> = {
                userId: user.uid,
                userName: profile.displayName,
                status: 'pending',
                createdAt: serverTimestamp(),
                requestedPaymentInfo: newPaymentInfo,
                currentPaymentInfo: profile.paymentInfo || {}
            };
            await addDoc(collection(firestore, 'paymentChangeRequests'), requestData);
            toast({ title: '修改申请已提交', description: '管理员审核通过后将会生效。' });
            setIsRequestDialogOpen(false);
            setNewPaymentInfo({});
        } catch (error) {
            console.error("Error submitting payment change request:", error);
            toast({ variant: 'destructive', title: '提交失败', description: '请稍后重试。' });
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    return (
        <div className="container max-w-4xl py-10">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">支付与钱包管理</h1>
                 <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                    <DialogTrigger asChild>
                         <Button disabled={hasPendingRequest} className="gap-2">
                             {hasPendingRequest ? <AlertCircle className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                             {hasPendingRequest ? '审核中...' : '申请修改收款信息'}
                         </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>申请修改收款信息</DialogTitle>
                            <DialogDescription>
                                请在此处填写您希望更新的收款信息。提交后，管理员将进行审核。
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <h4 className="font-semibold text-sm">银行账户</h4>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-bankName">银行名称</Label>
                                    <Input id="new-bankName" name="bankAccount.bankName" onChange={handleNewInfoChange} placeholder="例如：Kasikorn Bank" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-accountName">户名</Label>
                                    <Input id="new-accountName" name="bankAccount.accountName" onChange={handleNewInfoChange} placeholder="开户人姓名" />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="new-accountNumber">银行账号</Label>
                                <Input id="new-accountNumber" name="bankAccount.accountNumber" onChange={handleNewInfoChange} placeholder="银行卡号或账号" />
                            </div>
                            <Separator />
                            <h4 className="font-semibold text-sm">收款二维码 (请提供图片链接)</h4>
                             <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="new-alipayQrUrl">支付宝收款码链接</Label>
                                    <Input id="new-alipayQrUrl" name="alipayQrUrl" onChange={handleNewInfoChange} placeholder="https://..." />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="new-wechatPayQrUrl">微信支付收款码链接</Label>
                                    <Input id="new-wechatPayQrUrl" name="wechatPayQrUrl" onChange={handleNewInfoChange} placeholder="https://..." />
                                </div>
                                 <div className="grid gap-2">
                                    <Label htmlFor="new-promptPayQrUrl">PromptPay收款码链接 (泰国)</Label>
                                    <Input id="new-promptPayQrUrl" name="promptPayQrUrl" onChange={handleNewInfoChange} placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmitRequest} disabled={isSubmittingRequest}>
                                {isSubmittingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                提交申请
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {hasPendingRequest && (
                <Card className="mb-8 border-yellow-500/50 bg-yellow-500/10">
                    <CardHeader className="flex-row items-center gap-4">
                         <AlertCircle className="h-6 w-6 text-yellow-400"/>
                         <div>
                            <CardTitle className="text-yellow-300">存在待审核的申请</CardTitle>
                            <CardDescription className="text-yellow-400/80">
                                您最近提交的收款信息修改申请正在等待管理员审核，在此期间无法提交新的申请。
                            </CardDescription>
                         </div>
                    </CardHeader>
                </Card>
            )}

            <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5" /> Web3 身份
                        </CardTitle>
                        <CardDescription>连接你的以太坊兼容钱包，用于接收加密货币或展示 NFT。</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-secondary/30 rounded-lg border flex justify-between items-center">
                            <div>
                                <p className="text-sm font-bold">当前绑定地址</p>
                                <p className="font-mono text-sm opacity-70">{profile?.walletAddress || '未连接'}</p>
                            </div>
                            <Button variant="outline" onClick={connectWeb3} disabled={isConnecting}>
                                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {profile?.walletAddress ? "更换钱包" : "连接钱包"}
                            </Button>
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
                    <CardContent className="divide-y divide-border">
                        <div className="py-2">
                            <h4 className="text-base font-semibold mb-2 flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> 银行账户</h4>
                            <InfoRow label="银行名称" value={profile?.paymentInfo?.bankAccount?.bankName} />
                            <InfoRow label="户名" value={profile?.paymentInfo?.bankAccount?.accountName} />
                            <InfoRow label="账号" value={profile?.paymentInfo?.bankAccount?.accountNumber} isMono />
                        </div>
                         <div className="py-2">
                            <h4 className="text-base font-semibold mb-2 mt-4 flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> 收款二维码</h4>
                            <QrCodeDisplay label="支付宝" qrUrl={profile?.paymentInfo?.alipayQrUrl} />
                            <QrCodeDisplay label="微信支付" qrUrl={profile?.paymentInfo?.wechatPayQrUrl} />
                            <QrCodeDisplay label="PromptPay (泰国)" qrUrl={profile?.paymentInfo?.promptPayQrUrl} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
