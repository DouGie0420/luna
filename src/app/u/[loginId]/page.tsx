'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/use-translation";
import { Gem, ShoppingBag, ShoppingCart, Star, Users, UserPlus, ShieldCheck, Plus, Check, Globe, Fingerprint, Lock, Terminal, MessageSquare } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import type { UserProfile, Product } from "@/lib/types";
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProductCard } from "@/components/product-card";
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { doc, collection, query, where, updateDoc, increment, arrayUnion, arrayRemove, getDocs, limit, writeBatch, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

// --- 赛博朋克保留域名界面 ---
function ReservedDomainUI({ loginId }: { loginId: string }) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="flex items-center justify-center min-h-[70vh] p-6">
        <div className="max-w-md w-full border-2 border-primary/30 bg-black/80 p-8 rounded-none relative overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-primary/10 rounded-full border border-primary/50">
              <Lock className="h-12 w-12 text-primary animate-bounce" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">
                [ ACCESS RESTRICTED ]
              </h1>
              <p className="text-primary font-mono text-sm uppercase tracking-widest">
                NODE ID: @{loginId}
              </p>
            </div>
            <Separator className="bg-primary/20" />
            <div className="bg-primary/5 p-4 w-full font-mono text-xs text-left space-y-2 border-l-2 border-primary">
              <p className="text-primary/70 flex items-center gap-2">
                <Terminal className="h-3 w-3" /> {">"} STATUS: PROTECTED_ASSET
              </p>
              <p className="text-primary/70 flex items-center gap-2">
                <Terminal className="h-3 w-3" /> {">"} REGISTRY: LUNA_CORE_RESERVED
              </p>
              <p className="text-primary/70 flex items-center gap-2">
                <Terminal className="h-3 w-3" /> {">"} PERMISSION: ADMIN_ONLY
              </p>
            </div>
            <p className="text-muted-foreground text-sm italic">
              该域名已被纳入 LUNA 系统专属保留名录，普通访问节点无法直接解析其生物特征数据。
            </p>
            <Button asChild className="w-full rounded-none" variant="outline">
              <Link href="/">{t('common.backToHome')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

const EthereumIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1.75l-6.172 9.5L12 17.5l6.172-6.25L12 1.75z"/>
        <path d="M5.828 12.5L12 22.25l6.172-9.75L12 17.5 5.828 12.5z"/>
    </svg>
);

function UserProfileSkeleton() {
    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="p-6 md:p-8 lg:p-12">
                <div className="grid gap-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-20 w-20 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-32" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <Skeleton className="h-24 w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const identifier = params.loginId as string;
    
    const { user: currentUser, profile: currentUserProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [user, setUser] = useState<UserProfile | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const [isReserved, setIsReserved] = useState(false);

    const productsQuery = useMemo(() => {
      if (!firestore || !user) return null;
      return query(collection(firestore, 'products'), where('sellerId', '==', user.uid), where('status', '==', 'active'), limit(8));
    }, [firestore, user]);
    const { data: products, loading: productsLoading } = useCollection<Product>(productsQuery);
    
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        if (!firestore || !identifier) return;

        const fetchUser = async () => {
            setUserLoading(true);
            try {
                let userDoc;
                const isLikelyUid = identifier.length > 20 && !/^\d+$/.test(identifier);

                if (isLikelyUid) {
                    const userRef = doc(firestore, 'users', identifier);
                    userDoc = await getDoc(userRef);
                } else {
                    const usersRef = collection(firestore, 'users');
                    const q = query(usersRef, where('loginId', '==', identifier), limit(1));
                    const querySnapshot = await getDocs(q);
                    userDoc = querySnapshot.docs[0];
                }
                
                if (userDoc && userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    setUser(userData);
                    setIsReserved(false);
                    if (currentUserProfile && userData) {
                        setIsFollowing(currentUserProfile.following?.includes(userData.uid) || false);
                    }
                } else {
                    setUser(null);
                    setIsReserved(false);
                }
            } catch (error: any) {
                if (error.code === 'permission-denied') {
                    console.log("Detecting reserved/protected node via permission-denied");
                    setIsReserved(true);
                } else {
                    console.error("Fetch User Error:", error);
                    setUser(null);
                }
            } finally {
                setUserLoading(false);
            }
        };

        fetchUser();
    }, [firestore, identifier, currentUserProfile]);
    

    const handleFollowToggle = async () => {
        if (!currentUser || !currentUserProfile || !user || !firestore) {
            toast({ variant: 'destructive', title: t('common.loginToInteract') });
            return;
        }
    
        const newFollowingState = !isFollowing;
    
        // Optimistic UI update
        setIsFollowing(newFollowingState);
    
        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const targetUserRef = doc(firestore, 'users', user.uid);
        
        const batch = writeBatch(firestore);
    
        try {
            // Update current user's following list and count
            batch.update(currentUserRef, {
                following: newFollowingState ? arrayUnion(user.uid) : arrayRemove(user.uid),
                followingCount: increment(newFollowingState ? 1 : -1)
            });
    
            // Update target user's followers list and count
            batch.update(targetUserRef, {
                followers: newFollowingState ? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
                followersCount: increment(newFollowingState ? 1 : -1)
            });
            
            await batch.commit();
            
            toast({ title: newFollowingState ? t('userProfile.followedSuccess') : t('userProfile.unfollowedSuccess') });
    
        } catch (error) {
            // Revert optimistic update on error
            setIsFollowing(!newFollowingState);
            
            console.error("Failed to update follow status:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `users/${user.uid} or users/${currentUser.uid}`,
                operation: 'update',
            }));
        }
    };
    
    const handleSendMessage = async () => {
        if (!currentUser || !currentUserProfile || !user) {
            toast({ variant: 'destructive', title: 'Please login to send a message.' });
            router.push('/login');
            return;
        }
        if (!firestore) return;

        const chatsRef = collection(firestore, 'direct_chats');
        const q = query(chatsRef, where('participants', 'array-contains', currentUser.uid));
        
        const querySnapshot = await getDocs(q);
        let existingChatId: string | null = null;
        
        querySnapshot.forEach(doc => {
            const chat = doc.data();
            if (chat.participants.includes(user.uid)) {
                existingChatId = doc.id;
            }
        });

        if (existingChatId) {
            router.push(`/messages?chatId=${existingChatId}`);
        } else {
            const newChatRef = await addDoc(chatsRef, {
                participants: [currentUser.uid, user.uid],
                participantProfiles: {
                    [currentUser.uid]: {
                        displayName: currentUserProfile.displayName,
                        photoURL: currentUserProfile.photoURL,
                    },
                    [user.uid]: {
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                    }
                },
                lastMessage: '',
                lastMessageTimestamp: serverTimestamp(),
                isFriendMode: false, 
                hasReplied: false,
                initiatorId: currentUser.uid,
                initialMessageCount: 0,
                unreadCount: { [currentUser.uid]: 0, [user.uid]: 0 }
            });
            router.push(`/messages?chatId=${newChatRef.id}`);
        }
    };

    if (userLoading) {
        return <UserProfileSkeleton />;
    }

    if (isReserved) {
        return <ReservedDomainUI loginId={identifier} />;
    }

    if (!user) {
      return notFound();
    }

    return (
      <>
        <PageHeaderWithBackAndClose />
        <div className="p-6 md:p-8 lg:p-12">
            <div className="grid gap-8">
                {/* 这里的布局代码保持不变，已经正常渲染 user */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <UserAvatar profile={user} className="h-20 w-20" />
                                <div>
                                    <div className="flex items-baseline gap-x-4">
                                        <CardTitle>{user.displayName}</CardTitle>
                                    </div>
                                    <Separator className="my-1.5" />
                                    <div className="flex items-center gap-x-3 text-sm text-muted-foreground">
                                        <Link href={`/@${user.loginId}/followers`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.followersCount || 0}</span> {t('userProfile.followers')}
                                        </Link>
                                        <span>&middot;</span>
                                        <Link href={`/@${user.loginId}/following`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.followingCount || 0}</span> {t('userProfile.following')}
                                        </Link>
                                        <span>&middot;</span>
                                        <Link href={`/@${user.loginId}/listings`} className="hover:underline">
                                            <span className="font-bold text-foreground">{user.postsCount || 0}</span> {t('userProfile.posts')}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                {currentUser && currentUser.uid !== user.uid && (
                                    <>
                                        <Button onClick={handleSendMessage} variant="outline">
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Message
                                        </Button>
                                        <Button 
                                            onClick={handleFollowToggle} 
                                            variant={'default'}
                                            className={cn("rounded-md", isFollowing && 'bg-yellow-400 text-black hover:bg-yellow-500')}
                                        >
                                            {isFollowing ? (
                                                <><Check className="mr-2 h-4 w-4" />{t('userProfile.alreadyFollowing')}</>
                                            ) : (
                                                <><Plus className="mr-2 h-4 w-4" />{t('userProfile.follow')}</>
                                            )}
                                        </Button>
                                    </>
                                )}
                             </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="flex items-center gap-4 p-4 bg-accent/50 rounded-lg animate-glow">
                            <Gem className="h-10 w-10 text-primary" />
                            <div className="flex-1">
                                <p className="text-sm text-muted-foreground">{t('accountPage.creditLevel')}</p>
                                <p className="text-2xl font-bold">{user.creditLevel || 'Newcomer'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">{t('accountPage.creditScore')}</p>
                                <p className="text-2xl font-bold">{user.creditScore || 0}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                             <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                                <Star className="h-6 w-6 text-primary" />
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('accountPage.rating')}</p>
                                    <p className="font-bold">
                                        {(user.rating || 0).toFixed(1)} 
                                        <span className="text-xs text-muted-foreground font-normal"> ({user.reviewsCount || 0} {t('accountPage.reviews')})</span>
                                    </p>
                                </div>
                            </div>
                            <Link href={`/@${user.loginId}/listings`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                <div className="flex items-center gap-3 p-3">
                                    <ShoppingBag className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('sellerProfile.onSale')}</p>
                                        <p className="font-bold group-hover:underline">{user.onSaleCount ?? 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href={`/@${user.loginId}/sold`} className="block bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors group">
                                <div className="flex items-center gap-3 p-3">
                                    <ShoppingCart className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{t('sellerProfile.sold')}</p>
                                        <p className="font-bold group-hover:underline">{user.salesCount || 0}</p>
                                    </div>
                                </div>
                            </Link>
                            <div className="p-3 bg-secondary/30 rounded-lg flex flex-col justify-center">
                                <p className="text-sm text-muted-foreground mb-2">{t('userProfile.verifications')}</p>
                                <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                                    {user.isPro && (
                                        <div className="flex items-center gap-1.5 text-green-500">
                                            <ShieldCheck className="h-4 w-4" />
                                            <span>{t('userProfile.pro')}</span>
                                        </div>
                                    )}
                                    {user.isWeb3Verified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <Globe className="h-4 w-4" />
                                            <span>WEB3</span>
                                        </div>
                                    )}
                                    {user.isNftVerified && (
                                        <div className="flex items-center gap-1.5 text-blue-400">
                                            <EthereumIcon className="h-4 w-4 stroke-blue-400" />
                                            <span>NFT</span>
                                        </div>
                                    )}
                                    {user.kycStatus === 'Verified' && (
                                        <div className="flex items-center gap-1.5 text-yellow-400">
                                            <Fingerprint className="h-4 w-4" />
                                            <span>{t('userProfile.kyc')}</span>
                                        </div>
                                    )}
                                    {!user.isPro && !user.isWeb3Verified && !user.isNftVerified && user.kycStatus !== 'Verified' && (
                                        <p className="text-xs text-muted-foreground">{t('userProfile.noVerifications')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {products && products.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>{t('userProfile.latestListings').replace('{userName}', user.displayName || '')}</CardTitle>
                             <Button asChild variant="ghost">
                                <Link href={`/@${user.loginId}/listings`}>View All</Link>
                             </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
      </>
    )
}

    