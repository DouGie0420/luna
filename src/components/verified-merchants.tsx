'use client';

import { useMemo } from 'react';
import { MerchantCard } from "./merchant-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';

export function VerifiedMerchants() {
    const { t } = useTranslation();
    const firestore = useFirestore();

    const proUsersQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('isPro', '==', true), limit(10));
    }, [firestore]);

    const { data: proUsers, loading: isLoading } = useCollection<UserProfile>(proUsersQuery);

    return (
        <section className="container mx-auto px-4 py-12 md:py-16">
            <h2 className="font-headline text-3xl font-semibold mb-6">{t('homePage.verifiedMerchants')}</h2>
            <div className="relative">
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-1">
                                <Skeleton className="h-48 w-full" />
                            </div>
                        ))}
                    </div>
                ) : proUsers && proUsers.length > 0 ? (
                    <Carousel
                        opts={{
                            align: "start",
                            loop: proUsers.length > 5,
                        }}
                        plugins={[
                            Autoplay({
                            delay: 3000,
                            stopOnInteraction: true,
                            }),
                        ]}
                        className="w-full"
                    >
                        <CarouselContent>
                            {proUsers.map((user) => (
                            <CarouselItem key={user.uid} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/5">
                                <div className="p-1 h-full">
                                <MerchantCard user={user} />
                                </div>
                            </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden lg:flex" />
                        <CarouselNext className="hidden lg:flex" />
                    </Carousel>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">No verified merchants found.</div>
                )}
            </div>
        </section>
    );
}
