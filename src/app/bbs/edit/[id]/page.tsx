
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
import { ContentPreviewRenderer } from '@/components/content-preview-renderer';


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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
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
  
  const handleInsertImage = () => {
    if (imageUrl) {
        setContent(prev => `${prev}\n![Image from URL](${imageUrl})\n`);
        setImageUrl('');
        setIsImageDialogOpen(false);
    }
  };

  const handleInsertVideo = () => {
    if (videoUrl) {
        let embedUrl = '';
        const youtubeMatch = videoUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const tiktokMatch = videoUrl.match(/tiktok\.com\/.*\/video\/(\d+)/);

        if (youtubeMatch && youtubeMatch[1]) {
            embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
            setContent(prev => `${prev}\n[youtube](${embedUrl})\n`);
        } else if (tiktokMatch && tiktokMatch[1]) {
            embedUrl = `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
             setContent(prev => `${prev}\n[tiktok](${embedUrl})\n`);
        }

        if (embedUrl) {
            setVideoUrl('');
            setIsVideoDialogOpen(false);
        } else {
            toast({
                variant: 'destructive',
                title: 'Invalid URL',
                description: 'Please enter a valid YouTube or TikTok share link.'
            })
        }
    }
  };

  const handleRemoveMediaLine = (lineToRemove: string) => {
    setContent(prev => {
        const lines = prev.split('\n');
        const newLines = lines.filter(line => line.trim() !== lineToRemove.trim());
        return newLines.join('\n').replace(/\n\n+/g, '\n');
    });
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
                    <div className="flex items-center justify-between">
                        <Label htmlFor="content">Content</Label>
                        <div className="flex items-center gap-2">
                            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm">
                                        <LinkIcon className="mr-2 h-4 w-4" /> Insert Image URL
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Insert Image from URL</DialogTitle>
                                        <DialogDescription>Paste the URL of the image you want to embed.</DialogDescription>
                                    </DialogHeader>
                                    <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                                    <DialogFooter>
                                        <Button onClick={handleInsertImage}>Add Image</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm">
                                        <Video className="mr-2 h-4 w-4" /> Insert Video URL
                                    </Button>
                                </DialogTrigger>
                                 <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Insert Video from URL</DialogTitle>
                                        <DialogDescription>Paste a YouTube or TikTok share link.</DialogDescription>
                                    </DialogHeader>
                                    <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
                                    <DialogFooter>
                                        <Button onClick={handleInsertVideo}>Add Video</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                    <div className="rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <Textarea id="content" placeholder="What's on your mind? You can use Markdown for formatting." value={content} onChange={(e) => setContent(e.target.value)} required rows={8} className="border-0 rounded-b-none focus-visible:ring-0 focus-visible:ring-offset-0"/>
                        <ContentPreviewRenderer content={content} onRemove={handleRemoveMediaLine} />
                    </div>
                </div>
                 <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input id="tags" placeholder="e.g. DIY, Tutorial, Review" value={tags} onChange={(e) => setTags(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Separate tags with commas.</p>
                </div>

                 <div className="grid gap-2">
                    <Label>Upload Images (up to 9)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Input
                            id="image-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleImageUpload}
                            accept="image/*"
                            multiple
                            disabled={imagePreviews.length >= 9}
                        />
                        <label htmlFor="image-upload" className={imagePreviews.length >= 9 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
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
