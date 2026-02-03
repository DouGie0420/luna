
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore } from "@/firebase";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from '@/lib/user';
import type { UserProfile } from '@/lib/types';
import { Loader2, Banknote, QrCode, UploadCloud, X, Save } from "lucide-react";
import Image from 'next/image';
import { compressImage } from '@/lib/image-compressor';
import { Skeleton } from '@/components/ui/skeleton';

// A small, reusable uploader for QR codes
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

// Main Wallet Page Component
export default function WalletPage() {
    const { t } = useTranslation();
    const { user, profile, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [bankAccount, setBankAccount] = useState({ accountName: '', accountNumber: '', bankName: '' });
    const [usdtAddress, setUsdtAddress] = useState('');
    const [alipayQrUrl, setAlipayQrUrl] = useState<string | null>(null);
    const [wechatPayQrUrl, setWechatPayQrUrl] = useState<string | null>(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (profile?.paymentInfo) {
            setBankAccount(profile.paymentInfo.bankAccount || { accountName: '', accountNumber: '', bankName: '' });
            setUsdtAddress(profile.paymentInfo.usdtAddress || '');
            setAlipayQrUrl(profile.paymentInfo.alipayQrUrl || null);
            setWechatPayQrUrl(profile.paymentInfo.wechatPayQrUrl || null);
        }
    }, [profile]);

    const handleQrCodeChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'alipay' | 'wechat') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSubmitting(true);
        try {
            const compressedDataUrl = await compressImage(file);
            if (type === 'alipay') {
                setAlipayQrUrl(compressedDataUrl);
            } else {
                setWechatPayQrUrl(compressedDataUrl);
            }
        } catch (error) {
            console.error("QR Code compression error:", error);
            toast({ variant: 'destructive', title: 'Image Error', description: 'Could not process the image.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!firestore || !user) return;
        setIsSubmitting(true);
        
        const paymentInfo: UserProfile['paymentInfo'] = {
            bankAccount: bankAccount.accountName ? bankAccount : undefined,
            usdtAddress: usdtAddress || undefined,
            alipayQrUrl: alipayQrUrl || undefined,
            wechatPayQrUrl: wechatPayQrUrl || undefined,
        };

        try {
            await updateUserProfile(firestore, user.uid, { paymentInfo });
            toast({ title: "收款信息已更新", description: "您的收款方式已成功保存。" });
        } catch (error) {
            console.error("Failed to save payment info:", error);
            toast({ variant: 'destructive', title: "保存失败", description: "无法更新您的收款信息，请稍后再试。" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (userLoading) {
        return (
             <div className="p-6 md:p-8 lg:p-12 space-y-8">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 lg:p-12">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline">收款方式管理</h1>
                 <Button onClick={handleSaveChanges} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    保存全部更改
                </Button>
            </div>
            
            <div className="grid gap-8">
                {/* Bank Account */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Banknote /> 银行账户</CardTitle>
                        <CardDescription>用于接收泰铢（THB）或人民币（RMB）转账。</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="accountName">账户名</Label>
                            <Input id="accountName" placeholder="例如：SOMCHAI K." value={bankAccount.accountName} onChange={e => setBankAccount(p => ({...p, accountName: e.target.value}))} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="accountNumber">银行账号</Label>
                            <Input id="accountNumber" placeholder="例如：123-4-56789-0" value={bankAccount.accountNumber} onChange={e => setBankAccount(p => ({...p, accountNumber: e.target.value}))} />
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="bankName">银行名称</Label>
                            <Input id="bankName" placeholder="例如：Kasikorn Bank" value={bankAccount.bankName} onChange={e => setBankAccount(p => ({...p, bankName: e.target.value}))} />
                        </div>
                    </CardContent>
                </Card>

                {/* USDT Address */}
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
                            <Input id="usdtAddress" placeholder="T..." value={usdtAddress} onChange={e => setUsdtAddress(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                {/* QR Codes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><QrCode /> 收款二维码</CardTitle>
                        <CardDescription>上传您的支付宝和微信收款码，方便买家扫码支付。</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-8">
                        <QrUploader
                            id="alipay-qr"
                            title="支付宝收款码"
                            preview={alipayQrUrl}
                            onFileChange={(e) => handleQrCodeChange(e, 'alipay')}
                            onRemove={() => setAlipayQrUrl(null)}
                            disabled={isSubmitting}
                        />
                         <QrUploader
                            id="wechatpay-qr"
                            title="微信支付收款码"
                            preview={wechatPayQrUrl}
                            onFileChange={(e) => handleQrCodeChange(e, 'wechat')}
                            onRemove={() => setWechatPayQrUrl(null)}
                            disabled={isSubmitting}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
