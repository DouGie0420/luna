'use client';

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// 🚀 核心修复：在这里加上了 MessageSquare
import { Upload, X, Sparkles, Loader2, Home, MapPin, AlertCircle, CheckCircle2, Video, Globe, ArrowLeft, ShieldCheck, Coins, QrCode, MessageCircle, MessageSquare, CreditCard, Image as ImageIcon, Box, Lock, Rocket, Send, Phone, Mail } from "lucide-react"
import Link from 'next/link';
import { useTranslation } from '@/hooks/use-translation';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { analyzeProductImage } from '@/ai/flows/analyze-product-image';
import type { PaymentMethod, GlobalSettings } from '@/lib/types';
import { compressImage } from '@/lib/image-compressor';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LocationPicker } from '@/components/location-picker';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APIProvider } from '@vis.gl/react-google-maps';

// 🌌 高级工业化黑曜石样式
const intenseArtStyles = `
  .fluid-bg-container { position: fixed; inset: 0; background: #050508; overflow: hidden; z-index: 0; }
  .cyber-grid {
      position: absolute; inset: 0;
      background-image: linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 50px 50px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
  }
  .fluid-entity { position: absolute; border-radius: 50%; filter: blur(150px); mix-blend-mode: screen; pointer-events: none; }
  .astral-pink { width: 80vw; height: 80vw; top: -10%; left: -20%; background: #ff00ff; opacity: 0.15; }
  .astral-cyan { width: 90vw; height: 90vw; bottom: -20%; right: -20%; background: #00ffff; opacity: 0.1; }
  
  .mono-console { background: rgba(10, 10, 14, 0.9); backdrop-filter: blur(80px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 40px 100px rgba(0,0,0,0.9); }
  
  .prime-input { background: rgba(255, 255, 255, 0.03) !important; border: 1px solid rgba(255, 255, 255, 0.1) !important; color: white !important; transition: all 0.3s ease; }
  .prime-input:focus-within, .prime-input:focus { border-color: #ff00ff !important; background: rgba(255, 255, 255, 0.04) !important; box-shadow: 0 0 20px rgba(255, 0, 255, 0.15) !important; }
  
  .neo-label { text-transform: uppercase; letter-spacing: 0.15em; font-size: 15px; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  
  .ai-btn-off { background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.4); color: #00ffff; }
  .ai-btn-off:hover { border-color: #00ffff; background: rgba(0, 255, 255, 0.1); }
  .ai-btn-on { background: #00ffff; border: 1px solid #00ffff; color: black; box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(255,255,255,0.3); text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
  
  .deploy-action { position: relative; background: #fff; color: #000; overflow: hidden; transition: all 0.4s; }
  .deploy-action::before { content: ''; position: absolute; inset: -150%; background: conic-gradient(from 0deg, transparent, rgba(255, 0, 255, 0.6), transparent 30%); animation: rotate-liquid 3s linear infinite; opacity: 0; transition: opacity 0.3s; }
  .deploy-action:hover::before { opacity: 1; }
  @keyframes rotate-liquid { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

  @keyframes success-pulse { 0% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(0, 255, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0); } }
  .success-halo { animation: success-pulse 2s infinite; }

  /* 🌟 Google Maps 下拉框全局重写，强制点击权限 */
  .pac-container {
      pointer-events: auto !important; 
      background-color: #0A0A0C !important;
      border: 1px solid rgba(0, 255, 255, 0.3) !important;
      border-radius: 16px !important;
      box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(0, 255, 255, 0.1) !important;
      margin-top: 8px !important;
      padding: 8px !important;
      z-index: 999999 !important;
  }
  .pac-item {
      border-top: none !important;
      border-bottom: 1px solid rgba(255,255,255,0.05) !important;
      padding: 14px 16px !important;
      color: rgba(255,255,255,0.5) !important;
      cursor: pointer !important;
      border-radius: 8px !important;
      transition: all 0.2s ease !important;
  }
  .pac-item:hover, .pac-item.pac-item-selected { background-color: rgba(0, 255, 255, 0.1) !important; }
  .pac-item-query { color: #ffffff !important; font-size: 15px !important; font-weight: 800 !important; margin-right: 6px !important; }
  .pac-matched { color: #00ffff !important; }
  .pac-icon { display: none !important; }
  .pac-item:last-child { border-bottom: none !important; }
`;

const MAP_LIBS: ("places" | "geometry" | "drawing" | "visualization" | "marker" | "geocoding")[] = ['places', 'geocoding'];

// 🚀 定义多渠道类型
type ContactMethod = 'Telegram' | 'LINE' | 'Wechat' | 'Phone' | 'Email';

