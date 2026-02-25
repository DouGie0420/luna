'use client';

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, ShieldAlert, X, Sparkles, Loader2, Home, MapPin, AlertCircle, CheckCircle2, Video } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { analyzeProductImage } from '@/ai/flows/analyze-product-image';
import type { PaymentMethod, GlobalSettings } from '@/lib/types';
import { compressImage } from '@/lib/image-compressor';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { LocationPicker } from '@/components/location-picker';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NewProductPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'THB' | 'USDT' | 'RMB'>('THB');
  const [category, setCategory] = useState('');
  const [shippingMethod, setShippingMethod] = useState<'Seller Pays' | 'Buyer Pays'>('Buyer Pays');
  const [shippingCarrier, setShippingCarrier] = useState<'SF' | 'YTO' | null>('SF');
  const [isConsignment, setIsConsignment] = useState(false);
  
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

  useEffect(() => {
      if (!loading && !user) {
          router.replace('/login?redirect=/products/new');
      }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        () => {
          setLocationError("无法获取位置。请在浏览器中开启定位权限。");
        }
      );
    } else {
      setLocationError("此浏览器不支持地理位置功能。");
    }
  }, []);

  const handleLocationConfirm = (locData: any) => {
    setProductLocation(locData);
    setIsLocationPickerOpen(false);
    toast({ title: "位置已验证", description: `${locData.city || '未知城市'} 已成功同步至 Protocol。` });
  };

  const handleAddVideoUrl = () => {
    if (videoUrl) {
      setVideoUrls(prev => [...prev, videoUrl]);
      setVideoUrl('');
      setIsVideoDialogOpen(false);
      toast({ title: "视频已添加" });
    }
  };

  const handleRemoveVideo = (index: number) => {
    setVideoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      if ((imagePreviews.length + fileArray.length) > 9) {
          toast({ variant: 'destructive', title: 'Limit Exceeded', description: 'Maximum 9 images allowed.' });
          return;
      }
      setIsAiLoading(true);
      try {
        const compressionPromises = fileArray.map(file => compressImage(file));
        const compressedPreviews = await Promise.all(compressionPromises);
        setImagePreviews(prev => [...prev, ...compressedPreviews]);
        
        if (isAiAnalysisEnabled && compressedPreviews.length > 0) {
          const result = await analyzeProductImage({ imageDataUri: compressedPreviews[0] });
          setName(result.title);
          setDescription(result.description);
          toast({ title: "AI Analysis Complete" });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAiLoading(false);
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAcceptedMethodsChange = (checked: boolean | string, method: PaymentMethod) => {
    setAcceptedMethods(prev => checked ? [...prev, method] : prev.filter(m => m !== method));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !firestore || !productLocation) return;
    setIsSubmitting(true);

    const newProductData = {
      name,
      description,
      price: Number(price),
      currency,
      acceptedPaymentMethods: acceptedMethods,
      images: imagePreviews,
      videoUrls: videoUrls,
      sellerId: user.uid,
      
      // 🚀 核心修復：把 seller 資料完整包裝存入，防止詳情頁崩潰
      seller: {
        id: user.uid,
        name: profile?.displayName || user.displayName || 'Unknown',
        photoURL: profile?.photoURL || user.photoURL || ''
      },

      location: productLocation,
      category: category || 'Electronics',
      isConsignment,
      shippingMethod,
      createdAt: serverTimestamp(),
      status: isConsignment ? 'under_review' : 'active',
      likes: 0,
      views: 0
    };

    try {
      const docRef = await addDoc(collection(firestore, 'products'), newProductData);
      await updateDoc(doc(firestore, 'users', user.uid), { onSaleCount: increment(1) });
      router.push(`/products/${docRef.id}`);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: '提交失敗', description: '請檢查網絡連接或權限設定。' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !user || settingsLoading) return <div className="p-12 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <>
      <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <BackButton />
          <Button asChild variant="ghost" className="rounded-full bg-lime-400/10 text-lime-400 border border-lime-400/30 h-8">
            <Link href="/"><X className="mr-2 h-4 w-4" />{t('common.close')}</Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {profile?.isPro && isRentalEnabled && (
            <Card className="border-primary/50 bg-primary/5 animate-pulse">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><Home className="text-primary"/> PRO商户专属</CardTitle>
              </CardHeader>
              <CardContent>
                 <Button asChild className="w-full">
                    <Link href="/products/new/rental">发布房屋出租信息</Link>
                 </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-white/5 bg-[#0C0C0E]">
            <CardHeader>
              <CardTitle className="text-3xl font-headline tracking-tighter">发布新商品</CardTitle>
              <CardDescription>填寫詳細信息，將您的商品推向市場。</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-8" onSubmit={handleSubmit}>
                <div className="flex items-start space-x-3 rounded-xl border border-white/5 bg-white/5 p-4">
                    <Checkbox id="ai-analysis" checked={isAiAnalysisEnabled} onCheckedChange={(c) => setIsAiAnalysisEnabled(!!c)} disabled={!isAiFeatureEnabled} />
                    <div className="grid gap-1">
                        <Label htmlFor="ai-analysis" className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /> AI 智能分析</Label>
                        <p className="text-xs text-white/40">勾選此項，上傳圖片後將自動生成標題和描述。</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                      <Label>分类</Label>
                      <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="選擇分類" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="electronics">電子產品</SelectItem>
                              <SelectItem value="fashion">潮流服飾</SelectItem>
                              <SelectItem value="musical-instruments">樂器設備</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="grid gap-2">
                      <Label>商品所在地 Location</Label>
                      <Dialog open={isLocationPickerOpen} onOpenChange={setIsLocationPickerOpen}>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                                "w-full h-10 rounded-md border transition-all duration-500 flex items-center px-3 gap-3 group relative overflow-hidden",
                                !!productLocation 
                                    ? "bg-primary/10 border-primary/40 shadow-[0_0_20px_rgba(211,58,137,0.2)]" 
                                    : "bg-white/5 border-white/10 hover:border-white/20"
                            )}
                          >
                            <div className={cn(
                                "w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors",
                                !!productLocation ? "bg-primary text-black" : "bg-white/10 text-white/40"
                            )}>
                                <MapPin className={cn("w-3.5 h-3.5", !!productLocation && "animate-bounce")} />
                            </div>

                            <div className="flex-1 text-left min-w-0">
                                {!!productLocation ? (
                                    <div className="flex flex-col truncate">
                                        <span className="text-[11px] font-bold text-white truncate leading-tight">
                                            {productLocation.city}, {productLocation.country}
                                        </span>
                                        <span className="text-[8px] font-black text-primary uppercase tracking-[0.15em] leading-none">
                                            Verified Protocol Active
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-white/20">Initialize Location Protocol...</span>
                                )}
                            </div>

                            {!!productLocation ? (
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 animate-in zoom-in" />
                            ) : (
                                <AlertCircle className={cn("w-4 h-4 shrink-0", locationError ? "text-destructive" : "text-white/10")} />
                            )}
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[625px] bg-[#09090B] border-white/10 text-white rounded-[2rem] overflow-hidden">
                          <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="text-2xl font-black italic uppercase text-primary tracking-tighter">Protocol: Set Location</DialogTitle>
                            <DialogDescription className="text-white/40">點擊地圖設定商品確切交易位置。</DialogDescription>
                          </DialogHeader>
                          <div className="p-2 h-[450px]">
                             <LocationPicker 
                                initialCenter={currentUserLocation || { lat: 13.7563, lng: 100.5018 }} 
                                onConfirm={handleLocationConfirm} 
                             />
                          </div>
                        </DialogContent>
                      </Dialog>
                  </div>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="name">商品名稱</Label>
                    <div className="relative">
                        <Input id="name" className="bg-white/5 border-white/10 h-12" placeholder="例如：復古皮革夾克" value={name} onChange={(e) => setName(e.target.value)} required disabled={isAiLoading} />
                        {isAiLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
                    </div>
                </div>
                
                <div className="grid gap-2">
                    <Label>內容 (描述、圖片、視頻)</Label>
                    <Card className="overflow-hidden border-white/10 bg-transparent">
                        <CardContent className="p-0">
                            <Textarea
                                className="border-0 bg-white/5 rounded-none focus-visible:ring-0 p-4 text-sm"
                                placeholder="詳細描述您的商品優點、瑕疵或交易要求..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={10}
                            />
                             <Tabs defaultValue="images" className="p-4 bg-white/[0.02]">
                                <TabsList className="bg-black/40 border-white/5">
                                    <TabsTrigger value="images">圖片</TabsTrigger>
                                    <TabsTrigger value="videos">視頻</TabsTrigger>
                                </TabsList>
                                <TabsContent value="images" className="mt-4">
                                    <div className="grid grid-cols-3 gap-3">
                                        {imagePreviews.map((src, i) => (
                                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                                                <Image src={src} alt="preview" fill className="object-cover" />
                                                <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-5 w-5" onClick={() => removeImage(i)}><X className="h-3 w-3"/></Button>
                                            </div>
                                        ))}
                                        {imagePreviews.length < 9 && (
                                            <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-white/10 hover:border-primary/50 flex flex-col items-center justify-center transition-colors">
                                                <Upload className="h-6 w-6 text-white/20" />
                                                <span className="text-[10px] mt-2 text-white/20">上傳 ({imagePreviews.length}/9)</span>
                                                <Input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" multiple />
                                            </label>
                                        )}
                                    </div>
                                </TabsContent>
                                <TabsContent value="videos" className="mt-4">
                                    <div className="space-y-3">
                                        {videoUrls.map((url, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5 text-xs">
                                                <span className="truncate flex-1">{url}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveVideo(i)}><X className="h-3 w-3"/></Button>
                                            </div>
                                        ))}
                                        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                                          <DialogTrigger asChild>
                                            <Button type="button" variant="outline" className="w-full h-8 text-xs border-dashed">
                                              <Video className="mr-2 h-3 w-3" /> 添加視頻鏈接
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="bg-[#0C0C0E] border-white/10">
                                            <DialogHeader><DialogTitle>添加视频</DialogTitle></DialogHeader>
                                            <Input placeholder="輸入 YouTube 或 TikTok 鏈接" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                                            <DialogFooter><Button onClick={handleAddVideoUrl}>確認添加</Button></DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                
                <Card className="bg-primary/5 border-primary/20 p-6">
                  <div className="grid grid-cols-2 gap-6">
                      <div className="grid gap-2">
                          <Label>價格</Label>
                          <Input type="number" className="bg-black/20 border-white/10" value={price} onChange={e => setPrice(e.target.value)} required />
                      </div>
                      <div className="grid gap-2">
                          <Label>貨幣</Label>
                          <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                              <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="THB">泰銖 (THB)</SelectItem>
                                  <SelectItem value="USDT">USDT (Web3)</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                  </div>

                  <Separator className="my-6 bg-white/5" />

                  <div className="space-y-4">
                    <Label className="text-primary tracking-widest uppercase text-[10px] font-black">支付方式接入</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {profile?.walletAddress && (
                            <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/5 bg-black/20">
                                <Checkbox id="accept-usdt" onCheckedChange={(c) => handleAcceptedMethodsChange(c as boolean, 'USDT')} />
                                <Label htmlFor="accept-usdt" className="text-xs">USDT 鏈上鎖倉</Label>
                            </div>
                        )}
                        {profile?.paymentInfo?.bankAccount && (
                            <div className="flex items-center space-x-3 p-3 rounded-lg border border-white/5 bg-black/20">
                                <Checkbox id="accept-thb" onCheckedChange={(c) => handleAcceptedMethodsChange(c as boolean, 'THB')} />
                                <Label htmlFor="accept-thb" className="text-xs">銀行轉賬 (THB)</Label>
                            </div>
                        )}
                    </div>
                  </div>
                </Card>

                <div className="flex justify-between items-center pt-6">
                    <div className="text-xs text-white/30 flex items-center gap-2">
                        {locationError && !productLocation ? <><AlertCircle className="h-3 w-3 text-destructive" /> {locationError}</> : <><CheckCircle2 className="h-3 w-3 text-primary" /> LUNA Protocol Secured</>}
                    </div>
                    <Button type="submit" size="lg" className="px-12 rounded-full font-black italic uppercase tracking-tighter" disabled={isSubmitting || !name || !productLocation}>
                        {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "發布商品"}
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}