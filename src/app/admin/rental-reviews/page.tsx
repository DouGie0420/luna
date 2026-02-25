'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore, useUser } from '@/firebase';
import { 
    collection, query, where, getDocs, 
    updateDoc, doc, orderBy, limit, serverTimestamp 
} from 'firebase/firestore';
import { 
    ShieldCheck, XCircle, FileText, Eye, 
    User, CheckCircle2, Loader2, AlertCircle,
    ShieldAlert
} from 'lucide-react';
import Image from 'next/image';

export default function RentalReviewPage() {
    const db = useFirestore();
    // 🚀 修复点 1：同时获取 user (Auth对象) 和 profile (Firestore对象)
    const { user, profile, loading: userLoading } = useUser(); 
    
    const [queue, setQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // 1. 分页加载 (最多50条)
    useEffect(() => {
        const fetchPending = async () => {
            if (!db) return;
            try {
                const q = query(
                    collection(db, 'rentalProperties'),
                    where('status', '==', 'pending_review'),
                    orderBy('createdAt', 'desc'),
                    limit(50)
                );
                const snap = await getDocs(q);
                setQueue(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Fetch Queue Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPending();
    }, [db]);

    // 2. 审批逻辑 (仅限 admin, ghost, staff)
    const handleAudit = async (decision: 'active' | 'rejected') => {
        // 🚀 修复点 2：确保 user, db, selected 均存在
        if (!db || !selected || !user || !profile) return;
        
        const allowedRoles = ['admin', 'ghost', 'staff'];
        if (!allowedRoles.includes(profile.role || '')) {
            alert("您没有审批权限。");
            return;
        }

        setIsActionLoading(true);
        try {
            // A. 更新房源状态
            await updateDoc(doc(db, 'rentalProperties', selected.id), {
                status: decision,
                auditedBy: user.uid, // 🚀 修复点 3：使用 user.uid 而非 profile.uid
                auditedAt: serverTimestamp(),
                trustScore: decision === 'active' ? 99.8 : 0
            });

            // B. 批准后自动升级房东为 PRO
            if (decision === 'active') {
                await updateDoc(doc(db, 'users', selected.ownerId), {
                    isPro: true,
                    proLevel: 'Verified Host',
                    globalTrustScore: 99.8
                });
            }

            setQueue(prev => prev.filter(i => i.id !== selected.id));
            setSelected(null);
        } catch (err) {
            console.error("Audit Action Error:", err);
        } finally {
            setIsActionLoading(false);
        }
    };

    if (userLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 antialiased text-white font-sans">
            
            {/* 左侧：申请工单列表 */}
            <div className="w-1/3 bg-white/5 rounded-3xl border border-white/10 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-white/5">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        房源审核队列 ({queue.length})
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin opacity-50" /></div>
                    ) : queue.length === 0 ? (
                        <div className="text-center p-12 text-white/20 font-medium">暂无待处理工单</div>
                    ) : queue.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelected(item)}
                            className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${
                                selected?.id === item.id 
                                ? 'bg-purple-500/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
                                : 'bg-white/5 border-transparent hover:bg-white/10'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[10px] font-mono text-white/40 tracking-widest">#{item.id.slice(-6).toUpperCase()}</span>
                                <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-full uppercase font-black text-purple-300 border border-purple-500/30">{item.propertyType}</span>
                            </div>
                            <h3 className="font-bold truncate text-lg leading-tight">{item.title}</h3>
                            <p className="text-xs text-white/30 mt-3 flex items-center gap-2 font-mono">
                                <User className="w-3 h-3" /> {item.ownerId.slice(0, 12)}...
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* 右侧：详细认证信息预览区 */}
            <div className="flex-1 bg-white/5 rounded-3xl border border-white/10 overflow-y-auto relative">
                {selected ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-10 space-y-12"
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-3">
                                <h1 className="text-4xl font-black tracking-tighter italic">{selected.title}</h1>
                                <p className="text-white/50 max-w-2xl leading-relaxed">{selected.description}</p>
                            </div>
                            <div className="text-right bg-purple-500/10 p-6 rounded-3xl border border-purple-500/20">
                                <p className="text-[10px] text-purple-400 mb-1 font-black tracking-[0.2em] uppercase">Starting Price</p>
                                <p className="text-4xl font-black text-white font-mono">₮ {selected.pricePerDay}</p>
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

                        {/* KYC 资料预览 */}
                        <div className="space-y-8">
                            <h3 className="text-xl font-bold flex items-center gap-3">
                                <ShieldAlert className="w-6 h-6 text-yellow-500" />
                                <span className="tracking-tight">关键认证资料 (KYC Data)</span>
                            </h3>
                            <div className="grid grid-cols-3 gap-8">
                                {[
                                    { label: '房屋所有权证明', url: selected.verificationDocs?.ownership },
                                    { label: '身份证明 (正面)', url: selected.verificationDocs?.idFront },
                                    { label: '持证人自拍', url: selected.verificationDocs?.selfie }
                                ].map((doc, idx) => (
                                    <div key={idx} className="group space-y-4">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">{doc.label}</p>
                                        <div className="relative aspect-[3/4] rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 ring-offset-4 ring-offset-black transition-all group-hover:ring-2 group-hover:ring-purple-500/50">
                                            {doc.url ? (
                                                <>
                                                    <Image src={doc.url} alt={doc.label} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                        <button 
                                                            onClick={() => window.open(doc.url)} 
                                                            className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
                                                        >
                                                            <Eye className="w-6 h-6" />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 space-y-2">
                                                    <AlertCircle className="w-8 h-8" />
                                                    <span className="text-[10px] font-bold tracking-widest uppercase">Null_Data</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

                        {/* 底部审批工具栏 */}
                        <div className="flex gap-6 pt-6">
                            <button
                                onClick={() => handleAudit('active')}
                                disabled={isActionLoading}
                                className="flex-1 h-20 bg-white text-black rounded-[1.5rem] font-black text-lg uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] disabled:opacity-20"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" /> : <ShieldCheck className="w-7 h-7" />}
                                批准发布 (Approve)
                            </button>
                            <button
                                onClick={() => handleAudit('rejected')}
                                disabled={isActionLoading}
                                className="px-12 h-20 border-2 border-white/10 rounded-[1.5rem] font-bold text-white/30 hover:border-red-500/50 hover:text-red-500 transition-all active:scale-[0.98] disabled:opacity-20"
                            >
                                驳回 (Reject)
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-white/5 space-y-6">
                        <AlertCircle className="w-24 h-24 stroke-[0.5] animate-pulse" />
                        <p className="font-mono text-xs tracking-[0.5em] uppercase italic">Protocol_Standby_Mode</p>
                    </div>
                )}
            </div>
        </div>
    );
}