export default function NewProductPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'THB' | 'USDT'>('THB');
  const [category, setCategory] = useState<string>('Streetwear'); 
  const [shippingMethod, setShippingMethod] = useState<'Seller Pays' | 'Buyer Pays'>('Buyer Pays');
  const [shippingCarrier, setShippingCarrier] = useState<'SF' | 'YTO' | null>('SF');
  const [shippingCost, setShippingCost] = useState('');
  const [isConsignment, setIsConsignment] = useState(false);
  
  // 🚀 多渠道联系方式状态
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Telegram');
  const [consignmentContact, setConsignmentContact] = useState('');
  const [isConsignmentDialogOpen, setIsConsignmentDialogOpen] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newProductId, setNewProductId] = useState('');

  const [isAiAnalysisEnabled, setIsAiAnalysisEnabled] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedMethods, setAcceptedMethods] = useState<PaymentMethod[]>([]);
  const [currentUserLocation, setCurrentUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [productLocation, setProductLocation] = useState<any | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);

  const settingsRef = useMemo(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings, loading: settingsLoading } = useDoc<GlobalSettings>(settingsRef);
  const isAiFeatureEnabled = globalSettings?.isAiAnalysisEnabled ?? false;
  const isRentalEnabled = globalSettings?.isRentalEnabled ?? false;

  useEffect(() => { if (!loading && !user) router.replace('/login?redirect=/products/new'); }, [user, loading, router]);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCurrentUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setLocationError("无法获取定位权限。")
      );
    }
  }, []);

  const handleLocationConfirm = (locData: any) => {
    setProductLocation(locData);
    setIsLocationPickerOpen(false);
    toast({ title: "发货定位已锁定", description: `${locData.address} 已记录。` });
  };

  const handleAddVideoUrl = () => {
    if (videoUrl) {
      setVideoUrls(prev => [...prev, videoUrl]);
      setVideoUrl('');
      setIsVideoDialogOpen(false);
      toast({ title: "视频链接已添加" });
    }
  };

  const handleRemoveVideo = (index: number) => {
    setVideoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAcceptedMethodsChange = (checked: boolean, method: PaymentMethod) => {
    setAcceptedMethods(prev => checked ? [...prev, method] : prev.filter(m => m !== method));
  };

  const handleConsignmentClick = () => {
      if (isConsignment) {
          setIsConsignment(false);
          setConsignmentContact('');
      } else {
          setIsConsignmentDialogOpen(true);
      }
  };

  const confirmConsignment = () => {
      if (!consignmentContact.trim()) {
          toast({ variant: 'destructive', title: "未填写通讯方式", description: "必须填写准确的账号/号码，以便官方审核通过后指引发货。" });
          return;
      }
      setIsConsignment(true);
      setIsConsignmentDialogOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    
    if ((imagePreviews.length + fileArray.length) > 9) {
      toast({ variant: 'destructive', title: '最多允许上传 9 张图片' });
      e.target.value = ''; 
      return;
    }
    
    setIsAiLoading(true);
    try {
      const compressedPreviews = await Promise.all(fileArray.map(f => compressImage(f)));
      setImagePreviews(prev => [...prev, ...compressedPreviews]);
      if (isAiAnalysisEnabled && compressedPreviews.length > 0) {
        const result = await analyzeProductImage({ imageDataUri: compressedPreviews[0] });
        setName(result.title);
        setDescription(result.description);
        toast({ title: "AI 分析完毕" });
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsAiLoading(false); 
      e.target.value = ''; 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !firestore || !productLocation) return;
    setIsSubmitting(true);
    
    // 🚀 自动拼接并格式化联系方式给后台
    let finalContact = consignmentContact.trim();
    if (contactMethod === 'Telegram' && !finalContact.startsWith('@')) {
        finalContact = '@' + finalContact;
    } else if (contactMethod === 'Phone' && !finalContact.startsWith('+')) {
        finalContact = '+' + finalContact;
    }
    const formattedConsignmentInfo = isConsignment ? `[${contactMethod}] ${finalContact}` : null;

    const newProductData = {
      name, description, price: Number(price), currency, images: imagePreviews, videoUrls, sellerId: user.uid,
      acceptedPaymentMethods: acceptedMethods,
      usdtReceivingAddress: acceptedMethods.includes('USDT') ? (profile?.walletAddress || '') : null, 
      shippingCost: shippingMethod === 'Buyer Pays' ? (Number(shippingCost) || 0) : 0, 
      consignmentContact: formattedConsignmentInfo, // 🚀 写入拼接好的美观格式
      seller: { id: user.uid, name: profile?.displayName || user.displayName || 'Unknown', photoURL: profile?.photoURL || user.photoURL || '' },
      location: productLocation, category: category || 'Streetwear', isConsignment, shippingMethod, createdAt: serverTimestamp(),
      status: isConsignment ? 'under_review' : 'active', likes: 0, views: 0
    };

    try {
      const docRef = await addDoc(collection(firestore, 'products'), newProductData);
      await updateDoc(doc(firestore, 'users', user.uid), { onSaleCount: increment(1) });
      
      setNewProductId(docRef.id);
      setShowSuccessModal(true);
      
    } catch (err) { toast({ variant: 'destructive', title: '发布失败，请重试' }); } finally { setIsSubmitting(false); }
  };

  const formatWalletAddress = (address: string) => {
    if (!address || address.length < 8) return address;
    const start = address.substring(0, 4);
    const middle = address.substring(4, address.length - 4);
    const end = address.substring(address.length - 4);
    
    return (
        <>
            <span className="text-[#ff00ff] font-black">{start}</span>
            <span className="text-white/40">{middle}</span>
            <span className="text-[#ff00ff] font-black">{end}</span>
        </>
    );
  };

  if (loading || !user || settingsLoading) return <div className="min-h-screen flex items-center justify-center bg-[#050508]"><Loader2 className="animate-spin text-[#ff00ff]" /></div>;

  return (
    <div className="min-h-screen relative text-white selection:bg-[#ff00ff]/30 pb-32 font-sans">
      <style dangerouslySetInnerHTML={{ __html: intenseArtStyles }} />
      <div className="fluid-bg-container pointer-events-none">
          <div className="cyber-grid" /><div className="fluid-entity astral-pink" /><div className="fluid-entity astral-cyan" />
      </div>

      <div className="fixed top-0 left-0 w-full z-50 bg-[#050508]/80 backdrop-blur-3xl border-b border-white/5">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <button onClick={() => router.back()} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black italic uppercase tracking-[0.2em] text-white shadow-inner hover:bg-white/10 transition-all">
             [ BACK ]
          </button>
          
          <div className="text-sm font-black tracking-[0.4em] text-white/50 uppercase hidden sm:block">DEPLOY ASSET</div>
          
          <Link href="/">
             <button className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black italic uppercase tracking-[0.2em] text-white shadow-inner hover:bg-white/10 transition-all">
                [ HOME ]
             </button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-32 pb-12 relative z-10">
        <div className="max-w-4xl mx-auto space-y-10">
          
          <div className="text-center mb-8">
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-3">发布新商品</h1>
          </div>

          {profile?.isPro && isRentalEnabled && (
            <div className="w-full rounded-[1.5rem] p-[1px] bg-gradient-to-r from-cyan-500/50 to-transparent shadow-2xl">
                <div className="bg-[#050508] rounded-[1.5rem] p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20"><Home size={24} /></div>
                        <div className="text-left"><h3 className="text-lg font-bold text-white tracking-wide">PRO 商户房屋租赁</h3><p className="text-white/50 text-xs mt-1 font-medium">专属通道：发布并管理您的优质房源信息</p></div>
                    </div>
                    <Button asChild className="rounded-xl bg-cyan-500 text-black font-bold px-8 hover:bg-cyan-400 w-full sm:w-auto h-12 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                        <Link href="/products/new/rental">进入房源发布</Link>
                    </Button>
                </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            <Card className="mono-console rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-0">

                    {/* --- 模块 1：基础信息登记 --- */}
                    <div className="p-8 sm:p-12 space-y-10 border-b border-white/5">
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
                            <span className="neo-label mb-0 text-cyan-400"><Box size={22} className="text-cyan-400/50" /> 基础信息登记</span>
                            
                            {isAiFeatureEnabled && (
                                <button 
                                    type="button" 
                                    onClick={() => setIsAiAnalysisEnabled(!isAiAnalysisEnabled)}
                                    className={cn(
                                        "flex items-center justify-center gap-3 px-8 py-4 rounded-[1.2rem] font-black text-sm tracking-widest uppercase transition-all duration-300 w-full sm:w-auto",
                                        isAiAnalysisEnabled ? "ai-btn-on" : "ai-btn-off"
                                    )}
                                >
                                    <Sparkles size={20} className={cn(isAiAnalysisEnabled && "animate-pulse")} />
                                    {isAiAnalysisEnabled ? "AI 智能提取 [ 已激活 ]" : "开启 AI 智能提取"}
                                </button>
                            )}
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-end">
                                <Label className="text-sm font-bold text-white/80 ml-2">商品标题</Label>
                                <span className="text-xs font-mono text-white/40">{name.length}/100</span>
                            </div>
                            <Input className="prime-input h-16 text-2xl font-bold px-6 rounded-[1.2rem]" placeholder="输入清晰的商品名称..." value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required disabled={isAiLoading} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-white/80 ml-2">商品分类</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="prime-input h-16 w-full text-base font-bold px-6 rounded-[1.2rem]" translate="no">
                                        <SelectValue placeholder="请选择商品所属分类" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#121214] border-white/10 text-white rounded-xl shadow-2xl" translate="no">
                                        <SelectItem value="Streetwear" className="py-4 font-bold text-sm cursor-pointer">潮流服饰 — Streetwear</SelectItem>
                                        <SelectItem value="Sneakers" className="py-4 font-bold text-sm cursor-pointer">球鞋 — Sneakers</SelectItem>
                                        <SelectItem value="Luxury" className="py-4 font-bold text-sm cursor-pointer">奢侈品 — Luxury</SelectItem>
                                        <SelectItem value="Electronics" className="py-4 font-bold text-sm cursor-pointer">电子产品 — Electronics</SelectItem>
                                        <SelectItem value="Gaming" className="py-4 font-bold text-sm cursor-pointer">游戏娱乐 — Gaming</SelectItem>
                                        <SelectItem value="Collectibles" className="py-4 font-bold text-sm cursor-pointer">收藏品 — Collectibles</SelectItem>
                                        <SelectItem value="Digital Assets" className="py-4 font-bold text-sm cursor-pointer">数字资产 — Digital Assets</SelectItem>
                                        <SelectItem value="Art & Design" className="py-4 font-bold text-sm cursor-pointer">艺术设计 — Art & Design</SelectItem>
                                        <SelectItem value="Lifestyle" className="py-4 font-bold text-sm cursor-pointer">生活方式 — Lifestyle</SelectItem>
                                        <SelectItem value="Beauty" className="py-4 font-bold text-sm cursor-pointer">美妆个护 — Beauty</SelectItem>
                                        <SelectItem value="Sports & Outdoor" className="py-4 font-bold text-sm cursor-pointer">运动户外 — Sports & Outdoor</SelectItem>
                                        <SelectItem value="Auto" className="py-4 font-bold text-sm cursor-pointer">汽车相关 — Auto</SelectItem>
                                        <SelectItem value="Pet Supplies" className="py-4 font-bold text-sm cursor-pointer">宠物周边 — Pet Supplies</SelectItem>
                                        <SelectItem value="Free & Trade" className="py-4 font-bold text-sm cursor-pointer">免费交换 — Free & Trade</SelectItem>
                                        <SelectItem value="Other" className="py-4 font-bold text-sm cursor-pointer text-cyan-400 focus:text-cyan-300">其它 — Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-white/80 ml-2">发货定位</Label>
                                <Dialog open={isLocationPickerOpen} onOpenChange={setIsLocationPickerOpen}>
                                    <DialogTrigger asChild>
                                        <button type="button" className={cn("prime-input w-full h-16 flex items-center px-6 gap-4 rounded-[1.2rem]", !!productLocation ? "border-cyan-400/50 bg-cyan-400/10 text-white" : "text-white/40")}>
                                            <MapPin size={20} className={!!productLocation ? "text-cyan-400" : "text-white/40"} />
                                            <span className="flex-1 text-left text-base font-bold truncate">
                                                {!!productLocation ? `${productLocation.city}, ${productLocation.country}` : "设定商品所在城市"}
                                            </span>
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent 
                                        className="max-w-4xl bg-[#0A0A0C] border-white/10 rounded-[2rem] p-0 overflow-hidden shadow-2xl"
                                        onInteractOutside={(e) => {
                                            const target = e.target as Element;
                                            if (target.closest('.pac-container')) {
                                                e.preventDefault();
                                            }
                                        }}
                                    >
                                        <DialogHeader className="sr-only"><DialogTitle>选择发货位置</DialogTitle></DialogHeader>
                                        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} libraries={MAP_LIBS}>
                                            <div className="h-[650px] w-full"><LocationPicker initialCenter={currentUserLocation || { lat: 13.7563, lng: 100.5018 }} onConfirm={handleLocationConfirm} /></div>
                                        </APIProvider>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>

                    {/* --- 模块 2：媒体资源 --- */}
                    <div className="p-8 sm:p-12 space-y-8 border-b border-white/5 bg-white/[0.01]">
                        <span className="neo-label text-white"><ImageIcon size={22} className="text-white/40" /> 媒体资料库</span>
                        <Tabs defaultValue="images" className="w-full">
                            <TabsList className="bg-black/50 border border-white/10 p-1.5 rounded-xl h-14 inline-flex mb-8 shadow-inner">
                                <TabsTrigger value="images" className="rounded-lg px-8 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-black transition-all">本地图片</TabsTrigger>
                                <TabsTrigger value="videos" className="rounded-lg px-8 text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-black transition-all">外部视频</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="images" className="mt-0">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {imagePreviews.map((src, i) => (
                                        <div key={i} className="group relative aspect-square rounded-[1.2rem] overflow-hidden border border-white/10 bg-black/50">
                                            <Image src={src} alt="preview" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <button type="button" className="h-10 w-10 rounded-full bg-red-500/90 text-white flex items-center justify-center hover:scale-110 transition-transform" onClick={() => removeImage(i)}><X size={18}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {imagePreviews.length < 9 && (
                                        <label className="cursor-pointer aspect-square rounded-[1.2rem] border-2 border-dashed border-white/20 hover:border-[#ff00ff]/50 hover:bg-[#ff00ff]/5 flex flex-col items-center justify-center transition-all group">
                                            <Upload className="h-8 w-8 text-white/40 group-hover:text-[#ff00ff] transition-all" />
                                            <span className="text-[10px] mt-2 font-bold text-white/40 group-hover:text-[#ff00ff]">{imagePreviews.length}/9 MAX</span>
                                            <Input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
                                        </label>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="videos">
                                <div className="space-y-3 max-w-2xl">
                                    {videoUrls.map((url, i) => (
                                        <div key={i} className="flex items-center justify-between px-5 h-14 rounded-xl bg-white/5 border border-white/10">
                                            <span className="truncate text-sm font-medium text-white/70">{url}</span>
                                            <button type="button" className="text-white/40 hover:text-red-500 transition-colors" onClick={() => handleRemoveVideo(i)}><X size={18}/></button>
                                        </div>
                                    ))}
                                    {videoUrls.length < 3 && (
                                        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                                            <DialogTrigger asChild>
                                                <button type="button" className="w-full h-14 rounded-xl border-2 border-dashed border-white/20 hover:bg-white/5 hover:border-white/40 flex items-center justify-center gap-2 text-sm font-bold text-white/60 transition-all">
                                                    <Video size={18} /> 添加 YouTube / TikTok 链接
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-[#121214] border-white/10 text-white rounded-2xl p-8 shadow-2xl">
                                                <DialogHeader><DialogTitle className="text-xl font-bold mb-4">添加视频链接</DialogTitle></DialogHeader>
                                                <Input className="prime-input h-14 mb-4 text-sm px-4 rounded-xl" placeholder="输入视频播放 URL" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                                                <Button type="button" className="w-full h-14 bg-white text-black font-bold rounded-xl text-base hover:bg-gray-200 transition-colors" onClick={handleAddVideoUrl}>确认添加</Button>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* --- 模块 3：图文详情描述 --- */}
                    <div className="p-8 sm:p-12 space-y-6 border-b border-white/5">
                        <div className="flex justify-between items-end mb-2">
                            <Label className="text-sm font-bold text-white/80 ml-2">详细描述 (Description)</Label>
                            <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-1 rounded-md">{description.length} / 5000</span>
                        </div>
                        <Textarea className="prime-input p-8 text-lg font-medium min-h-[400px] resize-y rounded-[1.5rem] leading-relaxed" placeholder="详细描述商品的规格、成色、使用痕迹、交易偏好等核心信息，越详细越容易获得买家信任..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} />
                    </div>

                    {/* --- 模块 4：结算与物流配置 --- */}
                    <div className="p-8 sm:p-12 bg-black/40 space-y-12">
                        <span className="neo-label text-[#ff00ff]"><Coins size={22} className="text-[#ff00ff]/50" /> 结算与协议配置</span>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-white/80 ml-2">定价与货币</Label>
                                    <div className="flex gap-4 items-center">
                                        <Input type="number" className="prime-input h-16 text-3xl font-bold px-6 flex-1 rounded-[1.2rem]" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} required />
                                        <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                                            <SelectTrigger className="prime-input w-36 h-16 font-bold text-base rounded-[1.2rem]" translate="no"><SelectValue /></SelectTrigger>
                                            <SelectContent className="bg-[#121214] border-white/10 text-white rounded-xl shadow-2xl" translate="no">
                                                <SelectItem value="THB" className="py-3 font-bold text-sm">THB ฿</SelectItem>
                                                <SelectItem value="USDT" className="py-3 font-bold text-sm">USDT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-white/80 ml-2">收款通道 (Payment Gateways)</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div 
                                          onClick={() => { if(profile?.walletAddress) handleAcceptedMethodsChange(!acceptedMethods.includes('USDT'), 'USDT') }} 
                                          className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3", !profile?.walletAddress ? "opacity-50 border-white/5 bg-black/40 cursor-not-allowed" : acceptedMethods.includes('USDT') ? "border-[#ff00ff] bg-[#ff00ff]/10 shadow-[0_0_20px_rgba(255,0,255,0.1)]" : "border-white/10 bg-white/[0.02] hover:border-white/30 cursor-pointer")}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-[#ff00ff] border border-white/5"><Coins size={18} /></div>
                                                {profile?.walletAddress ? (
                                                    <div className={cn("h-5 w-5 rounded-md border flex items-center justify-center transition-all", acceptedMethods.includes('USDT') ? "bg-[#ff00ff] border-[#ff00ff]" : "border-white/20")}>
                                                        {acceptedMethods.includes('USDT') && <CheckCircle2 size={14} className="text-white" />}
                                                    </div>
                                                ) : <Lock size={16} className="text-white/20"/>}
                                            </div>
                                            <div><p className="text-base font-bold text-white tracking-wide">USDT</p><p className="text-[10px] text-white/40 mt-0.5 uppercase font-mono">Web3 Wallet</p></div>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-white/5 bg-black/40 opacity-40 flex flex-col gap-3 cursor-not-allowed">
                                            <div className="flex justify-between items-center">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5"><QrCode size={18} /></div>
                                                <Lock size={16} className="text-white/20"/>
                                            </div>
                                            <div><p className="text-base font-bold text-white tracking-wide">PromptPay</p><p className="text-[10px] text-white/40 mt-0.5 uppercase font-mono">Locked Setup</p></div>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-white/5 bg-black/40 opacity-40 flex flex-col gap-3 cursor-not-allowed">
                                            <div className="flex justify-between items-center">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5"><MessageCircle size={18} /></div>
                                                <Lock size={16} className="text-white/20"/>
                                            </div>
                                            <div><p className="text-base font-bold text-white tracking-wide">WechatPay</p><p className="text-[10px] text-white/40 mt-0.5 uppercase font-mono">Locked Setup</p></div>
                                        </div>

                                        <div className="p-4 rounded-2xl border border-white/5 bg-black/40 opacity-40 flex flex-col gap-3 cursor-not-allowed">
                                            <div className="flex justify-between items-center">
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/5"><CreditCard size={18} /></div>
                                                <Lock size={16} className="text-white/20"/>
                                            </div>
                                            <div><p className="text-base font-bold text-white tracking-wide">Alipay</p><p className="text-[10px] text-white/40 mt-0.5 uppercase font-mono">Locked Setup</p></div>
                                        </div>
                                    </div>

                                    {acceptedMethods.includes('USDT') && profile?.walletAddress && (
                                        <div className="mt-4 p-5 rounded-[1.2rem] bg-[#ff00ff]/5 border border-[#ff00ff]/20 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-xs font-bold text-[#ff00ff] uppercase tracking-widest flex items-center gap-2">
                                                <Lock size={14} /> USDT 收款地址已锚定
                                            </Label>
                                            <div className="prime-input min-h-[56px] h-auto text-sm font-mono px-4 py-3.5 rounded-xl text-white/80 bg-black/60 cursor-not-allowed break-all leading-relaxed">
                                                {formatWalletAddress(profile.walletAddress)}
                                            </div>
                                            <p className="text-[10px] text-white/40 leading-relaxed font-medium">此地址为系统绑定的专属收款地址，发布后将写入底层不可更改。如需变动，请前往「个人中心」提交人工申请。</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-white/80 ml-2">物流承担</Label>
                                    <div className="flex flex-col gap-3">
                                        <div onClick={() => { setShippingMethod('Buyer Pays'); setShippingCost(''); }} className={cn("p-5 rounded-[1.2rem] border flex items-center justify-between cursor-pointer transition-all", shippingMethod === 'Buyer Pays' ? "bg-white/10 border-white/40" : "bg-black/40 border-white/10 hover:border-white/20")}>
                                            <div className="flex flex-col"><span className="font-bold text-base">买家承担运费</span></div>
                                            <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all", shippingMethod === 'Buyer Pays' ? "border-white" : "border-white/40")}>
                                                {shippingMethod === 'Buyer Pays' && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                        
                                        {shippingMethod === 'Buyer Pays' && (
                                            <div className="p-5 rounded-[1.2rem] bg-cyan-500/5 border border-cyan-500/20 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 ml-4">
                                                <Label className="text-xs font-bold text-cyan-400 uppercase tracking-widest">设定运费价格 ({currency})</Label>
                                                <Input type="number" className="prime-input h-14 text-xl font-bold px-4 rounded-xl" placeholder="0.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)} required={shippingMethod === 'Buyer Pays'} />
                                            </div>
                                        )}

                                        <div onClick={() => setShippingMethod('Seller Pays')} className={cn("p-5 rounded-[1.2rem] border flex items-center justify-between cursor-pointer transition-all", shippingMethod === 'Seller Pays' ? "bg-white/10 border-white/40" : "bg-black/40 border-white/10 hover:border-white/20")}>
                                            <div className="flex flex-col"><span className="font-bold text-base">卖家包邮</span><span className="text-xs text-white/50 mt-1 font-medium">商品价格已包含运费</span></div>
                                            <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all", shippingMethod === 'Seller Pays' ? "border-white" : "border-white/40")}>
                                                {shippingMethod === 'Seller Pays' && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-sm font-bold text-white/80 ml-2">寄卖模式</Label>
                                    
                                    <div 
                                      onClick={handleConsignmentClick} 
                                      className={cn("p-5 h-[84px] rounded-[1.2rem] border flex items-center justify-between cursor-pointer transition-all", isConsignment ? "bg-[#ff00ff]/10 border-[#ff00ff]/50" : "bg-black/40 border-white/10 hover:border-white/20")}
                                    >
                                        <div className="flex items-center gap-4">
                                            <ShieldCheck size={24} className={isConsignment ? "text-[#ff00ff]" : "text-white/40"} />
                                            <div className="flex flex-col"><span className="font-bold text-base">申请官方寄卖</span><span className="text-xs text-white/50 mt-1">商品先寄往仓库进行审查</span></div>
                                        </div>
                                        <div className={cn("h-5 w-5 rounded-md border flex items-center justify-center transition-all", isConsignment ? "bg-[#ff00ff] border-[#ff00ff]" : "border-white/30")}>
                                            {isConsignment && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                    </div>
                                    
                                    {/* 🚀 全新设计的流体毛玻璃多渠道寄卖审查弹窗 */}
                                    <Dialog open={isConsignmentDialogOpen} onOpenChange={setIsConsignmentDialogOpen}>
                                        <DialogContent className="max-w-[480px] bg-[#050508]/40 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden">
                                            
                                            {/* 内部流体背景装饰 */}
                                            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#ff00ff]/20 blur-[100px] rounded-full pointer-events-none" />
                                            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#00ffff]/10 blur-[100px] rounded-full pointer-events-none" />

                                            <div className="relative z-10">
                                                <DialogHeader className="mb-6">
                                                    <DialogTitle className="text-2xl font-black text-white flex items-center gap-3 mb-3">
                                                        <ShieldCheck className="text-[#ff00ff] h-8 w-8" /> 官方寄卖审查协议
                                                    </DialogTitle>
                                                    <DialogDescription className="text-white/60 text-sm leading-relaxed font-medium">
                                                        选择官方寄卖后，请留下您实时的联络方式。官方在后台审核通过后，将通过此渠道与您取得联系，指引您将实物发往指定的安全查验仓。
                                                    </DialogDescription>
                                                </DialogHeader>
                                                
                                                <div className="mt-8 space-y-8">
                                                    <div className="space-y-4">
                                                        <Label className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">Select Contact Channel</Label>
                                                        
                                                        {/* 🚀 5项全渠道动态选择网格 */}
                                                        <div className="flex flex-wrap gap-3">
                                                            {[
                                                                { id: 'Telegram', icon: Send },
                                                                { id: 'LINE', icon: MessageCircle },
                                                                { id: 'Wechat', icon: MessageSquare },
                                                                { id: 'Phone', icon: Phone },
                                                                { id: 'Email', icon: Mail }
                                                            ].map(method => (
                                                                <button
                                                                    key={method.id}
                                                                    type="button"
                                                                    onClick={() => setContactMethod(method.id as ContactMethod)}
                                                                    className={cn(
                                                                        "flex flex-col items-center justify-center gap-2 h-[88px] flex-1 min-w-[28%] rounded-[1.2rem] border transition-all duration-300 relative overflow-hidden",
                                                                        contactMethod === method.id 
                                                                            ? "bg-white/10 border-[#ff00ff]/80 text-white shadow-[0_0_30px_rgba(255,0,255,0.2)] scale-105 z-10" 
                                                                            : "bg-black/40 border-white/5 text-white/30 hover:bg-white/5 hover:text-white/80 hover:border-white/20"
                                                                    )}
                                                                >
                                                                    {contactMethod === method.id && <div className="absolute inset-0 bg-gradient-to-b from-[#ff00ff]/20 to-transparent opacity-50 pointer-events-none" />}
                                                                    <method.icon size={22} className={contactMethod === method.id ? "text-[#ff00ff]" : ""} />
                                                                    <span className="text-[11px] font-black uppercase tracking-wider">{method.id}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <Label className="text-[11px] font-black text-[#ff00ff] tracking-[0.2em] uppercase">
                                                            {contactMethod === 'Telegram' ? 'Your Telegram ID' : 
                                                             contactMethod === 'LINE' ? 'Your LINE ID' : 
                                                             contactMethod === 'Wechat' ? 'Your WeChat ID' :
                                                             contactMethod === 'Email' ? 'Your Email Address' :
                                                             'Your Phone Number'}
                                                        </Label>
                                                        <div className="relative">
                                                            {/* 动态前缀图标适配 */}
                                                            {contactMethod === 'Telegram' && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 font-black text-lg">@</span>}
                                                            {contactMethod === 'Phone' && <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 font-black text-lg">+</span>}
                                                            
                                                            <Input 
                                                                className={cn(
                                                                    "prime-input h-16 text-lg font-bold rounded-[1.2rem] border-white/10 bg-black/40 backdrop-blur-md shadow-inner", 
                                                                    contactMethod === 'Telegram' ? "pl-12" : 
                                                                    contactMethod === 'Phone' ? "pl-11" : "px-6"
                                                                )} 
                                                                placeholder={
                                                                    contactMethod === 'Telegram' ? 'Username' : 
                                                                    contactMethod === 'LINE' ? 'LINE_ID' : 
                                                                    contactMethod === 'Wechat' ? 'Wechat_ID' :
                                                                    contactMethod === 'Email' ? 'admin@example.com' :
                                                                    '66 88 888 8888'
                                                                } 
                                                                value={consignmentContact} 
                                                                onChange={(e) => setConsignmentContact(e.target.value)} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-10 flex justify-end gap-4">
                                                    <Button type="button" variant="ghost" onClick={() => setIsConsignmentDialogOpen(false)} className="h-14 rounded-xl text-white/50 hover:text-white hover:bg-white/5 px-8 font-bold uppercase tracking-widest text-xs">取消</Button>
                                                    <Button type="button" onClick={confirmConsignment} className="h-14 rounded-xl bg-white text-black hover:bg-gray-200 font-black px-8 shadow-[0_0_30px_rgba(255,255,255,0.2)] uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95">确认并锁定授权</Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                </div>
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                <div className="flex items-center gap-3 text-sm font-bold text-white/50 tracking-widest uppercase">
                   {locationError && !productLocation ? <><AlertCircle className="text-red-500 h-5 w-5" /> <span className="text-red-400">Position Missing</span></> : <><CheckCircle2 className="text-[#ff00ff] h-5 w-5" /> System Ready</>}
                </div>
                <Button type="submit" className="deploy-action w-full sm:w-auto px-20 h-20 rounded-[1.5rem] shadow-[0_20px_40px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 border border-white/20" disabled={isSubmitting || !name || !productLocation}>
                    <span className="relative z-10 font-black uppercase tracking-[0.1em] text-lg flex items-center gap-3">
                        {isSubmitting ? <><Loader2 className="animate-spin h-6 w-6" /> Deploying...</> : <><Box size={24} /> 确认发布商品</>}
                    </span>
                </Button>
            </div>

          </form>
        </div>
      </div>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="max-w-md bg-[#0A0A0C]/95 backdrop-blur-3xl border-white/10 rounded-[2.5rem] p-12 shadow-2xl flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full bg-cyan-400/10 border-2 border-cyan-400 flex items-center justify-center mb-8 success-halo">
                  <Rocket size={48} className="text-cyan-400" />
              </div>
              <DialogTitle className="text-3xl font-black text-white uppercase tracking-widest mb-3">
                  Deploy Success
              </DialogTitle>
              <DialogDescription className="text-white/50 text-sm font-medium mb-10 leading-relaxed">
                  您的商品已成功发布并同步至全球检索网络。
              </DialogDescription>
              <div className="flex flex-col w-full gap-4">
                  <Button onClick={() => router.push(`/products/${newProductId}`)} className="w-full h-16 rounded-[1.2rem] bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all hover:scale-105">
                      VIEW ARTIFACT
                  </Button>
                  <Button onClick={() => router.push('/')} variant="ghost" className="w-full h-16 rounded-[1.2rem] text-white/50 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-sm border border-white/10 transition-all">
                      RETURN TO HUB
                  </Button>
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}