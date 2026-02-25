'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { PropertyCard } from './PropertyCard';
import { Loader2, Sparkles } from 'lucide-react';

export function SanctumPool() {
    const db = useFirestore();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProperties = async () => {
            if (!db) return;
            try {
                // 🚀 逻辑：严格执行单次 50 条文档查询逻辑
                const q = query(
                    collection(db, 'rentalProperties'),
                    where('status', '==', 'active'),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
                const snap = await getDocs(q);
                setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err) {
                console.error("Sanctum Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [db]);

    return (
        <section className="py-32 relative">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* 标题装饰 */}
                <div className="flex flex-col items-center mb-20 text-center space-y-4">
                    <div className="flex items-center gap-4 text-purple-500">
                        <div className="h-px w-12 bg-purple-500/30" />
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.8em]">Certified Listings</span>
                        <div className="h-px w-12 bg-purple-500/30" />
                    </div>
                    
                    <h2 className="text-6xl font-black italic tracking-tighter titanium-text">SANCTUM</h2>
                    
                    {/* 🚀 修正点：完全同步 Certified Listings 的 UI 设计，取消呼吸灯，强制单行 */}
                    <p className="text-purple-500 text-[10px] font-black uppercase tracking-[0.8em] whitespace-nowrap opacity-80">
                        Curated listings published exclusively by verified merchants.
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20 opacity-20"><Loader2 className="animate-spin" /></div>
                ) : properties.length === 0 ? (
                    <div className="text-center py-20 text-white/10 uppercase tracking-[0.5em] italic font-black">No_Assets_Deployed_Yet</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {properties.map(item => (
                            <PropertyCard key={item.id} property={item} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}