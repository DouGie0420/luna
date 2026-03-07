'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs, type DocumentData } from 'firebase/firestore';
import Link from 'next/link';
import { ShieldCheck, Zap } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { UserAvatar } from './ui/user-avatar'; // 🚀 刚才就是把这个组件引用弄丢了！
import { cn } from '@/lib/utils';

export function ProMerchants() {
  const firestore = useFirestore();
  const [merchants, setMerchants] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const fetchProMerchants = async () => {
      setLoading(true);
      try {
        // 🚀 核心安全协议：强制包含 limit(50)，通过 Firestore Rules 校验 [cite: 2026-02-07]
        const q = query(
          collection(firestore, 'users'),
          where('isPro', '==', true),
          orderBy('creditScore', 'desc'),
          limit(50) 
        );

        const snapshot = await getDocs(q);
        
        // 🛡️ 容错处理：如果带排序的查不到（可能是数据没 creditScore 字段），退回到基础查询
        if (snapshot.empty) {
          console.warn("ProMerchants: 排序查询无结果，尝试基础查询...");
          const qSimple = query(
            collection(firestore, 'users'),
            where('isPro', '==', true),
            limit(50)
          );
          const simpleSnapshot = await getDocs(qSimple);
          setMerchants(simpleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setMerchants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error: any) {
        console.error("ProMerchants 获取失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProMerchants();
  }, [firestore]);

  if (loading) {
    return (
      <section className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 bg-white/5 rounded-lg mb-6" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-32 shrink-0 rounded-[24px] bg-white/5" />
          ))}
        </div>
      </section>
    );
  }

  // 没有任何 PRO 商户时隐藏
  if (merchants.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8 md:py-12 relative z-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-8 w-1.5 bg-gradient-to-b from-yellow-300 to-violet-500 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
        <h2 className="font-headline text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">
          PRO Merchants
        </h2>
        <div className="px-2 py-0.5 rounded border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 text-[10px] font-black italic uppercase ml-2 flex items-center gap-1">
          <Zap className="h-3 w-3" /> VERIFIED
        </div>
      </div>

      <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-4 snap-x snap-mandatory scrollbar-hide">
        {merchants.map((merchant) => (
          <Link 
            href={`/u/${merchant.loginId || merchant.id}`} 
            key={merchant.id}
            className="group shrink-0 snap-start w-[140px] md:w-[160px] relative rounded-[32px] bg-black/40 backdrop-blur-xl border border-white/5 hover:border-primary/50 transition-all duration-300 hover:scale-105 overflow-hidden flex flex-col items-center p-6 shadow-2xl"
          >
            {/* 悬停流光背景 */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative mb-4">
              <UserAvatar profile={merchant} className="h-16 w-16 md:h-20 md:w-20 rounded-full ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300" />
              <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-1 border border-white/10 shadow-lg">
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </div>
            </div>
            
            <h3 className="font-headline text-sm font-bold text-white truncate w-full text-center group-hover:text-primary transition-colors">
              {merchant.displayName || merchant.name || 'Unknown'}
            </h3>
            
            <p className="text-[10px] font-mono text-white/40 mt-1 uppercase tracking-widest">
              TRUST: {merchant.creditScore || 0}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}