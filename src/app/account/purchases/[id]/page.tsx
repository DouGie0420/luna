'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore"; 
import { Loader2, Wallet, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const db = useFirestore();

    const [product, setProduct] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBuying, setIsBuying] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!params.id || !db) return;
            try {
                // 1. 获取真实商品信息
                const productRef = doc(db, "products", params.id as string);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    setProduct({ id: productSnap.id, ...productSnap.data() });
                }

                // 2. 获取该商品的真实评论 (拒绝 DUMMY 数据)
                const q = query(
                    collection(db, "comments"), 
                    where("productId", "==", params.id),
                    orderBy("createdAt", "desc")
                );
                const commentSnap = await getDocs(q);
                setComments(commentSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("加载失败:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [params.id, db]);

    const handleBuy = async () => {
        if (!user) return alert("请先登录");
        if (!db || isBuying) return;

        setIsBuying(true);
        try {
            // 构建真实订单数据
            const orderData = {
                productName: product.name,
                amount: product.price,
                buyerId: user.uid,
                sellerId: product.userId || product.ownerId, 
                sellerAddress: product.sellerAddress || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e", 
                status: "paid", 
                createdAt: serverTimestamp(),
                productId: product.id
            };

            await addDoc(collection(db, "orders"), orderData);
            router.push('/account/purchases'); // 跳转到我的购买
        } catch (error) {
            alert("购买失败");
        } finally {
            setIsBuying(false);
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!product) return <div className="p-20 text-center">未找到该商品</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 text-white min-h-screen">
            {/* 商品信息区 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="aspect-square bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="object-cover w-full h-full" />
                    ) : (
                        <span className="text-zinc-700 font-mono">NO IMAGE</span>
                    )}
                </div>
                <div className="flex flex-col justify-center">
                    <h1 className="text-4xl font-bold mb-4 font-mono uppercase">{product.name}</h1>
                    <p className="text-2xl text-primary font-mono mb-6">{product.price} USDT</p>
                    <p className="text-zinc-400 mb-8 leading-relaxed">{product.description || "卖家很懒，什么都没写。"}</p>
                    
                    <Button 
                        size="lg" 
                        className="h-16 text-xl bg-primary hover:bg-primary/80" 
                        onClick={handleBuy}
                        disabled={isBuying}
                    >
                        {isBuying ? <Loader2 className="animate-spin mr-2" /> : <Wallet className="mr-2" />}
                        {isBuying ? "正在处理订单..." : "立即购买"}
                    </Button>
                </div>
            </div>

            {/* 真实留言板区 - 剔除虚假数据 */}
            <div className="border-t border-zinc-800 pt-10">
                <h3 className="text-xl font-mono flex items-center gap-2 mb-8">
                    <MessageSquare className="text-primary w-5 h-5" /> REAL FEEDBACK
                </h3>

                {comments.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <p className="text-zinc-500 italic">“在较洁的月光下留下你的痕迹。”</p>
                        <p className="text-zinc-600 text-xs mt-2">(目前尚无真实用户评价)</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((c) => (
                            <div key={c.id} className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                        <User size={16} />
                                    </div>
                                    <span className="text-sm font-bold">{c.userName || "匿名用户"}</span>
                                </div>
                                <p className="text-zinc-400 text-sm leading-relaxed">{c.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}