'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Heart, Star, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BbsPost } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

interface BbsPostImageGalleryProps {
  post: BbsPost;
}

export function BbsPostImageGallery({ post }: BbsPostImageGalleryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, profile } = useUser();

  const [mainApi, setMainApi] = useState<CarouselApi>();
  const [thumbApi, setThumbApi] = useState<CarouselApi>();
  const [lightboxApi, setLightboxApi] = useState<CarouselApi>();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [permissionErrorToast, setPermissionErrorToast] = useState(false);

  const images = post.images || [];
  const imageHints = post.imageHints || [];

  const canInteract = user && profile?.kycStatus === 'Verified';
  const isGuest = !user;

  useEffect(() => {
    if (permissionErrorToast) {
        toast({
            variant: 'destructive',
            title: isGuest ? t('common.loginToInteract') : t('common.verifyToInteract'),
        });
        setPermissionErrorToast(false);
    }
  }, [permissionErrorToast, isGuest, t, toast]);

  if (images.length === 0) {
      return null;
  }

  // Sync main carousel and thumbnails
  useEffect(() => {
    if (!mainApi) return;
    const onSelect = () => {
      setSelectedIndex(mainApi.selectedScrollSnap());
      thumbApi?.scrollTo(mainApi.selectedScrollSnap(), true);
    };
    mainApi.on('select', onSelect);
    onSelect();
    return () => mainApi.off('select', onSelect);
  }, [mainApi, thumbApi]);

  // Scroll lightbox to correct image on open
  useEffect(() => {
    if (isLightboxOpen && lightboxApi) {
        lightboxApi.scrollTo(selectedIndex, true);
    }
  }, [isLightboxOpen, lightboxApi, selectedIndex]);

  const onThumbClick = (index: number) => {
    mainApi?.scrollTo(index);
  };
  
  const openLightbox = () => {
    setIsLightboxOpen(true);
  };
  
  const handleShare = () => {
    const postUrl = window.location.href;
    navigator.clipboard.writeText(postUrl);
    toast({
        title: t('bbsPage.linkCopied'),
    });
  };

  const handleInteractionNotAllowed = () => {
    setPermissionErrorToast(true);
  }

  const handleLikeClick = () => {
    if (!canInteract) {
        handleInteractionNotAllowed();
        return;
    }
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    if(newLikedState) {
      toast({ title: t('bbsPage.thankYouForLike') });
    }
  }

  const handleFavoriteClick = () => {
    if (!canInteract) {
        handleInteractionNotAllowed();
        return;
    }
    const newFavoriteState = !isFavorited;
    setIsFavorited(newFavoriteState);
    if(newFavoriteState) {
        toast({ title: t('productCardActions.addedToFavorites') });
    }
  }

  return (
    <>
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-none w-screen h-screen p-0 border-0 bg-black/90">
            <Carousel setApi={setLightboxApi} className="w-full h-full" opts={{ loop: true, startIndex: selectedIndex }}>
                <CarouselContent>
                    {images.map((img, index) => (
                        <CarouselItem key={index}>
                        <div className="w-full h-full flex items-center justify-center">
                            <Image src={img} alt={`${t(post.titleKey)} image ${index + 1}`} width={1920} height={1080} className="object-contain max-w-full max-h-full" />
                        </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-4 text-white" />
                <CarouselNext className="absolute right-4 text-white" />
            </Carousel>
        </DialogContent>
      </Dialog>
      
      <div className="relative">
        <Carousel setApi={setMainApi} className="w-full group" opts={{ loop: true }}>
          <CarouselContent>
            {images.map((img, index) => (
              <CarouselItem key={index} onClick={openLightbox}>
                <div className="aspect-video relative cursor-zoom-in overflow-hidden rounded-xl bg-white/10 p-2 backdrop-blur-lg ring-1 ring-inset ring-white/20 group-hover:ring-white/30 transition-all">
                    <Image
                        src={img}
                        alt={`${t(post.titleKey)} image ${index + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105 rounded-lg"
                        data-ai-hint={imageHints[index] || ''}
                    />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute left-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          <CarouselNext className="absolute right-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </Carousel>

        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <Button onClick={handleLikeClick} variant="ghost" size="icon" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-rose-500 backdrop-blur-sm animate-glow">
              <Heart className={cn("h-5 w-5", isLiked && "text-yellow-400 fill-yellow-400")} />
          </Button>
          <Button onClick={handleFavoriteClick} variant="ghost" size="icon" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-yellow-400 backdrop-blur-sm animate-glow">
              <Star className={cn("h-5 w-5", isFavorited && "text-yellow-400 fill-yellow-400")} />
          </Button>
          <Button onClick={handleShare} variant="ghost" size="icon" className="rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-sky-400 backdrop-blur-sm animate-glow">
              <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Carousel setApi={setThumbApi} opts={{ align: 'start', containScroll: 'keepSnaps', dragFree: true }}>
          <CarouselContent className="-ml-2">
            {images.map((img, index) => (
              <CarouselItem key={index} className="pl-2 basis-1/4 lg:basis-[12.5%]">
                <div 
                  onClick={() => onThumbClick(index)} 
                  className={cn(
                    'overflow-hidden aspect-square relative cursor-pointer rounded-lg bg-white/10 p-1 backdrop-blur-lg transition-all ring-1 ring-inset',
                    selectedIndex === index ? 'ring-primary opacity-100' : 'ring-white/20 opacity-60 hover:opacity-100'
                  )}
                >
                  <Image 
                    src={img} 
                    alt={`Thumbnail ${index + 1}`} 
                    fill 
                    className="object-cover rounded-md" 
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </>
  );
}
