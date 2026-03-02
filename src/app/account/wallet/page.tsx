'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
import { ethers, formatUnits, parseUnits } from 'ethers'; // 引入 parseUnits 用于处理授权金额
import type { PaymentChangeRequest, PaymentInfo, UserProfile } from '@/lib/types';
import { compressImage } from '@/lib/image-compressor';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, QrCode, PlusCircle, AlertCircle, Edit, Banknote, Building, UploadCloud, X, Gem, CheckCircle } from "lucide-react";
import Image from 'next/image';
import { updateUserProfile } from '@/lib/user';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { getEthersSigner } from '@/lib/web3-provider'; // 引入我们自己的 getEthersSigner 来触发连接
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance'; // USDT 余额和授权 Hook
import { useUSDTApprove } from '@/hooks/useUSDTApprove'; // USDT 授权 Hook
import { connectToChain } from '@/lib/web3-provider'; // 引入连接链的函数


// 定义Luna项目所需的Polygon链ID，与web3-provider.ts保持一致
const REQUIRED_CHAIN_ID = 8453;

// 🌌 赛博高奢增强样式
const intenseArtStyles = `
  .fluid-bg-container { position: fixed; inset: 0; background: #05000a; overflow: hidden; z-index: 0; }
  .cyber-grid {
      position: absolute; inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      mask-image: radial-gradient(circle at center, black 30%, transparent 100%);
  }
  .fluid-entity { position: absolute; border-radius: 50%; filter: blur(120px); will-change: transform; mix-blend-mode: screen; pointer-events: none; }
  @keyframes drift { 0% { transform: translate(0,0) scale(1); } 100% { transform: translate(10vw, 10vh) scale(1.3); } }
  .astral-pink { width: 80vw; height: 80vw; top: -20%; left: -20%; background: #ff00ff; animation: drift 20s infinite alternate; opacity: 0.4; }
  .astral-cyan { width: 90vw; height: 90vw; bottom: -30%; right: -20%; background: #00ffff; animation: drift 25s infinite alternate-reverse; opacity: 0.3; }
  .glass-card-cyber { background: rgba(5, 0, 10, 0.8); backdrop-filter: blur(40px); border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
  .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
`;

const InfoRow = ({ label, value, isMono = false }: { label: string, value: string | null | undefined, isMono?: boolean }) => (
    <div className="flex justify-between items-center text-sm">
        <p className="text-white/40 uppercase font-mono text-[10px] tracking-widest">{label}</p>
        {value ? (
            <p className={`font-black ${isMono ? 'font-mono' : ''} break-all text-right text-white`}>{value}</p>
        ) : (
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Unset_Slot</p>
        )}
    </div>
);

const QrCodeDisplay = ({ label, qrUrl }: { label: string, qrUrl: string | null | undefined }) => (
     <div className="flex justify-between items-center">
        <p className="font-bold text-white/80 uppercase tracking-widest text-xs">{label}</p>
        {qrUrl ? (
            <Dialog>
                <DialogTrigger asChild><Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white font-black italic rounded-xl px-4">DECODE_QR</Button></DialogTrigger>
                <DialogContent className="max-w-xs bg-black/95 border-white/10 text-white"><DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader><div className="relative aspect-square w-full"><Image src={qrUrl} alt={`${label} QR Code`} fill className="object-contain rounded-md" /></div></DialogContent>
            </Dialog>
        ) : ( <p className="text-[10px] text-white/20 uppercase tracking-widest">Empty</p> )}
    </div>
);

interface USDTTransaction {
  id: string;
  type: 'lock' | 'release' | 'refund' | 'approval' | 'transfer';
  amount: string;
  txHash: string;
  timestamp: any; // Firestore Timestamp or Date
  status: 'pending' | 'confirmed' | 'failed';
  orderId?: string;
  from?: string;
  to?: string;
  userId?: string;
  network?: string;
  contractAddress?: string;
  // Firestore may have additional fields like amountNumber
  amountNumber?: number;
}

