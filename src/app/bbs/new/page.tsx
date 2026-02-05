
'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, ShieldAlert, X, Loader2, MapPin, Link as LinkIcon, Video, Sparkles } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import type { BbsPost, User } from '@/lib/types';
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
      setIsAiLoading(true); // Show loader for both compression and AI analysis

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
    e.target.value = ''; // Reset file input to allow re-uploading the same file
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleAddImageUrl = () => {
    if (imageUrl && imagePreviews.length < 9) {
        try {
            new URL(imageUrl);
            setImagePreviews(prev => [...prev, imageUrl]);
            setImageUrl('');
            setIsImageURLDialogOpen(false);
        } catch (_) {
            toast({ variant: 'destructive', title: 'Invalid URL', description: 'Please enter a valid image URL.' });
        }
    } else if (imagePreviews.length >= 9) {
        toast({ variant: 'destructive', title: 'Maximum 9 images allowed.' });
    }
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
            title: "Post created!",
            description: "Your post is now live in the Lacus Somniorum.",
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

  if (loading || !user) {
      return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
        </div>
      );
  }

  if (profile && profile.kycStatus !== 'Verified') {
      return (
           <>
              <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto flex h-12 items-center justify-between px-4">
                  <BackButton />
                  <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
                    <Link href="/bbs">
                        <X className="mr-2 h-4 w-4" />
                        {t('common.close')}
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="container mx-auto px-4 py-12">
                  <div className="max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline">{t('newProductPage.cannotListTitle')}</CardTitle>
                            <CardDescription>
                                {t('newProductPage.cannotListDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>{t('newProductPage.kycRequiredTitle')}</AlertTitle>
                                <AlertDescription className="flex flex-col gap-4">
                                    <p>Your account is not KYC verified. To ensure the safety of the community, you must complete verification before you can create posts.</p>
                                    <Button asChild className="mt-4 w-fit">
                                        <Link href="/account/kyc">{t('newProductPage.goToVerify')}</Link>
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                  </div>
              </div>
           </>
      );
  }


  return (
    <>
      <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <BackButton />
          <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
            <Link href="/bbs">
                <X className="mr-2 h-4 w-4" />
                {t('common.close')}
            </Link>
          </Button>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">Create New Post</CardTitle>
              <CardDescription>
                Share your thoughts with the Lacus Somniorum community.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6" onSubmit={handleSubmit}>
                <div className="items-top flex space-x-3 rounded-lg border border-input p-4">
                    <Checkbox id="ai-analysis" checked={isAiAnalysisEnabled} onCheckedChange={(checked) => setIsAiAnalysisEnabled(!!checked)} />
                    <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="ai-analysis" className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        {t('newProductPage.aiAnalysis')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        {t('newProductPage.aiAnalysisDescription')}
                    </p>
                    </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                   <div className="relative">
                    <Input id="title" placeholder="A catchy title for your post" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isAiLoading} />
                    {isAiLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                  </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="content">Content</Label>
                    <div className="relative">
                        <Textarea id="content" placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} required rows={8} disabled={isAiLoading}/>
                        {isAiLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />}
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>Images (up to 9)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4">
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <img src={src} alt={`preview ${index}`} className="rounded-md object-cover w-full h-full" loading="lazy" />
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={() => removeImage(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {imagePreviews.length < 9 && (
                            <div className="flex justify-center items-center gap-4">
                                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-md hover:bg-accent transition-colors">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <p className="mt-1 text-xs text-muted-foreground">Upload</p>
                                </label>
                                <Input
                                    id="image-upload"
                                    type="file"
                                    className="sr-only"
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    multiple
                                />
                                {/*
                                <Dialog open={isImageURLDialogOpen} onOpenChange={setIsImageURLDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button type="button" variant="outline" className="h-auto flex flex-col items-center justify-center p-4 border-dashed">
                                            <LinkIcon className="h-8 w-8 text-muted-foreground" />
                                            <p className="mt-1 text-xs text-muted-foreground">Add from URL</p>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Add Image from URL</DialogTitle></DialogHeader>
                                        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                                        <DialogFooter><Button onClick={handleAddImageUrl}>Add Image</Button></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                */}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-2">
                    <Label>Videos</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-4">
                        {videoUrls.map((url, index) => (
                            <div key={index} className="relative group p-2 rounded-md bg-secondary/50">
                                <p className="text-xs text-muted-foreground truncate">{url}</p>
                                <Button type="button" size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100" onClick={() => handleRemoveVideo(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="outline" className="w-full">
                                    <Video className="mr-2 h-4 w-4" /> Add Video URL
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Video from URL</DialogTitle>
                                    <DialogDescription>Paste a YouTube or TikTok share link.</DialogDescription>
                                </DialogHeader>
                                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                                <DialogFooter><Button onClick={handleAddVideoUrl}>Add Video</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
               
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" placeholder="e.g. DIY, Tutorial, Review" value={tags} onChange={(e) => setTags(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
                </div>
               
                <div className="flex justify-end items-center gap-4">
                     {locationError ? (
                        <p className="text-sm text-destructive flex items-center gap-2"><X className="h-4 w-4" /> {locationError}</p>
                     ) : !location ? (
                        <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Acquiring location...</p>
                     ) : (
                        <p className="text-sm text-green-400 flex items-center gap-2"><MapPin className="h-4 w-4" /> Location Acquired</p>
                     )}
                    <Button type="submit" size="lg" disabled={isSubmitting || !title.trim() || !content.trim() || !location}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Publish Post
                    </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
