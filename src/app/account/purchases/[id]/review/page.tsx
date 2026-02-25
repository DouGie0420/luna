'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Order, Product, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ThumbsUp, ThumbsDown, Meh, Sparkles, ShieldCheck, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaveReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser } = useUser();
    const firestore = useFirestore();
    const orderId = (params.id || params.orderId) as string;

    const [selectedVerdict, setSelectedVerdict] = useState<'positive' | 'neutral' | 'negative' | null>(null);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: order, loading: orderLoading } = useDoc<Order>(firestore && orderId ? doc(firestore, 'orders', orderId) : null);
    const { data: product } = useDoc<Product>(firestore && order?.productId ? doc(firestore, 'products', order.productId) : null);
    const { data: seller } = useDoc<UserProfile>(firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null);

    const handleSubmit = async () => {
        if (!selectedVerdict || !firestore || !currentUser || !order || !order.sellerId || order.isReviewed) return;
        setIsSubmitting(true);
        const batch = writeBatch(firestore);
        
        try {
            // 🚀 1. 映射分数与星级
            const scoreMod = selectedVerdict === 'positive' ? 5 : selectedVerdict === 'negative' ? -20 : 0;
            const starValue = selectedVerdict === 'positive' ? 5 : selectedVerdict === 'negative' ? 1 : 3;
            const field = selectedVerdict === 'positive' ? 'goodReviews' : selectedVerdict === 'negative' ? 'badReviews' : 'neutralReviews';

            // 🚀 2. 使用 order.id 作为评价文档 ID，物理层面禁止重复
            const reviewRef = doc(firestore, 'reviews', order.id);
            batch.set(reviewRef, {
                orderId: order.id,
                reviewerId: currentUser.uid,
                targetUserId: order.sellerId, 
                type: selectedVerdict,
                comment,
                createdAt: serverTimestamp(),
            });

            // 🚀 3. 更新卖家数据（含 500 初始分修正逻辑）
            const sellerRef = doc(firestore, 'users', order.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            const currentData = sellerSnap.data();
            
            // 如果 creditScore 不存在，初始化为 500
            const initialScore = currentData?.creditScore === undefined ? 500 : 0;
            
            // 计算新的平均星级
            const currentRating = currentData?.rating || 0;
            const currentCount = currentData?.reviewsCount || 0;
            const newRating = ((currentRating * currentCount) + starValue) / (currentCount + 1);

            batch.update(sellerRef, {
                creditScore: increment(initialScore + scoreMod),
                rating: newRating,
                reviewsCount: increment(1),
                [field]: increment(1)
            });

            // 🚀 4. 锁定订单状态
            batch.update(doc(firestore, 'orders', order.id), { isReviewed: true });

            await batch.commit();
            toast({ title: "PROTOCOL_SIGNED", description: "信譽日誌已永久同步至 LUNA 核心。" });
            router.push(`/account/purchases/${orderId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'TRANSMISSION_ERROR' });
        } finally { setIsSubmitting(false); }
    };

    if (orderLoading || !order || !product || !seller) return <div className="h-screen flex items-center justify-center bg-black gap-4"><Loader2 className="w-10 h-10 text-primary animate-spin" /><p className="font-mono text-primary animate-pulse text-[10px] uppercase tracking-[0.4em]">Initializing_Protocol...</p></div>;

    if (order.isReviewed) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#050505] p-6 text-center">
                <ShieldCheck className="h-20 w-20 text-primary mb-6 animate-pulse" />
                <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-white">Log_Already_Signed</h1>
                <p className="text-white/40 text-sm max-w-xs mb-8 font-mono">判定數據已寫入 LUNA 數據鏈，無法二次修改。</p>
                <Button onClick={() => router.back()} className="rounded-full bg-white/5 border border-white/10 px-12 py-6 text-xs font-black tracking-widest hover:bg-primary hover:text-black transition-all">RETURN_TO_BASE</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            <PageHeaderWithBackAndClose />
            <main className="container mx-auto max-w-2xl px-4 py-32 relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-14 shadow-2xl relative">
                    <header className="text-center space-y-4 mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.3em] text-primary"><Sparkles className="w-3 h-3" /> REPUTATION_VERDICT</div>
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter italic">簽署交易判定</h1>
                        <p className="text-white/40 font-mono text-[10px] uppercase">Node: {seller.displayName}</p>
                    </header>
                    <div className="space-y-12">
                        <div className="grid grid-cols-3 gap-5">
                            {[
                                { id: 'positive', icon: ThumbsUp, label: 'Positive', color: 'text-green-400', score: '+5' },
                                { id: 'neutral', icon: Meh, label: 'Neutral', color: 'text-yellow-400', score: '0' },
                                { id: 'negative', icon: ThumbsDown, label: 'Negative', color: 'text-red-400', score: '-20' }
                            ].map((v) => (
                                <button key={v.id} onClick={() => setSelectedVerdict(v.id as any)} className={cn("relative flex flex-col items-center gap-4 p-8 rounded-[2rem] border transition-all duration-500", selectedVerdict === v.id ? "border-primary/50 bg-primary/5 scale-105 shadow-2xl" : "bg-white/[0.01] border-white/5 opacity-40")}>
                                    <v.icon className={cn("h-10 w-10", selectedVerdict === v.id ? v.color : "text-white/20")} />
                                    <div className="text-center"><span className={cn("block text-[10px] font-black uppercase tracking-widest", selectedVerdict === v.id ? "text-white" : "text-white/20")}>{v.label}</span><span className={cn("text-[9px] font-mono opacity-40", v.color)}>{v.score} TRUST</span></div>
                                </button>
                            ))}
                        </div>
                        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="描述本次交易細節..." className="min-h-[160px] bg-white/[0.02] border-white/5 rounded-3xl p-8 text-white focus:border-primary/50 transition-all resize-none shadow-inner" />
                        <Button onClick={handleSubmit} disabled={isSubmitting || !selectedVerdict} className="w-full h-20 bg-primary text-black font-black uppercase italic rounded-[1.5rem] shadow-[0_15px_40px_rgba(236,72,153,0.3)] hover:scale-[1.02] transition-all text-lg group">
                            {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : <span className="flex items-center gap-4">TRANSMIT_VERDICT_LOG <Send className="w-5 h-5" /></span>}
                        </Button>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}