export default function WalletPage() {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const isMounted = useRef(true);

    // --- New Web3 Hooks ---
    const { address, isConnected, chainId } = useUSDTBalanceAndAllowance(); // 使用我们自己的 Hook
    const { balance, allowance, decimals, symbol, isLoading, error: usdtHookError, refetch: refetchUSDTData } = useUSDTBalanceAndAllowance();
    const { isApproving, approvalError, approveUSDT } = useUSDTApprove();
    // --- End New Web3 Hooks ---

    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [newPaymentInfo, setNewPaymentInfo] = useState<PaymentInfo>({});
    const [alipayQrPreview, setAlipayQrPreview] = useState<string | null>(null);
    const [wechatPayQrPreview, setWechatPayQrPreview] = useState<string | null>(null);
    const [promptPayQrPreview, setPromptPayQrPreview] = useState<string | null>(null);
    
    // USDT 授权相关状态
    const [amountToApprove, setAmountToApprove] = useState<string>('');
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState<boolean>(false);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const pendingRequestQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'paymentChangeRequests'), where('userId', '==', user.uid), where('status', '==', 'pending'));
    }, [firestore, user]);
    
    const { data: pendingRequests } = useCollection<PaymentChangeRequest>(pendingRequestQuery);
    const hasPendingRequest = pendingRequests && pendingRequests.length > 0;
    
    // USDT Transaction History Query
    const transactionsQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'usdt_transactions'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
    }, [firestore, user]);
    
    const { data: transactions, loading: loadingTransactions } = useCollection<USDTTransaction>(transactionsQuery);
    
    const hasExistingPaymentInfo = profile?.paymentInfo && Object.values(profile.paymentInfo).some(v => v);

    const resetRequestForm = () => {
        setNewPaymentInfo({});
        setAlipayQrPreview(null);
        setWechatPayQrPreview(null);
        setPromptPayQrPreview(null);
    }

    // --- Old handleConnect function removed as Web3Modal handles connection ---
    // --- Update user profile with connected wallet address ---
    useEffect(() => {
        if (isConnected && address && user && firestore && (!profile?.walletAddress || profile.walletAddress.toLowerCase() !== address.toLowerCase())) {
            updateUserProfile(firestore, user.uid, { walletAddress: address.toLowerCase(), isWeb3Verified: true })
                .then(() => {
                    toast({ title: "HANDSHAKE_COMPLETE", description: "Identity node linked successfully." });
                })
                .catch((error) => {
                    console.error("FIREBASE_PROFILE_UPDATE_ERROR:", error);
                    toast({ variant: 'destructive', title: 'PROFILE_UPDATE_FAILURE', description: 'Failed to link wallet address to profile.' });
                });
        }
    }, [isConnected, address, user, firestore, profile?.walletAddress, toast]);

    // --- Handle network mismatch ---
    useEffect(() => {
        if (isConnected && chainId !== REQUIRED_CHAIN_ID) {
            toast({
                variant: "destructive",
                title: "CHAIN_MISMATCH",
                description: `Please switch to Base Mainnet (Chain ID: ${REQUIRED_CHAIN_ID}).`,
                action: (
                    <Button
                        onClick={() => connectToChain(REQUIRED_CHAIN_ID)}
                        className="bg-primary hover:bg-primary-dark text-white"
                    >
                        切换网络
                    </Button>
                )
            });
        }
    }, [isConnected, chainId, toast]);
    // --- End network mismatch handling ---

    const handleNewInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('bankAccount.')) {
            const field = name.split('.')[1];
            setNewPaymentInfo(prev => ({ ...prev, bankAccount: { ...prev.bankAccount, [field]: value } }));
        } else {
             setNewPaymentInfo(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'alipay' | 'wechat' | 'promptpay') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsSubmittingRequest(true);
        try {
            const compressedDataUrl = await compressImage(file);
            if(type === 'alipay') { setAlipayQrPreview(compressedDataUrl); setNewPaymentInfo(prev => ({ ...prev, alipayQrUrl: compressedDataUrl })); }
            if(type === 'wechat') { setWechatPayQrPreview(compressedDataUrl); setNewPaymentInfo(prev => ({ ...prev, wechatPayQrUrl: compressedDataUrl })); }
            if(type === 'promptpay') { setPromptPayQrPreview(compressedDataUrl); setNewPaymentInfo(prev => ({ ...prev, promptPayQrUrl: compressedDataUrl })); }
        } catch (error) { toast({ variant: 'destructive', title: 'Aperture Error' }); } 
        finally { setIsSubmittingRequest(false); }
    };

    const handleRemoveImage = (type: 'alipay' | 'wechat' | 'promptpay') => {
        if(type === 'alipay') { setAlipayQrPreview(null); setNewPaymentInfo(prev => ({ ...prev, alipayQrUrl: undefined })); }
        if(type === 'wechat') { setWechatPayQrPreview(null); setNewPaymentInfo(prev => ({ ...prev, wechatPayQrUrl: undefined })); }
        if(type === 'promptpay') { setPromptPayQrPreview(null); setNewPaymentInfo(prev => ({ ...prev, promptPayQrUrl: undefined })); }
    }

    const handleSubmitRequest = async () => {
        if (!user || !profile || !firestore) return;
        setIsSubmittingRequest(true);
        try {
            await addDoc(collection(firestore, 'paymentChangeRequests'), {
                userId: user.uid, userName: profile.displayName || 'Anon', status: 'pending', createdAt: serverTimestamp(),
                requestedPaymentInfo: newPaymentInfo, currentPaymentInfo: profile.paymentInfo || {}
            });
            toast({ title: 'LOG_BROADCASTED' });
            setIsRequestDialogOpen(false); resetRequestForm();
        } catch (error) { console.error(error); } finally { setIsSubmittingRequest(false); }
    };

    // --- USDT 授权处理 ---
    const handleApproveUSDT = async () => {
        if (!amountToApprove || parseFloat(amountToApprove) <= 0) {
            toast({ variant: 'destructive', title: 'INVALID_AMOUNT', description: 'Please enter a valid amount to approve.' });
            return;
        }
        if (!decimals) {
            toast({ variant: 'destructive', title: 'DECIMALS_UNKNOWN', description: 'USDT decimals not loaded yet.' });
            return;
        }

        try {
            const amountInWei = parseUnits(amountToApprove, decimals);
            const success = await approveUSDT(amountInWei);
            if (success) {
                toast({ title: 'APPROVAL_SUCCESS', description: `Successfully approved ${amountToApprove} ${symbol || 'USDT'}.` });
                setIsApproveDialogOpen(false);
                setAmountToApprove('');
            } else if (!approvalError || approvalError === 'User rejected the transaction.') {
                // 如果是用户拒绝，useUSDTApprove 已经设置了错误信息，这里不重复设置
            } else {
                toast({ variant: 'destructive', title: 'APPROVAL_FAILURE', description: approvalError || 'Failed to approve USDT.' });
            }
        } catch (error: any) {
            console.error('USDT approval error:', error);
            toast({ variant: 'destructive', title: 'APPROVAL_ERROR', description: error.message || 'An unexpected error occurred during approval.' });
        }
    };
    // --- End USDT 授权处理 ---

    return (
        <div className="min-h-screen relative text-white selection:bg-[#ff00ff]/30 pb-32 overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: intenseArtStyles }} />
            
            <div className="fluid-bg-container pointer-events-none">
                <div className="cyber-grid" />
                <div className="fluid-entity astral-pink" />
                <div className="fluid-entity astral-cyan" />
                <div className="absolute inset-0 bg-black/50" />
            </div>

            <PageHeaderWithBackAndClose />

            <div className="container max-w-4xl pt-[160px] relative z-10 px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter titanium-title">
                        Terminal <span className="text-[#ff00ff] drop-shadow-[0_0_15px_rgba(255,0,255,0.5)]">Vault</span>
                    </h1>
                    <Dialog open={isRequestDialogOpen} onOpenChange={(isOpen) => { setIsRequestDialogOpen(isOpen); if (!isOpen) resetRequestForm(); }}>
                        <DialogTrigger asChild>
                            <Button disabled={hasPendingRequest} className={cn("gap-2 rounded-full font-black italic tracking-widest transition-all", hasPendingRequest ? "bg-white/5 border-white/10 opacity-50" : "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105")}>
                                {hasPendingRequest ? 'VERIFYING...' : 'UPGRADE_INTEL'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-black/95 border-white/10 text-white backdrop-blur-3xl">
                            <DialogHeader><DialogTitle className="titanium-title italic uppercase text-xl">Protocol Upgrade Request</DialogTitle></DialogHeader>
                            <div className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff00ff]">Bank Gateway</Label>
                                    <Input className="bg-white/5 border-white/10 text-xs" name="bankAccount.bankName" placeholder="Node Name (e.g. Kasikorn)" onChange={handleNewInfoChange} />
                                    <Input className="bg-white/5 border-white/10 text-xs font-mono" name="bankAccount.accountNumber" placeholder="Node Number" onChange={handleNewInfoChange} />
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">USDT Hub (TRC20)</Label>
                                    {/* 这里原来是TRC20，但我们现在是EVM链，所以保持为通用地址或EVM链地址 */}
                                    <Input className="bg-cyan-400/5 border-cyan-400/20 text-cyan-400 text-xs font-mono" name="usdtAddress" placeholder="Link EVM USDT Address" onChange={handleNewInfoChange} />
                                </div>
                            </div>
                            <DialogFooter><Button onClick={handleSubmitRequest} disabled={isSubmittingRequest} className="bg-[#ff00ff] text-white font-black italic uppercase w-full shadow-[0_0_20px_rgba(255,0,255,0.4)]">DEPLOY_LOG</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-8">
                    {/* Lunar Soil Credits 保持不变 */}
                    <div className="glass-card-cyber rounded-[2.5rem] p-10 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Gem size={120} /></div>
                        <p className="text-[10px] font-black uppercase text-[#ff00ff] tracking-[0.4em] mb-4">RESOURCE_RESERVE</p>
                        <h2 className="text-xl font-bold text-white/60 mb-2">Lunar Soil Credits</h2>
                        <div className="text-6xl font-black italic titanium-title text-white">
                            {(profile?.lunarSoil || 0).toLocaleString()} <span className="text-sm font-normal text-white/30 not-italic uppercase tracking-[0.3em] ml-4">Grams</span>
                        </div>
                    </div>

                    {/* EVM Linked Address (更新为Web3Modal账户信息) */}
                    <div className="glass-card-cyber rounded-[2.5rem] p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-cyan-400 tracking-[0.4em] mb-3">IDENTITY_NODE</p>
                                <h2 className="text-xl font-bold text-white/60">EVM Linked Address</h2>
                            </div>
                            {!isConnected ? (
                                <Button
                                    onClick={() => getEthersSigner(toast)}
                                >
                                    <Wallet className="h-5 w-5 mr-3" />
                                    INITIALIZE_LINK
                                </Button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="text-sm text-white/80">已连接</span>
                                    <Button
                                        onClick={() => getEthersSigner(toast)} // 触发连接
                                        variant="ghost"
                                        className="text-cyan-400 hover:underline text-sm p-0 h-auto"
                                    >
                                        REFRESH_LINK / 切换
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                            <InfoRow label="Address" value={address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '0x0000...DISCONNECTED'} isMono />
                            <InfoRow label="Chain ID" value={chainId ? chainId.toString() : 'N/A'} />
                            <InfoRow label="Network" value={chainId === REQUIRED_CHAIN_ID ? "Base Mainnet" : "Incorrect Network"} />
                        </div>
                    </div>

                    {/* USDT 资产和授权信息 */}
                    <div className="glass-card-cyber rounded-[2.5rem] p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-pink-400 tracking-[0.4em] mb-3">DIGITAL_ASSETS</p>
                                <h2 className="text-xl font-bold text-white/60">USDT Vault</h2>
                            </div>
                            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        disabled={!isConnected || isLoading || usdtHookError !== null || chainId !== REQUIRED_CHAIN_ID}
                                        className="bg-purple-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.6)] font-black italic rounded-full px-10 py-6 text-sm transition-all hover:scale-105 active:scale-95 group"
                                    >
                                        <PlusCircle className="h-5 w-5 mr-3" />
                                        {isApproving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : 'APPROVE_USDT'}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md bg-black/95 border-white/10 text-white backdrop-blur-3xl">
                                    <DialogHeader><DialogTitle className="titanium-title italic uppercase text-xl">USDT Authorization</DialogTitle></DialogHeader>
                                    <DialogDescription className="text-white/70">
                                        Authorize Luna Escrow Contract to spend your USDT.
                                    </DialogDescription>
                                    <div className="grid gap-4 py-4">
                                        <Label htmlFor="amount" className="text-white/40">Amount to Approve (USDT)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            value={amountToApprove}
                                            onChange={(e) => setAmountToApprove(e.target.value)}
                                            placeholder="e.g., 1000"
                                            className="bg-white/5 border-white/10 text-xs font-mono"
                                        />
                                        {approvalError && <p className="text-red-400 text-sm">{approvalError}</p>}
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="ghost" disabled={isApproving}>Cancel</Button>
                                        </DialogClose>
                                        <Button
                                            onClick={handleApproveUSDT}
                                            disabled={isApproving || !amountToApprove || parseFloat(amountToApprove) <= 0}
                                            className="bg-purple-600 text-white font-black italic uppercase"
                                        >
                                            {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            CONFIRM_APPROVAL
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                            {isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-white/50 mx-auto" />
                            ) : usdtHookError ? (
                                <div className="text-red-400 text-center"><AlertCircle className="inline-block h-5 w-5 mr-2" />{usdtHookError}</div>
                            ) : (
                                <>
                                    <InfoRow
                                        label="Your Balance"
                                        value={balance !== null && decimals !== null ? `${parseFloat(formatUnits(balance, decimals)).toFixed(2)} ${symbol || 'USDT'}` : 'N/A'}
                                        isMono
                                    />
                                    <InfoRow
                                        label="Escrow Allowance"
                                        value={allowance !== null && decimals !== null ? `${parseFloat(formatUnits(allowance, decimals)).toFixed(2)} ${symbol || 'USDT'}` : 'N/A'}
                                        isMono
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* USDT Transaction History */}
                    <div className="glass-card-cyber rounded-[2.5rem] p-10">
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] mb-10">TRANSACTION_HISTORY</p>
                        <div className="space-y-4">
                            {loadingTransactions ? (
                                <div className="text-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                    <p className="text-white/30 font-mono text-[10px] uppercase tracking-[0.4em]">Loading transactions...</p>
                                </div>
                            ) : transactions && transactions.length > 0 ? (
                                <div className="space-y-3">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                                    tx.type === 'lock' ? "bg-blue-500/20 text-blue-400" :
                                                    tx.type === 'release' ? "bg-green-500/20 text-green-400" :
                                                    tx.type === 'refund' ? "bg-yellow-500/20 text-yellow-400" :
                                                    tx.type === 'approval' ? "bg-purple-500/20 text-purple-400" :
                                                    "bg-white/20 text-white"
                                                )}>
                                                    {tx.type === 'lock' ? '🔒' :
                                                     tx.type === 'release' ? '💰' :
                                                     tx.type === 'refund' ? '↩️' :
                                                     tx.type === 'approval' ? '✅' : '💸'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white uppercase text-sm">{tx.type}</p>
                                                    <p className="text-xs text-white/50 font-mono">{tx.amount} USDT</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-white/30 font-mono">
                                                    {tx.timestamp?.toDate ? new Date(tx.timestamp.toDate()).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className={cn(
                                                    "text-xs font-mono",
                                                    tx.status === 'confirmed' ? "text-green-400" :
                                                    tx.status === 'pending' ? "text-yellow-400" :
                                                    "text-red-400"
                                                )}>
                                                    {tx.status}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-white/5 rounded-2xl bg-white/[0.02]">
                                    <p className="text-white/30 font-mono text-[10px] uppercase tracking-[0.4em]">No USDT transactions yet</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Settlement Gateways 保持不变，但更新了USDT Hub的placeholder */}
                    <div className="glass-card-cyber rounded-[2.5rem] p-10">
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.4em] mb-10">SETTLEMENT_GATEWAYS</p>
                        {hasExistingPaymentInfo ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#ff00ff] bg-[#ff00ff]/10 w-fit px-3 py-1 rounded-md">Banking Hub</h4>
                                    <div className="space-y-4">
                                        <InfoRow label="Protocol" value={profile?.paymentInfo?.bankAccount?.bankName} />
                                        <InfoRow label="Node_ID" value={profile?.paymentInfo?.bankAccount?.accountNumber} isMono />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-400/10 w-fit px-3 py-1 rounded-md">QR Interoperability</h4>
                                    <div className="space-y-4">
                                        <QrCodeDisplay label="Alipay" qrUrl={profile?.paymentInfo?.alipayQrUrl} />
                                        <QrCodeDisplay label="WeChat" qrUrl={profile?.paymentInfo?.wechatPayQrUrl} />
                                        <QrCodeDisplay label="PromptPay" qrUrl={profile?.paymentInfo?.promptPayQrUrl} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                                <AlertCircle className="mx-auto h-12 w-12 text-white/10 mb-6" />
                                <p className="text-white/30 font-mono text-[10px] uppercase tracking-[0.4em]">No Active Gateways Detected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 旧的钱包选择对话框已移除，现在由Web3Modal统一管理 */}
        </div>
    );
}