'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductPriceAndPayment } from './product-price-and-payment';
import { BuyNowButton } from './buy-now-button';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

type PaymentMethod = 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

export function ProductPurchaseActions({ product }: { product: Product }) {
    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
    const router = useRouter();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleContactSeller = async () => {
        if (!user || !profile) {
            toast({
                variant: 'destructive',
                title: 'Please login to contact the seller.',
            });
            router.push('/login');
            return;
        }

        if (user.uid === product.seller.id) {
            toast({
                variant: 'destructive',
                title: "You can't message yourself.",
            });
            return;
        }

        if (!firestore) return;

        const chatsRef = collection(firestore, 'direct_chats');
        const q = query(chatsRef, where('participants', 'array-contains', user.uid));
        
        const querySnapshot = await getDocs(q);
        let existingChatId: string | null = null;
        
        querySnapshot.forEach(doc => {
            const chat = doc.data();
            if (chat.participants.includes(product.seller.id)) {
                existingChatId = doc.id;
            }
        });

        if (existingChatId) {
            router.push(`/messages?chatId=${existingChatId}`);
        } else {
            // Create a new chat
            const newChatRef = await addDoc(chatsRef, {
                participants: [user.uid, product.seller.id],
                participantProfiles: {
                    [user.uid]: {
                        displayName: profile.displayName,
                        photoURL: profile.photoURL,
                    },
                    [product.seller.id]: {
                        displayName: product.seller.name,
                        photoURL: product.seller.avatarUrl,
                    }
                },
                lastMessage: `Regarding your item: ${product.name}`,
                lastMessageTimestamp: serverTimestamp(),
                // Default settings for a new chat
                isFriendMode: false, // You can add logic to check mutual follow
                hasReplied: false,
                initiatorId: user.uid,
                initialMessageCount: 0,
                unreadCount: { [user.uid]: 0, [product.seller.id]: 0 }
            });
            router.push(`/messages?chatId=${newChatRef.id}`);
        }
    };


    return (
        <>
            <ProductPriceAndPayment 
                product={product} 
                selectedPayment={selectedPayment} 
                setSelectedPayment={setSelectedPayment} 
            />

            <div className="flex gap-2">
                <Button size="lg" variant="secondary" className="flex-1 h-14 text-lg" onClick={handleContactSeller}>
                    联系卖家
                </Button>
                <BuyNowButton product={product} selectedPayment={selectedPayment} />
            </div>
        </>
    );
}
