
'use client';

import { useMemo, useEffect, useState } from 'react';
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
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export function VerifiedMerchants() {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [proUsers, setProUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const proUsersQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('isPro', '==', true), limit(30));
    }, [firestore]);

    useEffect(() => {
        if (!proUsersQuery) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        getDocs(proUsersQuery)
            .then(snapshot => {
                const users = snapshot.docs.map(doc => doc.data() as UserProfile);
                setProUsers(users);
            })
            .catch(err => {
                console.error("Error fetching pro users:", err);
                toast({
                    title: 'Could not load merchants',
                    description: err.message,
                    variant: 'destructive',
                });
            })
            .finally(() => {
                setIsLoading(false);
            });

    }, [proUsersQuery, toast]);


    const handleGuestClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            toast({
                title: '需要认证',
                description: '请先登录或注册以访问所有认证商户。',
                variant: 'destructive'
            });
        }
    }
    
    return (
        <section className="container mx-auto px-4 py-12 md:py-16">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline text-3xl font-semibold">{t('homePage.verifiedMerchants')}</h2>
                 <Button asChild variant="ghost">
                    <Link href="/merchants" onClick={handleGuestClick}>
                        View All <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
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
