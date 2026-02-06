
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
import { Upload, ShieldAlert, X, Loader2, Home, Users, Bed, Bath, Sparkles } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { addDoc, collection, serverTimestamp, doc } from 'firebase/firestore';
import { compressImage } from '@/lib/image-compressor';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import Image from 'next/image';

export default function NewRentalPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('1室1厅');
  const [maxGuests, setMaxGuests] = useState('2');
  const [pricePerDay, setPricePerDay] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [location, setLocation] = useState<{lat: number; lng: number, city?: string, countryCode?: string} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || !profile?.isPro)) {
      toast({ variant: 'destructive', title: 'Access Denied', description: 'This feature is for PRO merchants only.' });
      router.replace('/account');
    }
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
          setLocationError("Could not get location. Please enable location permissions to post.");
        }
      );
    }
  }, [user, profile, loading, router, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if ((imagePreviews.length + files.length) > 9) {
          toast({ variant: 'destructive', title: 'Maximum images reached', description: 'You can upload a maximum of 9 images.' });
          return;
      }
      const fileArray = Array.from(files);
      const compressedPreviews = await Promise.all(fileArray.map(file => compressImage(file)));
      setImagePreviews(prev => [...prev, ...compressedPreviews]);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !location || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing user or location data.'});
      return;
    }
    
    setIsSubmitting(true);
    
    const rentalData = {
      title,
      description,
      ownerId: user.uid,
      propertyType,
      maxGuests: Number(maxGuests),
      pricePerDay: Number(pricePerDay),
      images: imagePreviews,
      location,
      amenities: [], // Future feature
      createdAt: serverTimestamp(),
    };
    
    try {
      const rentalCollectionRef = collection(firestore, 'rentalProperties');
      const docRef = await addDoc(rentalCollectionRef, rentalData);
      toast({ title: 'Rental Property Listed!', description: 'Your property is now ready for bookings.' });
      router.push(`/rentals/${docRef.id}`);
    } catch(err) {
      console.error(err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'rentalProperties',
          operation: 'create',
          requestResourceData: rentalData
      }));
      setIsSubmitting(false);
    }
  }

  if (loading || !profile?.isPro) {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="sticky top-20 z-30 border-y border-primary/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-12 items-center justify-between px-4">
          <BackButton />
        </div>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline flex items-center gap-3"><Home /> List Your Property</CardTitle>
              <CardDescription>Fill in the details about your space to start earning.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="title">Property Title</Label>
                  <Input id="title" placeholder="e.g. Cozy Downtown Apartment with a View" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe what makes your place unique..." value={description} onChange={(e) => setDescription(e.target.value)} required rows={8} />
                </div>
                
                 <div className="grid gap-2">
                    <Label>Images (up to 9)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 space-y-4">
                        {imagePreviews.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                {imagePreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <Image src={src} alt={`preview ${index}`} fill className="rounded-md object-cover" />
                                        <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => removeImage(index)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Input id="image-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" multiple />
                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center text-center p-6 border-dashed border rounded-md hover:bg-accent transition-colors">
                            <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="propertyType" className="flex items-center gap-2"><Bed /> Property Type</Label>
                        <Input id="propertyType" placeholder="e.g., 1室1厅" value={propertyType} onChange={e => setPropertyType(e.target.value)} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="maxGuests" className="flex items-center gap-2"><Users /> Max Guests</Label>
                        <Input id="maxGuests" type="number" placeholder="2" value={maxGuests} onChange={e => setMaxGuests(e.target.value)} required />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="pricePerDay">Price per Day (THB)</Label>
                        <Input id="pricePerDay" type="number" placeholder="1500" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} required />
                    </div>
                </div>
                
                <div className="flex justify-end mt-4">
                    <Button type="submit" size="lg" disabled={isSubmitting || !!locationError}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        List My Property
                    </Button>
                </div>
                {locationError && <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertDescription>{locationError}</AlertDescription></Alert>}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
