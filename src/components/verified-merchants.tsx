'use client';

import { useState, useEffect } from 'react';
import { getUsers } from "@/lib/data";
import { MerchantCard } from "./merchant-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

export function VerifiedMerchants() {
    const [proUsers, setProUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMerchants = async () => {
          setIsLoading(true);
          try {
            const allUsers = await getUsers();
            // In a real app, this would be filtered by pro status
            setProUsers(allUsers.slice(0, 10)); 
          } catch (err) {
            console.error("Failed to fetch verified merchants.", err);
            setProUsers([]);
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchMerchants();
      }, []);

    return (
        <section className="container mx-auto px-4 py-12 md:py-16">
            <h2 className="font-headline text-3xl font-semibold mb-6">认证商户</h2>
            <div className="relative">
                {isLoading || proUsers.length === 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-1">
                                <Skeleton className="h-48 w-full" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <Carousel
                    opts={{
                        align: "start",
                        loop: true,
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
                        <CarouselItem key={user.id} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/5">
                            <div className="p-1 h-full">
                            <MerchantCard user={user} />
                            </div>
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden lg:flex" />
                    <CarouselNext className="hidden lg:flex" />
                    </Carousel>
                )}
            </div>
        </section>
    );
}
