'use client';

import { useEffect, useState, useMemo } from 'react';
import { notFound, useParams } from "next/navigation";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


function UserListPageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
            <div className="flex items-center gap-4 mb-8">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-9 w-48" />
            </div>
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="flex-1"><Skeleton className="h-5 w-32" /></div>
                        <Skeleton className="h-10 w-24" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function UserFollowingPage() {
    const params = useParams();
    const { t } = useTranslation();
    const loginId = params.loginId as string;
    const firestore = useFirestore();
    
    const [user, setUser] = useState<UserProfile | null>(null);
    const [following, setFollowing] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!firestore || !loginId) return;

        const fetchData = async () => {
            setLoading(true);

            const usersRef = collection(firestore, 'users');
            const userQuery = query(usersRef, where('loginId', '==', loginId));
            const userSnapshot = await getDocs(userQuery);
            
            if (userSnapshot.empty) {
                setLoading(false);
                return;
            }
            
            const foundUser = userSnapshot.docs[0].data() as UserProfile;
            setUser(foundUser);
            
            if (foundUser.following && foundUser.following.length > 0) {
                const followingQuery = query(usersRef, where('uid', 'in', foundUser.following));
                const followingSnapshot = await getDocs(followingQuery);
                const followingData = followingSnapshot.docs.map(doc => doc.data() as UserProfile);
                setFollowing(followingData);

                const initialStatus: Record<string, boolean> = {};
                followingData.forEach(u => {
                    initialStatus[u.uid] = true;
                });
                setFollowingStatus(initialStatus);
            } else {
                setFollowing([]);
            }
            setLoading(false);
        };
        fetchData();
    }, [firestore, loginId]);
    
    const toggleFollow = (id: string) => {
        setFollowingStatus(prev => ({...prev, [id]: !prev[id]}));
    }


    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <UserListPageSkeleton />
            </>
        );
    }
    
    if (!user) {
        return notFound();
    }
    
    const userProfileUrl = `/u/${user.loginId}`;

    return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
            <Link href={userProfileUrl}>
                <Avatar className="h-16 w-16">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
            </Link>
            <h1 className="text-3xl font-headline">{t('userProfile.usersFollowing').replace('{userName}', user.displayName)}</h1>
        </div>
        
        <Card>
            <CardContent className="p-0">
                {following.length > 0 ? (
                <div className="divide-y">
                    {following.map((followedUser) => (
                    <div key={followedUser.uid} className="flex items-center gap-4 p-4">
                        <Link href={`/u/${followedUser.loginId}`} className="flex items-center gap-4 flex-1">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={followedUser.photoURL} alt={followedUser.displayName} />
                                <AvatarFallback>{followedUser.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold hover:underline">{followedUser.displayName}</p>
                        </Link>
                        <Button 
                            variant={followingStatus[followedUser.uid] ? 'outline' : 'default'}
                            onClick={() => toggleFollow(followedUser.uid)}
                        >
                            {followingStatus[followedUser.uid] ? (
                                <><Check className="mr-2 h-4 w-4" /> {t('userProfile.following')}</>
                            ) : (
                                <><Plus className="mr-2 h-4 w-4" /> {t('userProfile.follow')}</>
                            )}
                        </Button>
                    </div>
                    ))}
                </div>
                ) : (
                <div className="p-12 text-center text-muted-foreground">
                    <p>{t('userProfile.notFollowingAnyone').replace('{userName}', user.displayName)}</p>
                </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
