// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { Order, Product, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, collection, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ThumbsUp, ThumbsDown, Meh, Sparkles, ShieldCheck, Send, TerminalSquare, ChevronLeft } from 'lucide-react';
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
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const { data: order, loading: orderLoading } = useDoc<Order>(firestore && orderId ? doc(firestore, 'orders', orderId) : null);
    const { data: product } = useDoc<Product>(firestore && order?.productId ? doc(firestore, 'products', order.productId) : null);
    const { data: seller } = useDoc<UserProfile>(firestore && order?.sellerId ? doc(firestore, 'users', order.sellerId) : null);

    const handleSubmit = async () => {
        if (!selectedVerdict || !firestore || !currentUser || !order || !order.sellerId || order.isReviewed) return;
        setIsSubmitting(true);
        const batch = writeBatch(firestore);
        
        try {
            const scoreMod = selectedVerdict === 'positive' ? 5 : selectedVerdict === 'negative' ? -20 : 0;
            const starValue = selectedVerdict === 'positive' ? 5 : selectedVerdict === 'negative' ? 1 : 3;
            const field = selectedVerdict === 'positive' ? 'goodReviews' : selectedVerdict === 'negative' ? 'badReviews' : 'neutralReviews';

            // 🚀 1. 写入评价，补全商品元数据用于个人主页展示
            const reviewRef = doc(firestore, 'reviews', order.id);
            batch.set(reviewRef, {
                orderId: order.id,
                reviewerId: currentUser.uid,
                targetUserId: order.sellerId, 
                type: selectedVerdict,
                comment: comment.trim() || (selectedVerdict === 'positive' ? 'Protocol execution perfect.' : 'Transaction finalized.'),
                itemType: order.type || 'product',
                itemName: order.productName || product?.title || 'Unknown Asset',
                itemImage: product?.images?.[0] || '', // 这一行极其关键，用于主页渲染缩略图
                createdAt: serverTimestamp(),
            });

            // 🚀 2. 更新卖家数据
            const sellerRef = doc(firestore, 'users', order.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            const currentData = sellerSnap.data();
            const initialScore = currentData?.creditScore === undefined ? 500 : 0;
            const currentRating = currentData?.rating || 0;
            const currentCount = currentData?.reviewsCount || 0;
            const newRating = ((currentRating * currentCount) + starValue) / (currentCount + 1);

            batch.update(sellerRef, {
                creditScore: increment(initialScore + scoreMod),
                rating: newRating,
                reviewsCount: increment(1),
                [field]: increment(1)
            });

            // 🚀 3. 锁定订单
            batch.update(doc(firestore, 'orders', order.id), { isReviewed: true });

            await batch.commit();
            toast({ title: "PROTOCOL_SIGNED", description: "信譽日誌已永久同步至 LUNA 核心。" });
            
            // 成功后引导至卖家主页查看效果
            router.push(`/u/${order.sellerId}`);
        } catch (e) {
            toast({ variant: 'destructive', title: 'TRANSMISSION_ERROR' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderLoading || !order || !product || !seller) return <div className="h-screen flex items-center justify-center bg-black gap-4 text-primary"><Loader2 className="w-10 h-10 animate-spin" /><p className="font-mono text-[10px] uppercase tracking-[0.4em]">Initializing_Verdict_Node...</p></div>;

    if (order.isReviewed) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[#050508] p-6 text-center">
                <ShieldCheck className="h-20 w-20 text-primary mb-6 animate-pulse" />
                <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-white">Log_Already_Signed</h1>
                <p className="text-white/40 text-sm max-w-xs mb-8 font-mono">该笔交易的信用记录已写入 Base 主网存证，无法二次修改。</p>
                <Button onClick={() => router.back()} className="rounded-full bg-white/5 border border-white/10 px-12 py-6 text-xs font-black tracking-widest hover:bg-primary hover:text-black transition-all">RETURN_TO_BASE</Button>
            </div>
        );
    }

    return (
        <div onMouseMove={(e) => setMousePos({ x: e.clientX - window.innerWidth/2, y: e.clientY - window.innerHeight/2 })} className="min-h-screen bg-[#050508] text-white relative overflow-hidden font-sans">
            
            {/* 🌌 全局 Nebula Pulse 动态背景 */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#1a1025_0%,#050508_70%)]" />
                <motion.div animate={{ x: mousePos.x * -0.05, y: mousePos.y * -0.05 }} className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-primary/10 blur-[150px] rounded-full animate-blob" />
                <motion.div animate={{ x: mousePos.x * 0.04, y: mousePos.y * 0.04 }} className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-purple-600/10 blur-[130px] rounded-full animate-blob animation-delay-2000" />
            </div>

            <PageHeaderWithBackAndClose />

            <main className="container mx-auto max-w-2xl px-4 py-32 relative z-10">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="flex items-center gap-4 mb-8">
                        <Button onClick={() => router.back()} variant="ghost" className="rounded-full h-12 w-12 p-0 bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Submit_Verdict</h1>
                            <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Protocol_ID: {orderId}</p>
                        </div>
                    </div>

                    <Card className="bg-black/40 backdrop-blur-3xl border-white/10 rounded-[3rem] p-10 md:p-14 shadow-2xl relative ring-1 ring-white/5">
                        <div className="flex items-center gap-6 mb-12 p-6 bg-white/[0.02] rounded-[2rem] border border-white/5">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-lg">
                                <img src={product.images?.[0] || '/placeholder.png'} className="w-full h-full object-cover" alt="item" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-1">Trading_Asset</p>
                                <h2 className="text-xl font-black uppercase text-white truncate italic">{product.title}</h2>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { id: 'positive', icon: ThumbsUp, label: 'Positive', color: 'text-green-400', score: '+5', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]' },
                                    { id: 'neutral', icon: Meh, label: 'Neutral', color: 'text-yellow-400', score: '0', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.1)]' },
                                    { id: 'negative', icon: ThumbsDown, label: 'Negative', color: 'text-red-400', score: '-20', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' }
                                ].map((v) => (
                                    <button 
                                        key={v.id} 
                                        onClick={() => setSelectedVerdict(v.id as any)} 
                                        className={cn(
                                            "relative flex flex-col items-center gap-4 p-6 rounded-[2rem] border-2 transition-all duration-500", 
                                            selectedVerdict === v.id 
                                                ? `border-primary/50 bg-primary/5 scale-105 ${v.glow}` 
                                                : "bg-white/[0.01] border-white/5 opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                                        )}
                                    >
                                        <v.icon className={cn("h-8 w-8", selectedVerdict === v.id ? v.color : "text-white/20")} />
                                        <div className="text-center font-black">
                                            <span className="block text-[9px] uppercase tracking-widest">{v.label}</span>
                                            <span className={cn("text-[9px] font-mono opacity-60", v.color)}>{v.score} TRUST</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] ml-2">
                                    <TerminalSquare className="w-3 h-3 text-primary" /> Optional_Transmission_Logs
                                </div>
                                <Textarea 
                                    value={comment} 
                                    onChange={(e) => setComment(e.target.value)} 
                                    placeholder="描述本次交易細節，數據將加密存證..." 
                                    className="min-h-[140px] bg-white/[0.02] border-white/5 rounded-[2rem] p-6 text-white focus:border-primary/40 transition-all resize-none shadow-inner text-sm leading-relaxed" 
                                />
                            </div>

                            <Button 
                                onClick={handleSubmit} 
                                disabled={isSubmitting || !selectedVerdict} 
                                className="w-full h-20 bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase italic rounded-3xl shadow-[0_15px_40px_rgba(236,72,153,0.3)] hover:scale-[1.02] active:scale-95 transition-all text-lg group"
                            >
                                {isSubmitting ? <Loader2 className="w-8 h-8 animate-spin" /> : (
                                    <span className="flex items-center gap-3">
                                        EXECUTE_VERDICT <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                            
                            <p className="text-[9px] font-mono text-center text-white/20 uppercase tracking-[0.4em]">Decentralized_Trust_Protocol_v2.1</p>
                        </div>
                    </Card>
                </motion.div>
            </main>

            <style jsx global>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 15s infinite alternate ease-in-out; }
            `}</style>
        </div>
    );
}