'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';
import { Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface ClientFollowersProps {
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

export default function ClientFollowers({ id }: ClientFollowersProps) {
    const { t } = useTranslation();
    const firestore = useFirestore();
    const { user: currentUser, profile: currentUserProfile } = useUser();
    const { toast } = useToast();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (currentUserProfile) {
            const initialStatus: Record<string, boolean> = {};
            followers.forEach(f => {
                if (currentUserProfile.following?.includes(f.uid)) {
                    initialStatus[f.uid] = true;
                }
            });
            setFollowingStatus(initialStatus);
        }
    }, [currentUserProfile, followers]);

    useEffect(() => {
        if (!firestore || !id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const userDoc = await getDoc(doc(firestore, 'users', id));
                if (!userDoc.exists()) { setLoading(false); return; }

                const foundUser = userDoc.data() as UserProfile;
                setUser(foundUser);

                if (foundUser.followers && foundUser.followers.length > 0) {
                    const usersRef = collection(firestore, 'users');
                    const followersQuery = query(usersRef, where('uid', 'in', foundUser.followers.slice(0, 30)));
                    const followersSnapshot = await getDocs(followersQuery);
                    setFollowers(followersSnapshot.docs.map(d => d.data() as UserProfile));
                } else {
                    setFollowers([]);
                }
            } catch (e) {
                console.error('Failed to load followers', e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [firestore, id]);

    const toggleFollow = async (targetUserId: string) => {
        if (!currentUser || !currentUserProfile || !firestore) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }

        const isCurrentlyFollowing = followingStatus[targetUserId];
        const newFollowingState = !isCurrentlyFollowing;
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: newFollowingState }));

        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const targetUserRef = doc(firestore, 'users', targetUserId);
        const batch = writeBatch(firestore);

        try {
            batch.update(currentUserRef, {
                following: newFollowingState ? arrayUnion(targetUserId) : arrayRemove(targetUserId),
                followingCount: increment(newFollowingState ? 1 : -1)
            });
            batch.update(targetUserRef, {
                followers: newFollowingState ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
                followersCount: increment(newFollowingState ? 1 : -1)
            });
            await batch.commit();
        } catch (error) {
            setFollowingStatus(prev => ({ ...prev, [targetUserId]: isCurrentlyFollowing }));
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${targetUserId} or users/${currentUser.uid}`,
                operation: 'update',
            }));
        }
    };

    if (loading) {
        return (
            <>
                <PageHeaderWithBackAndClose />
                <UserListPageSkeleton />
            </>
        );
    }

    if (!user) return notFound();

    const userProfileUrl = user.loginId ? `/@${user.loginId}` : `/user/${id}`;

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <Link href={userProfileUrl}>
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.photoURL} alt={user.displayName} />
                            <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <h1 className="text-3xl font-headline">{t('userProfile.usersFollowers').replace('{userName}', user.displayName || '')}</h1>
                </div>

                <Card>
                    <CardContent className="p-0">
                        {followers.length > 0 ? (
                            <div className="divide-y">
                                {followers.map((follower) => (
                                    <div key={follower.uid} className="flex items-center gap-4 p-4 hover:bg-accent transition-colors">
                                        <Link href={follower.loginId ? `/@${follower.loginId}` : `/user/${follower.uid}`} className="flex items-center gap-4 flex-1">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={follower.photoURL} alt={follower.displayName} />
                                                <AvatarFallback>{follower.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <p className="font-headline font-semibold hover:underline">{follower.displayName}</p>
                                        </Link>
                                        {currentUser?.uid !== follower.uid && (
                                            <Button
                                                variant={followingStatus[follower.uid] ? 'outline' : 'default'}
                                                onClick={() => toggleFollow(follower.uid)}
                                            >
                                                {followingStatus[follower.uid] ? (
                                                    <><Check className="mr-2 h-4 w-4" /> {t('userProfile.following')}</>
                                                ) : (
                                                    <><Plus className="mr-2 h-4 w-4" /> {t('userProfile.follow')}</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <p>{t('userProfile.noFollowers').replace('{userName}', user.displayName || '')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
