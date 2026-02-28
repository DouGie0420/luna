'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, ShieldAlert, X, Loader2, MapPin, Video, Sparkles, ArrowLeft, Send, Home } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Checkbox } from '@/components/ui/checkbox';
import { analyzeProductImage } from '@/ai/flows/analyze-product-image';
import { compressImage } from '@/lib/image-compressor';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// 🚀 物理级视觉定义：Somnia Mesh (梦境之湖)
const somniaArtStyles = `
  .somnia-bg-canvas {
    position: absolute; inset: 0;
    background: radial-gradient(at 20% 30%, #1e1b4b 0px, transparent 50%),
                radial-gradient(at 80% 20%, #312e81 0px, transparent 50%),
                radial-gradient(at 50% 80%, #581c87 0px, transparent 50%);
    filter: blur(100px); opacity: 0.8;
    animation: somnia-drift 25s infinite alternate ease-in-out;
  }
  @keyframes somnia-drift { from { transform: scale(1); } to { transform: scale(1.2) rotate(3deg); } }
  .noise-overlay {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.15; mix-blend-mode: overlay; pointer-events: none;
  }
`;

export default function NewBbsPostPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [isImageURLDialogOpen, setIsImageURLDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const [isAiAnalysisEnabled, setIsAiAnalysisEnabled] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
      if (!loading && !user) {
          router.replace('/login?redirect=/bbs/new');
      }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Could not get location. Please enable location permissions in your browser.");
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Could not get location. Please enable location permissions to post.",
            duration: 10000,
          });
        }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      toast({
        variant: "destructive",
        title: "Location Error",
        description: "Geolocation is not supported by this browser.",
      });
    }
  }, [toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if ((imagePreviews.length + files.length) > 9) {
          toast({ variant: 'destructive', title: 'Maximum images reached', description: 'You can upload a maximum of 9 images.' });
          e.target.value = '';
          return;
      }
      
      const fileArray = Array.from(files);
      setIsAiLoading(true);

      try {
        const compressionPromises = fileArray.map(file => compressImage(file));
        const newPreviews = await Promise.all(compressionPromises);
        
        setImagePreviews(prev => [...prev, ...newPreviews]);
        
        if (isAiAnalysisEnabled && newPreviews.length > 0) {
          const imageDataUri = newPreviews[0];
          try {
            const result = await analyzeProductImage({ imageDataUri });
            setTitle(result.title);
            setContent(result.description);
            toast({
                title: "AI Analysis Complete",
                description: "Title and content have been generated.",
            });
          } catch (error) {
            console.error("AI analysis failed:", error);
            toast({
              variant: "destructive",
              title: "AI Analysis Failed",
              description: "Could not analyze the image. Please fill in the details manually.",
            });
          }
        }
      } catch (error: any) {
        console.error("Error processing files: ", error);
        toast({
          variant: "destructive",
          title: "Image Processing Failed",
          description: error.message || "There was an error compressing or reading the files.",
        });
      } finally {
        setIsAiLoading(false);
      }
    }
    e.target.value = ''; 
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAddVideoUrl = () => {
    if (videoUrl) {
        let embedUrl = videoUrl;
        const youtubeMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (youtubeMatch && youtubeMatch[1]) {
            embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
        }
        
        if (embedUrl) {
            setVideoUrls(prev => [...prev, embedUrl]);
            setVideoUrl('');
            setIsVideoDialogOpen(false);
        } else {
            toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please enter a valid YouTube or TikTok share link.' });
        }
    }
  };
  
  const handleRemoveVideo = (indexToRemove: number) => {
    setVideoUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !firestore) {
      toast({ variant: 'destructive', title: 'Please login to create a post.'});
      return;
    }
     if (!location) {
      toast({ variant: 'destructive', title: 'Location Required', description: 'Waiting for location data. Please ensure location permissions are enabled.'});
      return;
    }
    setIsSubmitting(true);

    const authorData: User = {
      id: user.uid,
      name: profile.displayName || user.displayName || 'Anonymous',
      avatarUrl: profile.photoURL || user.photoURL || '',
      rating: profile.rating || 0,
      reviews: profile.reviewsCount || 0,
      isPro: profile.isPro || false,
      isWeb3Verified: profile.isWeb3Verified || false,
      isNftVerified: profile.isNftVerified || false,
      kycStatus: profile.kycStatus || 'Not Verified',
      location: { city: profile.location || 'Bangkok', country: 'Thailand', countryCode: 'TH', lat: 13.7563, lng: 100.5018 },
      onSaleCount: profile.onSaleCount || 0,
      itemsSold: profile.salesCount || 0,
      creditScore: profile.creditScore || 0,
      creditLevel: profile.creditLevel || 'Newcomer',
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      postsCount: profile.postsCount || 0,
      displayedBadge: profile.displayedBadge || 'none',
    };
    
    const postData = {
      title,
      content,
      authorId: user.uid,
      author: authorData,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      images: imagePreviews,
      videos: videoUrls,
      createdAt: serverTimestamp(),
      likes: 0,
      favorites: 0,
      views: 0,
      replies: 0,
      isFeatured: false,
      status: 'active' as 'active' | 'under_review' | 'hidden',
      likedBy: [],
      favoritedBy: [],
      location: location,
    };
    
    const bbsCollectionRef = collection(firestore, "bbs");
    addDoc(bbsCollectionRef, postData).then(docRef => {
        const userRef = doc(firestore, 'users', user.uid);
        updateDoc(userRef, { postsCount: increment(1) }).catch(serverError => {
             const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: { postsCount: increment(1) },
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        setIsSubmitting(false);
        toast({
            title: "Transmission Complete",
            description: "Your data has been permanently logged in the Somnia Node.",
        });
        router.push(`/bbs/${docRef.id}`);

    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: bbsCollectionRef.path,
            operation: 'create',
            requestResourceData: postData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSubmitting(false);
    });
  };

  // 骨架屏也换成暗黑风
  if (loading || !user) {
      return (
        <div className="min-h-screen bg-[#020203] relative pt-[100px] pb-32">
            <div className="max-w-3xl mx-auto space-y-8 px-6">
              <Skeleton className="h-16 w-1/3 bg-white/5 rounded-full" />
              <div className="space-y-6 bg-white/[0.02] p-8 rounded-[3rem] border border-white/5">
                <Skeleton className="h-12 w-full bg-white/5 rounded-xl" />
                <Skeleton className="h-40 w-full bg-white/5 rounded-xl" />
                <Skeleton className="h-12 w-full bg-white/5 rounded-xl" />
              </div>
            </div>
        </div>
      );
  }

  // KYC 拦截页面赛博化
  if (profile && profile.kycStatus !== 'Verified') {
      // 🚀 注释移到 return 外面，彻底防止报错
      return (
           <div className="min-h-screen bg-[#020203] relative z-10 pt-0">
               <style dangerouslySetInnerHTML={{ __html: somniaArtStyles }} />
               <div className="somnia-bg-canvas opacity-50 grayscale" />
               <div className="noise-overlay" />
               
               <header className="sticky top-[64px] z-[40] w-full border-b border-white/5 bg-black/80 backdrop-blur-2xl h-24 flex items-center shadow-2xl">
                  <div className="w-full px-4 md:px-8 flex items-center justify-between">
                    <motion.button onClick={() => router.back()} whileHover={{ scale: 1.05 }} className="flex items-center gap-3 group">
                        <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-white"><ArrowLeft size={20}/></div>
                        <span className="text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-white">[ BACK ]</span>
                    </motion.button>
                  </div>
               </header>

              <div className="container mx-auto px-4 py-32 relative z-20">
                  <div className="max-w-xl mx-auto">
                      <div className="bg-red-950/20 border border-red-500/30 p-10 rounded-[3rem] backdrop-blur-xl text-center shadow-[0_0_80px_rgba(220,38,38,0.15)] relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
                          <ShieldAlert className="w-20 h-20 text-red-500 mx-auto mb-8 animate-bounce" />
                          <h1 className="text-3xl font-black italic uppercase tracking-widest text-white mb-4">SYSTEM_LOCK // KYC REQUIRED</h1>
                          <p className="text-red-200/70 font-mono text-sm leading-relaxed mb-10">
                              Access denied. Your identity hash is not verified in the consensus network. To maintain node integrity, please complete KYC verification to establish transmission protocols.
                          </p>
                          <Button asChild className="rounded-full bg-red-500 text-white hover:bg-red-600 font-black tracking-widest h-14 px-10">
                              <Link href="/account/kyc">INITIATE VERIFICATION</Link>
                          </Button>
                      </div>
                  </div>
              </div>
           </div>
      );
  }

  // 🚀 注释移到 return 外面，彻底防止报错
  return (
    <div className="min-h-screen bg-[#020203] relative z-10 selection:bg-fuchsia-500/30 pt-0 pb-32">
        <style dangerouslySetInnerHTML={{ __html: somniaArtStyles }} />
        
        {/* 背景流体 */}
        <div className="somnia-bg-canvas" />
        <div className="noise-overlay" />
      
        {/* 顶部悬浮控制台 */}
        <header className="sticky top-[64px] z-[40] w-full border-b border-t border-white/5 bg-black/80 backdrop-blur-2xl h-24 flex items-center mb-12 shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
            <div className="w-full px-4 md:px-8 flex items-center justify-between gap-4">
                
                {/* 左侧：改回 BACK */}
                <motion.button onClick={() => router.back()} whileHover={{ scale: 1.05 }} className="flex items-center gap-3 group shrink-0">
                    <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-white group-hover:border-white/30 transition-all shadow-lg"><ArrowLeft size={20}/></div>
                    <span className="hidden md:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-white transition-all">[ BACK ]</span>
                </motion.button>
                
                {/* 中央文字 */}
                <div className="flex-1 text-center">
                    <h2 className="text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] text-fuchsia-400 animate-pulse">
                        <Sparkles className="inline-block w-3 h-3 mr-2 mb-0.5" />
                        Establishing Node Transmission
                    </h2>
                </div>

                {/* 右侧：改回 HOME，并换上 Home 图标 */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <span className="hidden md:block text-[11px] font-black italic uppercase tracking-[0.3em] text-white/40 group-hover:text-cyan-400 transition-all">[ HOME ]</span>
                    <div className="p-3 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-cyan-400 group-hover:border-cyan-400/40 transition-all shadow-lg"><Home size={20}/></div>
                </Link>

            </div>
        </header>

        {/* 主表单区域 */}
        <div className="container mx-auto px-4 relative z-20">
            <div className="max-w-4xl mx-auto">
                <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-14 shadow-[0_0_80px_rgba(0,0,0,0.6)] relative overflow-hidden group">
                    {/* 边缘霓虹漏光 */}
                    <div className="absolute -inset-[1px] bg-gradient-to-b from-fuchsia-500/20 via-transparent to-cyan-500/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                    
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-6xl font-black italic text-white tracking-tighter mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                            DATA_INPUT <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">//</span>
                        </h1>
                        <p className="text-white/40 font-mono text-xs tracking-[0.2em] uppercase">Configure your log matrix for the Lacus Somniorum.</p>
                    </div>

                    <form className="grid gap-10 relative z-10" onSubmit={handleSubmit}>
                        
                        {/* AI 辅助引擎模块 */}
                        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-6 backdrop-blur-sm transition-all hover:bg-fuchsia-500/10 hover:shadow-[0_0_30px_rgba(217,70,239,0.15)] flex items-start space-x-4">
                            <Checkbox 
                                id="ai-analysis" 
                                checked={isAiAnalysisEnabled} 
                                onCheckedChange={(checked) => setIsAiAnalysisEnabled(!!checked)}
                                className="mt-1 border-fuchsia-500/50 data-[state=checked]:bg-fuchsia-500 data-[state=checked]:text-white"
                            />
                            <div className="grid gap-2 leading-none flex-1">
                                <Label htmlFor="ai-analysis" className="text-sm font-black uppercase tracking-[0.2em] text-fuchsia-300 flex items-center gap-2 cursor-pointer">
                                    <Sparkles className="h-4 w-4" />
                                    {t('newProductPage.aiAnalysis')} [BETA]
                                </Label>
                                <p className="text-xs font-mono text-fuchsia-200/50 leading-relaxed">
                                    {t('newProductPage.aiAnalysisDescription')}
                                </p>
                            </div>
                        </div>

                        {/* Title Input */}
                        <div className="grid gap-3">
                            <Label htmlFor="title" className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase ml-2">Header_Log</Label>
                            <div className="relative">
                                <Input 
                                    id="title" 
                                    placeholder="Enter transmission title..." 
                                    value={title} 
                                    onChange={(e) => setTitle(e.target.value)} 
                                    required 
                                    disabled={isAiLoading}
                                    className="h-16 bg-white/5 border-transparent border-b-white/20 rounded-2xl text-lg text-white placeholder:text-white/20 focus:bg-white/10 focus:border-b-fuchsia-500 focus:ring-0 transition-all font-medium px-6" 
                                />
                                {isAiLoading && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-fuchsia-400" />}
                            </div>
                        </div>

                        {/* Content Input */}
                        <div className="grid gap-3">
                            <Label htmlFor="content" className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase ml-2">Main_Cipher</Label>
                            <div className="relative">
                                <Textarea 
                                    id="content" 
                                    placeholder="Compile your thoughts..." 
                                    value={content} 
                                    onChange={(e) => setContent(e.target.value)} 
                                    required 
                                    rows={8} 
                                    disabled={isAiLoading}
                                    className="bg-white/5 border-transparent border-b-white/20 rounded-3xl text-base text-white placeholder:text-white/20 focus:bg-white/10 focus:border-b-cyan-500 focus:ring-0 transition-all resize-none p-6"
                                />
                                {isAiLoading && <Loader2 className="absolute right-6 top-6 h-5 w-5 animate-spin text-cyan-400" />}
                            </div>
                        </div>

                        {/* Visual Assets (Images & Videos in a grid) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                            {/* Images */}
                            <div className="grid gap-4">
                                <Label className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Visual_Nodes (Max 9)</Label>
                                <div className="space-y-4">
                                    {imagePreviews.length > 0 && (
                                        <div className="grid grid-cols-3 gap-3">
                                            {imagePreviews.map((src, index) => (
                                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10">
                                                    <img src={src} alt={`preview ${index}`} className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button type="button" size="icon" variant="destructive" className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-500" onClick={() => removeImage(index)}>
                                                            <X className="h-4 w-4 text-white" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {imagePreviews.length < 9 && (
                                        <div className="w-full">
                                            <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/20 rounded-2xl bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all group">
                                                <Upload className="h-8 w-8 text-white/30 group-hover:text-white/70 mb-2 transition-colors" />
                                                <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white/30 group-hover:text-white/70">Upload Image</p>
                                            </label>
                                            <Input id="image-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" multiple />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Videos */}
                            <div className="grid gap-4">
                                <Label className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase">Holo_Links</Label>
                                <div className="space-y-3">
                                    {videoUrls.map((url, index) => (
                                        <div key={index} className="relative group p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
                                            <p className="text-xs text-white/60 font-mono truncate pl-2 pr-8">{url}</p>
                                            <Button type="button" size="icon" variant="ghost" className="absolute right-2 h-8 w-8 rounded-full text-white/40 hover:text-red-400 hover:bg-white/5" onClick={() => handleRemoveVideo(index)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" className="w-full h-14 rounded-2xl border-dashed border-white/20 bg-transparent text-white/40 hover:bg-white/5 hover:text-white/80 uppercase tracking-[0.2em] text-[10px] font-black">
                                                <Video className="mr-3 h-4 w-4" /> Add Video URL
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-[#05000a] border border-white/10 text-white rounded-3xl">
                                            <DialogHeader>
                                                <DialogTitle className="font-headline text-2xl italic tracking-tighter">Inject Stream</DialogTitle>
                                                <DialogDescription className="text-white/40 font-mono text-xs">Paste a YouTube or TikTok hololink.</DialogDescription>
                                            </DialogHeader>
                                            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:border-cyan-500" />
                                            <DialogFooter><Button onClick={handleAddVideoUrl} className="rounded-full bg-white text-black font-black hover:bg-cyan-400">Confirm Inject</Button></DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="grid gap-3">
                            <Label htmlFor="tags" className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase ml-2">Metadata_Tags</Label>
                            <Input 
                                id="tags" 
                                placeholder="CYBER, VINTAGE, REVIEW..." 
                                value={tags} 
                                onChange={(e) => setTags(e.target.value)} 
                                className="h-14 bg-white/5 border-transparent border-b-white/20 rounded-2xl text-sm text-white placeholder:text-white/20 focus:bg-white/10 focus:border-b-fuchsia-500 focus:ring-0 transition-all font-mono uppercase px-6" 
                            />
                            <p className="text-[10px] text-fuchsia-300/50 font-mono ml-2">Separate with commas.</p>
                        </div>
                        
                        {/* Submit Row */}
                        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                {locationError ? (
                                    <p className="text-xs font-mono text-red-400 flex items-center gap-2"><X className="h-4 w-4" /> {locationError}</p>
                                ) : !location ? (
                                    <p className="text-xs font-mono text-white/30 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-cyan-500" /> Locating Signal...</p>
                                ) : (
                                    <p className="text-xs font-mono text-cyan-400 flex items-center gap-2"><MapPin className="h-4 w-4" /> Signal Locked</p>
                                )}
                            </div>
                            
                            <Button 
                                type="submit" 
                                disabled={isSubmitting || !title.trim() || !content.trim() || !location}
                                className={cn(
                                    "w-full sm:w-auto h-16 px-12 rounded-full font-black italic tracking-[0.3em] uppercase text-sm transition-all duration-300 shadow-2xl overflow-hidden relative group",
                                    isSubmitting || !title.trim() || !content.trim() || !location
                                    ? "bg-white/10 text-white/30 border border-white/5"
                                    : "bg-white text-black hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(34,211,238,0.5)] border border-transparent"
                                )}
                            >
                                <span className="relative z-10 flex items-center">
                                    {isSubmitting ? <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Processing</> : <><Send className="mr-3 h-5 w-5" /> Push to Network</>}
                                </span>
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
  )
}