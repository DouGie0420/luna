'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, where, addDoc, serverTimestamp, getDocs, doc, getDoc } from "firebase/firestore";
import { ethers } from 'ethers';
import type { PaymentChangeRequest, PaymentInfo, UserProfile } from '@/lib/types';
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
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';

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

const MetaMaskIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 100 100" {...props}><path d="M83.43,26.28,62.26,13.41a4.21,4.21,0,0,0-4-.09L43.83,21.58,36.5,26,25.9,32.45,21.4,35.1l-2.65,1.52L16,38.16a2.4,2.4,0,0,0-1.14,2.12V59.83a2.39,2.b 9,2.39,0,0,0,1.14,2.12l2.74,1.57,11.23,6.48,7.34,4.24,14.67,8.47a4.23,4.23,0,0,0,4,0L78,74.24l13.8-8a2.39,2.39,0,0,0,1.2-2.09V34.59a2.42,2.42,0,0,0-1.19-2.12ZM35.3,49.44,27.18,54.32l-6.23-3.6V43.23l6.23-3.6,8.12,4.88ZM58.31,23.3,62.25,21,73,27.32,62.26,33.57,51.83,27.53Zm-15.6,0,10.43-6.24L62.26,22.8,53,28.24,42.71,22.25Zm-3.11,8.1,9-5.18,10.15,5.92-3.1,1.8-6.88-4.11-8.31,4.86Zm-2.8,1.6,9.15-5.28,3.24,1.87-9.15,5.28Zm13,29.35-10.16-5.9,3.11-1.79,7.05,4.14,8-4.63-3.11-1.79Zm-1.85-20.17,8-4.63,6.23,3.6-8,4.63Zm18.89,12.06L52.06,78.56,42.71,73.1l-6.4-3.79V61.19L42.71,56l14.88,8.63L73,56l-6.23-3.6,6.23-3.6,8.12,4.88v9.42Z" fill="#e57a3b"/></svg>
);
const PhantomIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}><path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 2a8 8 0 100 16 8 8 0 000-16zM6 6a4 4 0 014 4h2a6 6 0 10-6-6v2zm1.757 7.071a1 1 0 011.414 0l1.414-1.414a3 3 0 10-4.242 4.242l1.414-1.414a1 1 0 010-1.414zm6.586-4.242a1 1 0 010 1.414l-1.414 1.414a3 3 0 104.242-4.242l-1.414 1.414a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
);
const BinanceIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" {...props}><path d="M12 2L6 8l6 6 6-6-6-6z" fill="#F0B90B"></path><path d="M2 12l6 6 6-6-6-6-6 6z" fill="#F0B90B"></path><path d="M12 22l6-6-6-6-6 6 6 6z" fill="#F0B90B"></path><path d="M16.5 12l-4.5 4.5-4.5-4.5 4.5-4.5 4.5 4.5z" fill="#F0B90B"></path><path d="M22 12l-6 6-1.5-1.5 4.5-4.5L16 7.5l6 4.5z" fill="#F0B90B"></path></svg>
);

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

