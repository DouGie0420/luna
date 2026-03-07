'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { PropertyCard } from './PropertyCard';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

export function SanctumPool() {
    const db = useFirestore();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [indexError, setIndexError] = useState(false); // 🚀 记录索引错误

    useEffect(() => {
        const fetchProperties = async () => {
            if (!db) return;
            try {
                // 🚀 严格执行单次 50 条文档查询逻辑
                const q = query(
                    collection(db, 'rentalProperties'),
                    where('status', '==', 'active'),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
                
                const snap = await getDocs(q);
                setProperties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (err: any) {
                console.error("Sanctum Fetch Error:", err);
                // 🚀 如果控制台报错 "The query requires an index"，说明索引没建
                if (err.message?.includes('index')) {
                    setIndexError(true);
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [db]);

    return (
        <section className="py-32 relative">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="flex flex-col items-center mb-20 text-center space-y-4">
                    <div className="flex items-center gap-4 text-purple-500">
                        <div className="h-px w-12 bg-purple-500/30" />
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-[0.8em]">Certified Listings</span>
                        <div className="h-px w-12 bg-purple-500/30" />
                    </div>
                    <h2 className="text-6xl font-black italic tracking-tighter titanium-text">SANCTUM</h2>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin text-purple-500 w-10 h-10" />
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.5em]">Synchronizing Nodes...</p>
                    </div>
                ) : indexError ? (
                    // 🚀 索引错误提示
                    <div className="text-center py-20 border border-red-500/20 rounded-3xl bg-red-500/5">
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                        <p className="text-red-500 font-black italic uppercase text-xs tracking-widest">Database Indexing Required</p>
                        <p className="text-white/40 text-[10px] mt-2">请检查控制台报错并点击链接创建 Firestore 复合索引。</p>
                    </div>
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