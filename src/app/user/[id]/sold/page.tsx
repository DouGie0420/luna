'use client';

import { useEffect, useState } from 'react';
import { getUsers } from "@/lib/data";
import { notFound, useParams } from "next/navigation";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { ShoppingCart } from 'lucide-react';

export default function UserSoldPage() {
    const params = useParams();
    const { t } = useTranslation();
    const userId = params.id as string;
    
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            const allUsers = await getUsers();
            const foundUser = allUsers.find(u => u.id === userId);
            setUser(foundUser || null);
            setLoading(false);
        };
        fetchData();

    }, [userId]);


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

    return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center mb-8">
            <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-headline">{t('userProfile.usersSoldItems').replace('{userName}', user.name)}</h1>
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