export default function WalletPage() {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    const isMounted = useRef(true);

    const [isConnecting, setIsConnecting] = useState(false);
    const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [newPaymentInfo, setNewPaymentInfo] = useState<PaymentInfo>({});
    const [alipayQrPreview, setAlipayQrPreview] = useState<string | null>(null);
    const [wechatPayQrPreview, setWechatPayQrPreview] = useState<string | null>(null);
    const [promptPayQrPreview, setPromptPayQrPreview] = useState<string | null>(null);
    
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
    const hasExistingPaymentInfo = profile?.paymentInfo && Object.values(profile.paymentInfo).some(v => v);

    const resetRequestForm = () => {
        setNewPaymentInfo({});
        setAlipayQrPreview(null);
        setWechatPayQrPreview(null);
        setPromptPayQrPreview(null);
    }

    const handleConnect = async (walletType: 'metamask' | 'phantom' | 'binance') => {
        if (!firestore || !user) return;
        
        // 🛡️ 深度清理 Provider
        const eth = (window as any).ethereum;
        if (walletType === 'metamask' && (!eth || !eth.isMetaMask)) {
            toast({ variant: "destructive", title: "METAMASK_NOT_FOUND", description: "Gateway not detected. Please unlock or install." });
            return;
        }

        setIsConnecting(true);
        setIsWalletSelectorOpen(false);

        try {
            // 🛡️ 采用分步握手策略
            const provider = new ethers.BrowserProvider(eth);
            
            // 先尝试静默检查已有账户
            const accounts = await Promise.race([
                eth.request({ method: 'eth_accounts' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error("SILENT_TIMEOUT")), 2000))
            ]).catch(() => []);

            // 如果没有静默授权，再触发弹出框
            if (accounts.length === 0) {
                const connectPromise = eth.request({ method: 'eth_requestAccounts' });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("USER_TIMEOUT")), 30000));
                await Promise.race([connectPromise, timeoutPromise]);
            }
            
            const signer = await provider.getSigner();
            const walletAddress = (await signer.getAddress()).toLowerCase();
            
            if (!isMounted.current) return;

            const q = query(collection(firestore, 'users'), where("walletAddress", "==", walletAddress));
            const querySnapshot = await getDocs(q);
      
            if (!querySnapshot.empty && querySnapshot.docs.some(doc => doc.id !== user.uid)) {
                toast({ variant: "destructive", title: "IDENTITY_CONFLICT", description: "Node already bound to another protocol." });
                setIsConnecting(false);
                return;
            }

            await updateUserProfile(firestore, user.uid, { walletAddress, isWeb3Verified: true });
            toast({ title: "HANDSHAKE_COMPLETE", description: "Identity node linked successfully." });
        } catch (error: any) {
            console.error("WEB3_LINK_ERROR:", error);
            if (!isMounted.current) return;
            const msg = error.code === 4001 ? "Link rejected by user." : "Matrix interface failure.";
            toast({ variant: 'destructive', title: 'LINK_FAILURE', description: msg });
        } finally {
            if (isMounted.current) setIsConnecting(false);
        }
    };
    
    // ... (保留 handleNewInfoChange, handleFileChange, handleRemoveImage, handleSubmitRequest 逻辑)
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
                                    <Input className="bg-cyan-400/5 border-cyan-400/20 text-cyan-400 text-xs font-mono" name="usdtAddress" placeholder="Link TRC20 Address" onChange={handleNewInfoChange} />
                                </div>
                            </div>
                            <DialogFooter><Button onClick={handleSubmitRequest} disabled={isSubmittingRequest} className="bg-[#ff00ff] text-white font-black italic uppercase w-full shadow-[0_0_20px_rgba(255,0,255,0.4)]">DEPLOY_LOG</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-8">
                    <div className="glass-card-cyber rounded-[2.5rem] p-10 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Gem size={120} /></div>
                        <p className="text-[10px] font-black uppercase text-[#ff00ff] tracking-[0.4em] mb-4">RESOURCE_RESERVE</p>
                        <h2 className="text-xl font-bold text-white/60 mb-2">Lunar Soil Credits</h2>
                        <div className="text-6xl font-black italic titanium-title text-white">
                            {(profile?.lunarSoil || 0).toLocaleString()} <span className="text-sm font-normal text-white/30 not-italic uppercase tracking-[0.3em] ml-4">Grams</span>
                        </div>
                    </div>

                    <div className="glass-card-cyber rounded-[2.5rem] p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-cyan-400 tracking-[0.4em] mb-3">IDENTITY_NODE</p>
                                <h2 className="text-xl font-bold text-white/60">EVM Linked Address</h2>
                            </div>
                            <Button 
                                onClick={() => setIsWalletSelectorOpen(true)} 
                                disabled={isConnecting}
                                className="bg-[#ff00ff] text-white shadow-[0_0_30px_rgba(255,0,255,0.6)] font-black italic rounded-full px-10 py-6 text-sm transition-all hover:scale-105 active:scale-95 group"
                            >
                                {isConnecting ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Wallet className="h-5 w-5 mr-3" />}
                                {profile?.isWeb3Verified ? 'REFRESH_LINK' : 'INITIALIZE_LINK'}
                            </Button>
                        </div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                            <p className="font-mono text-sm text-cyan-400 break-all">{profile?.walletAddress || '0x0000...DISCONNECTED'}</p>
                        </div>
                    </div>

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

            <Dialog open={isWalletSelectorOpen} onOpenChange={setIsWalletSelectorOpen}>
                <DialogContent className="max-w-xs bg-black/95 border-white/10 text-white rounded-[2.5rem] p-6 shadow-[0_0_100px_rgba(0,0,0,1)]">
                    <DialogHeader><DialogTitle className="titanium-title italic uppercase text-center text-lg">Choose Gateway</DialogTitle></DialogHeader>
                    <div className="grid gap-4 py-6">
                        <Button variant="outline" className="h-16 justify-start gap-4 border-white/10 bg-white/5 hover:border-[#ff00ff]/50 hover:bg-[#ff00ff]/5 transition-all rounded-2xl group" onClick={() => handleConnect('metamask')}>
                            <MetaMaskIcon className="h-8 w-8 group-hover:scale-110 transition-transform" /> <span className="font-black italic tracking-widest text-white">METAMASK</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}