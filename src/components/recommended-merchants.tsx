'use client';

import { useMemo } from 'react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useFirestore, useCollection } from '@/firebase';
import { UserAvatar } from '@/components/ui/user-avatar';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BadgeCheck } from 'lucide-react';

export function RecommendedMerchants() {
    const firestore = useFirestore();

    // 🚀 核心查询：严格匹配后台索引 (isPro + displayPriority)，强制限制最多拉取 50 条
    const merchantsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('isPro', '==', true),
            orderBy('displayPriority', 'desc'),
            limit(50)
        );
    }, [firestore]);

    const { data: merchants, loading } = useCollection(merchantsQuery);

    if (loading) {
        return (
            <div className="w-full overflow-hidden py-8">
                <div className="flex gap-6 justify-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="w-20 h-20 rounded-full bg-white/5 border border-primary/20" />
                    ))}
                </div>
            </div>
        );
    }

    if (!merchants || merchants.length === 0) return null;

    return (
        <div className="w-full py-8 relative">
            {/* 流体光晕背景 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-20 bg-primary/10 blur-[80px] pointer-events-none rounded-full" />
            
            <div className="flex overflow-x-auto gap-6 pb-4 px-4 scrollbar-hide snap-x justify-start md:justify-center relative z-10">
                {merchants.map((merchant: any) => (
                    <Link 
                        key={merchant.id} 
                        href={`/u/${merchant.loginId || merchant.id}`}
                        className="flex flex-col items-center gap-2 snap-center group shrink-0"
                    >
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-blue-500 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                            <div className="relative border-2 border-white/10 group-hover:border-primary/50 rounded-full transition-colors bg-black p-1">
                                <UserAvatar user={merchant} className="w-16 h-16 md:w-20 md:h-20 rounded-full" />
                            </div>
                            <BadgeCheck className="absolute -bottom-1 -right-1 w-6 h-6 text-primary fill-black bg-black rounded-full" />
                        </div>
                        <span className="text-xs font-mono font-bold text-white/60 group-hover:text-white transition-colors uppercase truncate max-w-[80px] text-center">
                            {merchant.username || 'NODE'}
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}