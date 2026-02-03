'use client';

import { useEffect, useState, useMemo } from 'react';
import { notFound, useParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';


function UserListingsPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col items-center mb-8">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-9 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col space-y-3">
                        <Skeleton className="aspect-[4/3] w-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-4/5" />
                            <Skeleton className="h-4 w-3/5" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function UserListingsPage() {
    const params = useParams();
    const { t } = useTranslation();
    const userId = params.id as string;
    const firestore = useFirestore();
    
    const userRef = useMemo(() => firestore ? doc(firestore, 'users', userId) : null, [firestore, userId]);
    const { data: user, loading: userLoading } = useDoc<UserProfile>(userRef);

    const productsQuery = useMemo(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'products'), where('sellerId', '==', userId), where('status', '==', 'active'));
    }, [firestore, userId]);
    const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery);

    const loading = userLoading || productsLoading;

    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <UserListingsPageSkeleton />
            </>
        );
    }
    
    if (!user) {
        return notFound();
    }

    return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-8">
            <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.photoURL} alt={user.displayName} />
                <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-headline">{t('userProfile.usersListings').replace('{userName}', user.displayName)}</h1>
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <h2 className="text-xl font-semibold">{t('userProfile.noListings').replace('{userName}', user.displayName)}</h2>
            <p className="text-muted-foreground mt-2">{t('userProfile.noListingsDescription')}</p>
          </div>
        )}
      </div>
    </>
  );
}
