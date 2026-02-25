'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy, startAfter } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ProductCard } from '@/components/product-card'; // 🚀 确保引用的是首页同款组件
import { Loader2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AllRentalPropertiesPage() {
    const db = useFirestore();
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(false);

    const fetchProperties = async (isLoadMore = false) => {
        if (!db) return;
        setLoading(true);
        try {
            // 🛡️ 严格执行单次 50 条文档查询逻辑 [cite: 2026-02-07]
            let q = query(
                collection(db, 'rentalProperties'),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );

            if (isLoadMore && lastDoc) {
                q = query(
                    collection(db, 'rentalProperties'),
                    where('status', '==', 'active'),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastDoc),
                    limit(50)
                );
            }

            const snap = await getDocs(q);
            const newData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            if (isLoadMore) {
                setProperties(prev => [...prev, ...newData]);
            } else {
                setProperties(newData);
            }

            setLastDoc(snap.docs[snap.docs.length - 1]);
            setHasMore(snap.docs.length === 50);
        } catch (err) {
            console.error("Sanctum Sync Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [db]);

    return (
        <div className="min-h-screen bg-[#020202] text-white pb-32">
            {/* 赛博风格背景网格线 */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
            
            <PageHeaderWithBackAndClose />

            <main className="container mx-auto px-4 pt-32 relative z-10">
                <div className="flex flex-col items-center mb-16 space-y-4">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="px-4 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-[10px] font-black uppercase tracking-[0.5em] text-purple-400"
                    >
                        Sector_Data_Sync
                    </motion.div>
                    <h1 className="text-6xl font-black italic titanium-title tracking-tighter uppercase">Into The Sanctum</h1>
                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest text-center">Protocol V1.0 • All Active Residential Nodes</p>
                </div>

                {loading && properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="animate-spin text-purple-500 mb-4" size={40} />
                        <span className="font-mono text-xs text-white/20 uppercase tracking-widest">Accessing_Network_Archive...</span>
                    </div>
                ) : (
                    <>
                        {/* 🚀 关键：套用首页 4 列网格布局，确保卡片尺寸一致 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <AnimatePresence>
                                {properties.map((prop, idx) => (
                                    <motion.div
                                        key={prop.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (idx % 8) * 0.05 }}
                                    >
                                        {/* 🚀 映射数据逻辑：修正 404 跳转并补全用户信息 */}
                                        <ProductCard product={{ 
                                            ...prop, 
                                            // 1. 修正跳转路径到 /products/rental/[id]
                                            id: `rental/${prop.id}`, 
                                            // 2. 兼容标题
                                            name: prop.title || prop.name,
                                            // 3. 映射用户信息，确保头像和名字显示
                                            seller: prop.seller || {
                                                id: prop.ownerId,
                                                name: prop.ownerDisplayName || prop.ownerName || 'Luna Owner',
                                                avatarUrl: prop.ownerAvatarUrl || prop.ownerPhotoURL,
                                            },
                                            // 4. 映射价格与分类
                                            price: prop.pricePerDay || prop.price,
                                            category: prop.propertyType || prop.category || 'Rental',
                                            currency: prop.currency || '₮'
                                        }} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {hasMore && (
                            <div className="mt-20 flex justify-center">
                                <Button 
                                    onClick={() => fetchProperties(true)}
                                    disabled={loading}
                                    className="bg-transparent border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 rounded-full px-16 py-8 text-sm font-black uppercase tracking-[0.3em] transition-all active:scale-95"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : "Sync Next 50 Blocks"}
                                </Button>
                            </div>
                        )}

                        {!hasMore && properties.length > 0 && (
                            <div className="mt-20 text-center text-white/10 font-black uppercase text-[10px] tracking-[0.8em]">
                                End_Of_Sector_Archive
                            </div>
                        )}

                        {properties.length === 0 && !loading && (
                            <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                                <Box className="text-white/5 mb-6" size={80} />
                                <p className="text-white/20 font-black uppercase tracking-widest italic">No Data Nodes Found in This Sector</p>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}