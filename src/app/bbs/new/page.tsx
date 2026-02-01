'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, ShieldAlert, X, Loader2, MapPin } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import type { BbsPost, User, UserProfile } from '@/lib/types';
import { addDoc, collection, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';


export default function NewBbsPostPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files).slice(0, 9 - uploadedImages.length);

      if (fileArray.length === 0) return;

      setUploadedImages(prev => [...prev, ...fileArray]);

      const filePromises = fileArray.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises)
        .then(newPreviews => {
          setImagePreviews(prev => [...prev, ...newPreviews]);
        })
        .catch(error => {
          console.error("Error reading files for preview: ", error);
          toast({
            variant: "destructive",
            title: "Could not preview images",
            description: "There was an error reading the selected files.",
          });
        });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    const authorData: Partial<User> = {
      id: user.uid,
      name: profile.displayName || user.displayName || 'Anonymous',
      avatarUrl: profile.photoURL || user.photoURL || '',
      creditLevel: profile.creditLevel,
      location: { city: profile.location || '', country: '', countryCode: '', lat: 0, lng: 0 }
    };
    
    try {
      const docRef = await addDoc(collection(firestore, "bbs"), {
        title,
        content,
        authorId: user.uid,
        author: authorData,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        images: imagePreviews,
        createdAt: serverTimestamp(),
        likes: 0,
        favorites: 0,
        views: 0,
        replies: 0,
        isFeatured: false,
        likedBy: [],
        favoritedBy: [],
        location: location,
      });

      // Increment user's post count
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        postsCount: increment(1)
      });
      
      setIsSubmitting(false);
      toast({
          title: "Post created!",
          description: "Your post is now live in the Lacus Somniorum.",
      });
      router.push(`/bbs/${docRef.id}`);

    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        variant: "destructive",
        title: "Failed to create post",
        description: "An error occurred while saving your post. Please check permissions and try again.",
      });
      setIsSubmitting(false);
    }
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
                            <CardTitle className="text-3xl font-headline">Cannot Create Post</CardTitle>
                            <CardDescription>
                                KYC verification is required to create posts in the community.
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
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="A catchy title for your post" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea id="content" placeholder="What's on your mind?" value={content} onChange={(e) => setContent(e.target.value)} required rows={8} />
                </div>
                 <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" placeholder="e.g. DIY, Tutorial, Review" value={tags} onChange={(e) => setTags(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
                </div>

                 <div className="grid gap-2">
                    <Label>Images (up to 9)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Input
                            id="image-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleImageUpload}
                            accept="image/*"
                            multiple
                            disabled={uploadedImages.length >= 9}
                        />
                        <label htmlFor="image-upload" className={uploadedImages.length >= 9 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
                            <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                            <p className="mt-2 text-sm text-muted-foreground">{t('newProductPage.dragAndDrop')}</p>
                            <Button asChild variant="outline" className="mt-4 pointer-events-none">
                                <span>{t('newProductPage.selectFiles')}</span>
                            </Button>
                        </label>
                        {imagePreviews.length > 0 && (
                            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <Image src={src} alt={`preview ${index}`} fill className="rounded-md object-cover" />
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
                    </div>
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
