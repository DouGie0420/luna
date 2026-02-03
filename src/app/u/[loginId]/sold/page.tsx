
'use client';

import { useEffect, useMemo, useState } from 'react';
import { notFound, useParams } from "next/navigation";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { ShoppingCart } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function UserSoldPage() {
    const params = useParams();
    const { t } = useTranslation();
    const loginId = params.loginId as string;
    const firestore = useFirestore();
    
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore || !loginId) return;

        const fetchUser = async () => {
            setLoading(true);
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('loginId', '==', loginId));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setUser(null);
            } else {
                setUser(querySnapshot.docs[0].data() as UserProfile);
            }
            setLoading(false);
        }
        fetchUser();
    }, [firestore, loginId]);


    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                 <div className="container mx-auto px-4 py-12">
                    <div className="flex flex-col items-center mb-8">
                        <Skeleton className="h-24 w-24 rounded-full mb-4" />
                        <Skeleton className="h-9 w-48" />
                    </div>
                     <div className="text-center py-20 border-2 border-dashed rounded-lg">
                        <Skeleton className="h-8 w-64 mx-auto" />
                         <Skeleton className="h-5 w-80 mx-auto mt-4" />
                    </div>
                </div>
            </>
        );
    }
    
    if (!user) {
        return notFound();
    }
    
    const userProfileUrl = `/@${user.loginId}`;

    return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-8">
            <Link href={userProfileUrl}>
                <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
            </Link>
            <h1 className="text-3xl font-headline">{t('userProfile.usersSoldItems').replace('{userName}', user.displayName)}</h1>
        </div>

        <div className="text-center py-20 border-2 border-dashed rounded-lg">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold mt-4">{t('userProfile.noSoldItems')}</h2>
            <p className="text-muted-foreground mt-2">{t('userProfile.noSoldItemsDescription')}</p>
          </div>
      </div>
    </>
  );
}
