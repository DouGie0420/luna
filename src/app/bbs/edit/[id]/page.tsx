
'use client';

import { useUser, useFirestore, useDoc } from '@/firebase';
import { useRouter, useParams, notFound } from 'next/navigation';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, ShieldAlert, X, Loader2, MapPin, Link as LinkIcon, Video } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import type { BbsPost } from '@/lib/types';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
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


export default function EditBbsPostPage() {
  const { user, profile, loading: userLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();

  const postRef = useMemo(() => firestore && id ? doc(firestore, 'bbs', id) : null, [firestore, id]);
  const { data: post, loading: postLoading } = useDoc<BbsPost>(postRef);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isImageURLDialogOpen, setIsImageURLDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  // Populate form with post data
  useEffect(() => {
    if (post) {
        setTitle(post.title || '');
        setContent(post.content || '');
        setTags(post.tags?.join(', ') || '');
        setImagePreviews(post.images || []);
        setVideoUrls(post.videos || []);
    }
  }, [post]);


  useEffect(() => {
      if (!userLoading && !user) {
          router.replace(`/login?redirect=/bbs/edit/${id}`);
      }
      if (!postLoading && post && user && post.authorId !== user.uid) {
          toast({ variant: 'destructive', title: 'Unauthorized', description: "You can only edit your own posts." });
          router.replace(`/bbs/${id}`);
      }
  }, [user, userLoading, post, postLoading, id, router, toast]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      if ((imagePreviews.length + files.length) > 9) {
          toast({ variant: 'destructive', title: 'Maximum images reached', description: 'You can upload a maximum of 9 images.' });
          return;
      }

      const fileArray = Array.from(files);

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
          let embedUrl = videoUrl; // Default to the URL itself
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
    if (!user || !postRef) {
      toast({ variant: 'destructive', title: 'Something went wrong. Please try again.'});
      return;
    }
    setIsSubmitting(true);
    
    const postData = {
      title,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      images: imagePreviews,
      videos: videoUrls,
      updatedAt: serverTimestamp(),
    };
    
    updateDoc(postRef, postData).then(() => {
        setIsSubmitting(false);
        toast({
            title: "Post updated!",
            description: "Your changes have been saved.",
        });
        router.push(`/bbs/${id}`);

    }).catch(serverError => {
        const permissionError = new FirestorePermissionError({
            path: postRef.path,
            operation: 'update',
            requestResourceData: postData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSubmitting(false);
    });
  };

  if (userLoading || postLoading) {
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

  if (!post) {
      return notFound();
  }


  return (
    <>
      <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <BackButton />
          <Button asChild variant="ghost" className="rounded-full bg-lime-400/20 text-lime-300 border border-lime-400/50 hover:bg-lime-400/30 hover:text-lime-200 h-8 px-3">
            <Link href={`/bbs/${id}`}>
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
              <CardTitle className="text-3xl font-headline">Edit Post</CardTitle>
              <CardDescription>
                Make changes to your post.
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
                    <Textarea id="content" placeholder="What's on your mind? You can use Markdown for formatting." value={content} onChange={(e) => setContent(e.target.value)} required rows={8} />
                </div>

                <div className="grid gap-2">
                    <Label>Images (up to 9)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4">
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4">
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
                    <Button type="submit" size="lg" disabled={isSubmitting || !title.trim() || !content.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
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
