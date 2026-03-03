'use client';

import { useEffect, useState } from 'react';
import { getUsers } from "@/lib/data";
import { notFound } from "next/navigation";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Check } from 'lucide-react';
import Link from 'next/link';

interface ClientFollowingProps {
  id: string;
}

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

export default function ClientFollowing({ id }: ClientFollowingProps) {
    const { t } = useTranslation();
    const userId = id;

    const [user, setUser] = useState<User | null>(null);
    const [following, setFollowing] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Dummy state for follow buttons
    const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            const [allUsers] = await Promise.all([getUsers()]);
            const foundUser = allUsers.find(u => u.id === userId);

            if (foundUser) {
                setUser(foundUser);
                // Mock following data
                const mockFollowing = allUsers.filter(u => u.id !== userId).slice(0, Math.floor(Math.random() * 8) + 2);
                setFollowing(mockFollowing);
                const initialStatus: Record<string, boolean> = {};
                mockFollowing.forEach(u => {
                    initialStatus[u.id] = Math.random() > 0.5;
                });
                setFollowingStatus(initialStatus);
            }
            setLoading(false);
        };
        fetchData();

    }, [userId]);

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

    return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
            <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-headline">{t('userProfile.usersFollowing').replace('{userName}', user.name)}</h1>
        </div>

        <Card>
            <CardContent className="p-0">
                {following.length > 0 ? (
                <div className="divide-y">
                    {following.map((followedUser) => (
                    <div key={followedUser.id} className="flex items-center gap-4 p-4">
                        <Link href={`/user/${followedUser.id}`} className="flex items-center gap-4 flex-1">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={followedUser.avatarUrl} alt={followedUser.name} />
                                <AvatarFallback>{followedUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold hover:underline">{followedUser.name}</p>
                        </Link>
                        <Button
                            variant={followingStatus[followedUser.id] ? 'outline' : 'default'}
                            onClick={() => toggleFollow(followedUser.id)}
                        >
                            {followingStatus[followedUser.id] ? (
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
                    <p>{t('userProfile.noFollowing').replace('{userName}', user.name)}</p>
                </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}
