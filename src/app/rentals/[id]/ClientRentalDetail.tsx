'use client';

import React, { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { RentalProperty } from '@/lib/types';
import { BbsPostImageGallery } from '@/components/bbs-post-image-gallery';
import { SellerProfileCard } from '@/components/seller-profile-card';
import { BookingCalendar } from '@/components/booking-calendar';
import { MapPin, Users, Home as HomeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function RentalPageSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-8">
                    <div className="lg:col-span-3 space-y-4">
                        <Skeleton className="aspect-video w-full rounded-xl" />
                        <div className="grid grid-cols-8 gap-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                            ))}
                        </div>
                         <Skeleton className="h-32 w-full mt-4" />
                    </div>
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-96 w-full" />
                         <Skeleton className="h-24 w-full" />
                    </div>
                </div>
            </div>
        </>
    );
}

export default function ClientRentalDetail() {
    const params = useParams();
    const id = params.id as string;
    const firestore = useFirestore();

    const propertyRef = useMemo(() => (firestore && id ? doc(firestore, 'rentalProperties', id) : null), [firestore, id]);
    const { data: property, loading } = useDoc<RentalProperty>(propertyRef);
    
    // Mocking BbsPost structure for gallery re-use
    const galleryPost = useMemo(() => {
        if (!property) return null;
        return {
            id: property.id,
            title: property.title,
            images: property.images,
            // Mocking fields not present in RentalProperty
            author: { id: property.ownerId, name: '', avatarUrl: '' },
            content: '',
            createdAt: property.createdAt,
            likes: 0,
            replies: 0,
            tags: [],
            views: 0
        }
    }, [property]);

    if (loading) {
        return <RentalPageSkeleton />;
    }

    if (!property || !galleryPost) {
        return notFound();
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-8">
                    <div className="lg:col-span-3">
                         <BbsPostImageGallery 
                            post={galleryPost as any}
                            onLikeToggle={() => {}}
                            onFavoriteToggle={() => {}}
                         />
                         <div className="mt-8">
                            <h1 className="font-sans text-3xl font-bold">{property.title}</h1>
                            <div className="flex items-center gap-4 text-muted-foreground mt-2">
                                <span className="flex items-center gap-2"><MapPin className="h-4 w-4"/> {property.location.city || 'Unknown City'}</span>
                                <span className="flex items-center gap-2"><HomeIcon className="h-4 w-4"/> {property.propertyType}</span>
                                <span className="flex items-center gap-2"><Users className="h-4 w-4"/> {property.maxGuests} Guests</span>
                            </div>
                             <p className="mt-6 text-foreground/90 leading-relaxed whitespace-pre-wrap">{property.description}</p>
                         </div>
                    </div>
                     <div className="lg:col-span-2 flex flex-col gap-6">
                        <BookingCalendar property={property} />
                        <SellerProfileCard product={{ seller: { id: property.ownerId }} as any} />
                    </div>
                </div>
            </div>
        </>
    );
}