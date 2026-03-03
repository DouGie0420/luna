'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Megaphone, Award, Newspaper, Image as ImageIcon, Video as VideoIcon, 
  Loader2, Plus, Zap, Wallet, Smartphone, QrCode, CreditCard, ShieldCheck, Activity, Trash2 
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { cn } from "@/lib/utils";

// 🚀 引入全局支付通道控制 Hook
import { usePaymentMethods } from '@/hooks/use-payment-methods';

export default function AdminPromotionsPage() {
    const { profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 🛡️ 权限检查逻辑：广告位下放给 ghost/staff，但支付网关强制锁定 admin
    const canManageAds = profile && ['admin', 'ghost', 'staff'].includes(profile.role || '');
    const canManagePayments = profile && profile.role === 'admin';

    // 1. 顶部公告状态
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
    const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(true);

    // 2. 支付协议状态 (已由 hook 全局接管)
    const { methods: paymentMethods } = usePaymentMethods();

    // 3. 轮播图状态 (全量 20 个 Slot)
    const [carouselCount, setCarouselCount] = useState('10');
    const [carouselItems, setCarouselItems] = useState(
        Array.from({ length: 20 }, () => ({ title: '', desc: '', img: '', link: '' }))
    );
    const [isSavingCarousel, setIsSavingCarousel] = useState(false);

    // 4. 认证商户状态 (动态数组)
    const [fixedMerchants, setFixedMerchants] = useState<string[]>(['']);
    const [isSavingMerchants, setIsSavingMerchants] = useState(false);

    // 5. 社区推荐状态
    const [mediumPostIds, setMediumPostIds] = useState<string[]>(Array(10).fill(''));
    const [smallPostIds, setSmallPostIds] = useState<string[]>(Array(5).fill(''));
    const [isSavingCommunity, setIsSavingCommunity] = useState(false);

    // 媒体插入弹窗
    const [mediaUrl, setMediaUrl] = useState('');
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

    // --- 🚀 实时数据加载协议 ---
    useEffect(() => {
        if (!firestore) return;

        // 加载公告数据
        getDoc(doc(firestore, 'announcements', 'live')).then(s => {
            if (s.exists()) {
                setAnnouncementTitle(s.data().title || '');
                setAnnouncementContent(s.data().content || '');
            }
            setIsLoadingAnnouncement(false);
        });

        // 加载商户、轮播、推荐配置
        const loadConfigs = async () => {
            const mSnap = await getDoc(doc(firestore, 'configs', 'verified_merchants'));
            if (mSnap.exists()) setFixedMerchants(mSnap.data().fixedMerchantIds || ['']);

            const cSnap = await getDoc(doc(firestore, 'configs', 'home_carousel'));
            if (cSnap.exists()) {
                const data = cSnap.data();
                const items = data.items || [];
                // 补全到 20 个 slot 确保输入框不报错
                const fullItems = [...items, ...Array(20 - items.length).fill({ title: '', desc: '', img: '', link: '' })];
                setCarouselItems(fullItems);
                setCarouselCount(data.count?.toString() || '10');
            }

            const commSnap = await getDoc(doc(firestore, 'configs', 'community_recommendations'));
            if (commSnap.exists()) {
                const data = commSnap.data();
                setMediumPostIds(data.mediumPostIds || Array(10).fill(''));
                setSmallPostIds(data.smallPostIds || Array(5).fill(''));
            }
        };
        loadConfigs();

        // 卸载时不再需要清理 onSnapshot，因为支付状态已交由 Hook 处理
    }, [firestore]);

    // --- 🛠️ 业务逻辑函数 ---

    const handleTogglePayment = async (method: string) => {
        if (!firestore || !canManagePayments) return;
        
        const newVal = !paymentMethods[method as keyof typeof paymentMethods];
        try {
            await updateDoc(doc(firestore, 'settings', 'global'), { [`paymentMethods.${method}`]: newVal });
            toast({ title: "Broadcast Success", description: `${method.toUpperCase()} 支付通道已更新` });
        } catch (e) { toast({ variant: "destructive", title: "Access Denied" }); }
    };

    const handleSaveCarousel = async () => {
        if (!firestore || !canManageAds) return;
        setIsSavingCarousel(true);
        try {
            const cleanItems = carouselItems.filter(item => item.img.trim() !== '');
            await setDoc(doc(firestore, 'configs', 'home_carousel'), { 
                items: cleanItems, 
                count: parseInt(carouselCount), 
                updatedAt: serverTimestamp() 
            }, { merge: true });
            toast({ title: "Carousel Nodes Updated", description: `已同步 ${cleanItems.length} 个生效广告位` });
        } finally { setIsSavingCarousel(false); }
    };

    const handleSaveMerchants = async () => {
        if (!firestore) return;
        setIsSavingMerchants(true);
        try {
            const cleanIds = fixedMerchants.filter(id => id.trim() !== '');
            await setDoc(doc(firestore, 'configs', 'verified_merchants'), { 
                fixedMerchantIds: cleanIds, 
                updatedAt: serverTimestamp() 
            }, { merge: true });
            toast({ title: "Verified Merchants Synced" });
        } finally { setIsSavingMerchants(false); }
    };

    const handleSaveCommunity = async () => {
        if (!firestore) return;
        setIsSavingCommunity(true);
        try {
            await setDoc(doc(firestore, 'configs', 'community_recommendations'), { 
                mediumPostIds: mediumPostIds.filter(id => id.trim() !== ''),
                smallPostIds: smallPostIds.filter(id => id.trim() !== ''),
                updatedAt: serverTimestamp() 
            }, { merge: true });
            toast({ title: "Feed Algorithm Updated" });
        } finally { setIsSavingCommunity(false); }
    };

    if (!canManageAds) {
        return <div className="p-20 text-center text-white/40 font-mono uppercase tracking-[0.5em]">Clearance Level Insufficient</div>;
    }

    return (
        <div className="min-h-screen bg-[#050505] p-6 md:p-12 space-y-12 relative overflow-hidden">
            {/* 🚀 背景装饰：流体艺术 */}
            <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none animate-pulse" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

            <header className="flex justify-between items-end mb-16 relative z-10">
                <div className="space-y-3">
                    <h1 className="text-5xl font-black titanium-title italic uppercase text-white tracking-tighter">System <span className="text-primary">Protocols</span></h1>
                    <p className="text-white/30 font-mono text-xs uppercase tracking-[0.5em] flex items-center gap-3">
                        <Activity className="w-4 h-4 text-green-500 animate-pulse" /> Global Promotion & Payment Control Active
                    </p>
                </div>
            </header>

            <div className="grid gap-12 relative z-10">
                
                {/* 🛡️ 支付方式控制：75% 深度玻璃拟态 */}
                <Card className="bg-black/75 backdrop-blur-3xl border border-primary/30 rounded-[40px] overflow-hidden shadow-2xl transition-all hover:border-primary/50">
                    <CardHeader className="border-b border-white/5 p-10 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                                <Zap className="text-primary w-8 h-8 animate-pulse" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic uppercase text-white tracking-tight">Payment Gateways</CardTitle>
                                <CardDescription className="text-white/40 text-xs font-mono tracking-widest mt-1">REAL-TIME CHANNEL TERMINATION & ACTIVATION</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { id: 'usdt', label: 'USDT (TRC20)', icon: Wallet, color: 'text-green-400', bg: 'bg-green-400/5' },
                            { id: 'alipay', label: 'Alipay', icon: Smartphone, color: 'text-blue-400', bg: 'bg-blue-400/5' },
                            { id: 'wechat', label: 'WeChat Pay', icon: QrCode, color: 'text-green-500', bg: 'bg-green-500/5' },
                            { id: 'promptpay', label: 'PromptPay', icon: CreditCard, color: 'text-sky-400', bg: 'bg-sky-400/5' }
                        ].map((m) => (
                            <div key={m.id} className={cn(
                                "flex flex-col gap-6 p-8 rounded-[32px] border transition-all duration-500",
                                paymentMethodsConfig[m.id as keyof typeof paymentMethodsConfig] ? `${m.bg} border-primary/20 shadow-lg` : "bg-white/[0.02] border-white/5 opacity-30 grayscale"
                            )}>
                                <m.icon className={cn("w-10 h-10", m.color)} />
                                <div className="flex items-center justify-between">
                                    <span className="font-black italic uppercase text-xs text-white tracking-widest">{m.label}</span>
                                    <Switch
                                        checked={paymentMethodsConfig[m.id as keyof typeof paymentMethodsConfig]}
                                        onCheckedChange={() => handleTogglePayment(m.id)}
                                        disabled={!canManagePayments}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 顶部公告管理 */}
                <Card className="bg-black/75 backdrop-blur-3xl border border-white/10 rounded-[40px]">
                    <CardHeader className="border-b border-white/5 p-10">
                        <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black"><Megaphone className="text-primary w-6 h-6" /> Live Broadcast</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        <div className="grid gap-6">
                            <div className="space-y-2">
                                <Label className="text-white/40 uppercase text-[10px] tracking-[0.3em] ml-1">Protocol Header</Label>
                                <Input value={announcementTitle} onChange={e => setAnnouncementTitle(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold" placeholder="输入公告标题..." />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/40 uppercase text-[10px] tracking-[0.3em] ml-1">Data Payload (Supports HTML)</Label>
                                <Textarea value={announcementContent} onChange={e => setAnnouncementContent(e.target.value)} rows={6} className="bg-white/5 border-white/10 rounded-2xl text-white italic" placeholder="输入公告内容..." />
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setIsImageDialogOpen(true)} className="rounded-2xl h-12 bg-white/5 border-white/10 hover:bg-white/10 text-xs uppercase font-black"><ImageIcon className="mr-2 w-4 h-4" /> Inject Img</Button>
                                <Button variant="outline" onClick={() => setIsVideoDialogOpen(true)} className="rounded-2xl h-12 bg-white/5 border-white/10 hover:bg-white/10 text-xs uppercase font-black"><VideoIcon className="mr-2 w-4 h-4" /> Inject Video</Button>
                            </div>
                            <Button 
                                onClick={async () => {
                                    setIsSubmittingAnnouncement(true);
                                    await setDoc(doc(firestore!, 'announcements', 'live'), { title: announcementTitle, content: announcementContent, updatedAt: serverTimestamp() }, { merge: true });
                                    setIsSubmittingAnnouncement(false);
                                    toast({ title: "Transmission Successful" });
                                }} 
                                disabled={isSubmittingAnnouncement} 
                                className="bg-primary text-black font-black italic rounded-2xl px-12 h-14 shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-transform"
                            >
                                {isSubmittingAnnouncement ? <Loader2 className="animate-spin" /> : "BROADCAST NOW"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 🖼️ 首页轮播管理：逻辑完整补全 */}
                <Card className="bg-black/75 backdrop-blur-3xl border border-white/10 rounded-[40px]">
                    <CardHeader className="border-b border-white/5 p-10 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black"><ImageIcon className="text-primary w-6 h-6" /> Hero Carousel Protocol</CardTitle>
                        <Select value={carouselCount} onValueChange={setCarouselCount}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/10 rounded-xl h-10 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-black border-white/10 text-white">
                                <SelectItem value="5">5 Active Nodes</SelectItem>
                                <SelectItem value="10">10 Active Nodes</SelectItem>
                                <SelectItem value="15">15 Active Nodes</SelectItem>
                                <SelectItem value="20">20 Active Nodes</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="p-10">
                        <ScrollArea className="h-[600px] pr-6 rounded-[32px] border border-white/5 p-6 bg-black/40 cyber-scrollbar">
                            <Accordion type="multiple" className="w-full space-y-4">
                                {carouselItems.slice(0, parseInt(carouselCount)).map((item, index) => (
                                    <AccordionItem value={`item-${index}`} key={index} className="border-white/5 bg-white/[0.02] rounded-2xl px-6">
                                        <AccordionTrigger className="text-white/60 hover:text-primary font-black italic uppercase tracking-widest py-6">
                                            Slot #{index + 1}: {item.title || 'NULL_NODE'}
                                        </AccordionTrigger>
                                        <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase text-white/30 ml-1">Asset Title</Label>
                                                <Input value={item.title} onChange={e => {
                                                    const n = [...carouselItems]; n[index].title = e.target.value; setCarouselItems(n);
                                                }} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase text-white/30 ml-1">Source Image URL</Label>
                                                <Input value={item.img} onChange={e => {
                                                    const n = [...carouselItems]; n[index].img = e.target.value; setCarouselItems(n);
                                                }} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase text-white/30 ml-1">Target Link</Label>
                                                <Input value={item.link} onChange={e => {
                                                    const n = [...carouselItems]; n[index].link = e.target.value; setCarouselItems(n);
                                                }} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] uppercase text-white/30 ml-1">Description Metadata</Label>
                                                <Input value={item.desc} onChange={e => {
                                                    const n = [...carouselItems]; n[index].desc = e.target.value; setCarouselItems(n);
                                                }} className="bg-black/40 border-white/10 h-12 rounded-xl" />
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                        <div className="flex justify-end mt-10">
                            <Button 
                                onClick={handleSaveCarousel} 
                                disabled={isSavingCarousel} 
                                className="bg-white/5 border border-white/10 hover:bg-primary hover:text-black transition-all h-14 px-10 rounded-2xl font-black uppercase italic tracking-widest shadow-xl"
                            >
                                {isSavingCarousel ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 w-5 h-5" />}
                                Sync Carousel Data
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 🏆 认证商户展示：逻辑完整补全 */}
                <Card className="bg-black/75 backdrop-blur-3xl border border-white/10 rounded-[40px]">
                    <CardHeader className="border-b border-white/5 p-10 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-4 text-white uppercase italic font-black"><Award className="text-primary w-6 h-6" /> Merchant Endorsement</CardTitle>
                            <CardDescription className="text-white/40 text-xs mt-1">FORCE PIN CERTIFIED PROVIDERS TO HOME FEED</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => setFixedMerchants(p => [...p, ''])} className="rounded-xl border-dashed border-primary/40 text-primary h-10 text-xs uppercase font-black"><Plus className="mr-2 w-4 h-4" /> Add Slot</Button>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {fixedMerchants.map((id, i) => (
                                <div key={i} className="relative group">
                                    <Input 
                                        placeholder={`Enter UID ${i+1}`} 
                                        value={id} 
                                        onChange={e => { const n = [...fixedMerchants]; n[i] = e.target.value; setFixedMerchants(n); }} 
                                        className="h-14 bg-white/5 border-white/10 rounded-2xl pl-12 text-white font-mono text-xs"
                                    />
                                    <Award className="absolute left-4 top-4 w-4 h-4 text-primary/40" />
                                    <button 
                                        onClick={() => setFixedMerchants(p => p.filter((_, idx) => idx !== i))}
                                        className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveMerchants} disabled={isSavingMerchants} className="bg-primary text-black font-black italic rounded-2xl px-12 h-14 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                                {isSavingMerchants ? <Loader2 className="animate-spin" /> : "LOCK MERCHANT SELECTION"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 📰 社区推荐：逻辑完整补全 */}
                <Card className="bg-black/75 backdrop-blur-2xl border border-white/10 rounded-[40px]">
                    <CardHeader className="border-b border-white/5 p-10"><CardTitle className="flex items-center gap-4 text-white uppercase italic font-black"><Newspaper className="text-primary w-6 h-6" /> Lake of Dreams Recommendations</CardTitle></CardHeader>
                    <CardContent className="p-10 grid md:grid-cols-2 gap-16">
                        <div className="space-y-6">
                            <Label className="text-primary uppercase text-[10px] font-black tracking-[0.4em] flex items-center gap-3"><Zap className="w-3 h-3 animate-pulse" /> Medium Feed Nodes (10)</Label>
                            <div className="grid grid-cols-1 gap-3">
                                {mediumPostIds.map((id, i) => (
                                    <Input key={i} placeholder={`Post ID ${i+1}`} value={id} onChange={e => { const n = [...mediumPostIds]; n[i] = e.target.value; setMediumPostIds(n); }} className="h-10 bg-white/5 border-white/10 rounded-xl font-mono text-[10px] text-white/70" />
                                ))}
                            </div>
                        </div>
                        <div className="space-y-6 flex flex-col">
                            <Label className="text-primary uppercase text-[10px] font-black tracking-[0.4em] flex items-center gap-3"><Zap className="w-3 h-3" /> Small Feed Nodes (5)</Label>
                            <div className="grid grid-cols-1 gap-3 flex-1">
                                {smallPostIds.map((id, i) => (
                                    <Input key={i} placeholder={`Post ID ${i+1}`} value={id} onChange={e => { const n = [...smallPostIds]; n[i] = e.target.value; setSmallPostIds(n); }} className="h-10 bg-white/5 border-white/10 rounded-xl font-mono text-[10px] text-white/70" />
                                ))}
                            </div>
                            <div className="pt-12"><Button onClick={handleSaveCommunity} disabled={isSavingCommunity} className="w-full bg-gradient-to-r from-primary to-purple-600 text-black font-black rounded-2xl h-16 uppercase italic tracking-widest shadow-2xl">
                                {isSavingCommunity ? <Loader2 className="animate-spin" /> : "EXECUTE FEED SYNC"}
                            </Button></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 媒体插入 Dialogs 保持不变 */}
            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogContent className="bg-black/95 border-white/10 backdrop-blur-3xl rounded-[32px] text-white">
                    <DialogHeader><DialogTitle className="titanium-title italic uppercase">Insert Image Node</DialogTitle></DialogHeader>
                    <Input placeholder="HTTPS://..." value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl" />
                    <DialogFooter><Button onClick={() => { 
                        setAnnouncementContent(prev => prev + `\n<img src="${mediaUrl}" style="border-radius:24px;margin:20px 0;width:100%;box-shadow:0 10px 30px rgba(0,0,0,0.5)" />\n`);
                        setIsImageDialogOpen(false); setMediaUrl('');
                    }} className="bg-primary text-black font-black uppercase rounded-xl px-10">Inject</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .titanium-title { font-family: 'Playfair Display', serif; letter-spacing: -0.02em; }
                .cyber-scrollbar::-webkit-scrollbar { width: 4px; }
                .cyber-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .cyber-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.3); border-radius: 4px; }
                .cyber-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(168, 85, 247, 0.8); }
            `}</style>
        </div>
    );
}