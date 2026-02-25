'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/hooks/use-translation';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import type { Product } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Edit, Trash2, Plus, PackageOpen, Eye, Heart, Star, Rocket, Zap, Database } from "lucide-react";

// 🚀 月壤消耗常量：500 克 (Grams)
const BOOST_COST = 500; 

function ListingCard({ item, onDeleteClick, onBoostClick }: { item: Product, onDeleteClick: (id: string) => void, onBoostClick: (item: Product) => void }) {
    const getStatusBadge = (status?: 'active' | 'under_review' | 'hidden') => {
        switch (status) {
            case 'active':
                return <Badge variant="default" className="bg-green-500/20 text-green-300 border-green-500/50">Active</Badge>;
            case 'under_review':
                return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">Under Review</Badge>;
            case 'hidden':
                return <Badge variant="destructive">Hidden</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    // 🚀 校验商品是否处于加速有效期内
    const isCurrentlyBoosted = item.isBoosted && item.boostExpiresAt && new Date(item.boostExpiresAt.toDate ? item.boostExpiresAt.toDate() : item.boostExpiresAt) > new Date();

    return (
        // 如果处于加速状态，给卡片加上紫色发光边框
        <Card className={`overflow-hidden flex flex-col group transition-all duration-500 hover:shadow-xl bg-black/40 backdrop-blur-xl ${isCurrentlyBoosted ? 'border-primary/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-white/5 hover:border-primary/20'}`}>
            <CardHeader className="p-0 relative">
                <div className="aspect-[4/3] relative overflow-hidden rounded-t-[24px]">
                    <Image
                        src={item.images?.[0] || 'https://picsum.photos/seed/default-product/400/300'}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                        {getStatusBadge(item.status)}
                        {/* 🚀 高亮徽章 */}
                        {isCurrentlyBoosted && (
                             <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50 font-black uppercase animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)] tracking-widest">
                                 <Zap className="w-3 h-3 mr-1" /> Boosted
                             </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5 flex-grow">
                <h3 className="font-bold truncate group-hover:text-primary text-white text-lg tracking-tight">{item.name}</h3>
                <p className="text-primary font-mono text-lg mt-1">{item.price.toLocaleString()} {item.currency}</p>
                <div className="flex justify-between text-xs text-white/40 mt-4 pt-4 border-t border-white/5">
                    <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-pink-500/70" /> {item.likes || 0}</span>
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500/70" /> {item.favorites || 0}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {item.views || 0}</span>
                </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0 flex flex-col gap-3">
                <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white" asChild>
                        <Link href={`/products/${item.id}`}>
                            <Edit className="mr-2 h-4 w-4" /> View/Edit
                        </Link>
                    </Button>
                    <Button variant="destructive" size="icon" className="bg-red-500/20 text-red-500 hover:bg-red-500/40 border border-red-500/30" onClick={() => onDeleteClick(item.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                
                {/* 🚀 加速按钮 (如果未加速) */}
                {!isCurrentlyBoosted && (
                    <Button
                        onClick={() => onBoostClick(item)}
                        className="w-full bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/40 hover:to-primary/20 text-primary border border-primary/30 transition-all font-black uppercase tracking-widest text-xs h-10"
                    >
                        <Rocket className="mr-2 h-4 w-4" /> Boost / {BOOST_COST} Grams
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

export default function MyListingsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const { t } = useTranslation();
    
    const [listings, setListings] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    
    // 🚀 月壤高亮系统状态
    const [itemToBoost, setItemToBoost] = useState<Product | null>(null);
    const [isBoosting, setIsBoosting] = useState(false);

    useEffect(() => {
        const fetchListings = async () => {
            if (!user?.uid || !db) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const q = query(
                    collection(db, "products"),
                    where("sellerId", "==", user.uid)
                );
                const querySnapshot = await getDocs(q);
                const items = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Product));
                setListings(items);
            } catch (err: any) {
                console.error("获取列表失败:", err);
                setErrorMsg("无法加载您的发布内容");
            } finally {
                setLoading(false);
            }
        };
        fetchListings();
    }, [user?.uid, db]);

    useEffect(() => {
        if (errorMsg) {
            toast({ title: "错误", description: errorMsg, variant: "destructive" });
            setErrorMsg(null); 
        }
    }, [errorMsg, toast]);

    const handleDelete = async (id: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, "products", id));
            setListings(prev => prev.filter(item => item.id !== id));
            toast({ title: "已删除", description: "商品已从商城下架" });
        } catch (err) {
            toast({ title: "删除失败", variant: "destructive" });
        } finally {
            setItemToDelete(null);
        }
    };

    // 🚀 核心：执行高亮消费协议
    const handleConfirmBoost = async () => {
        if (!db || !user?.uid || !itemToBoost) return;
        setIsBoosting(true);
        try {
            // 1. 获取用户最新的月壤余额以确保安全
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) throw new Error("Account node not found");
            const currentSoil = userSnap.data().lunarSoil || 0;

            // 2. 余额不足拦截
            if (currentSoil < BOOST_COST) {
                toast({ 
                    title: "Insufficient Lunar Soil", 
                    description: `Balance: ${currentSoil} Grams. Need ${BOOST_COST} Grams.`, 
                    variant: "destructive" 
                });
                setIsBoosting(false);
                return;
            }

            // 3. 计算加速到期时间 (当前时间 + 24小时)
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            // 4. 扣除用户月壤积分
            await updateDoc(userRef, { lunarSoil: currentSoil - BOOST_COST });

            // 5. 更新商品状态
            const productRef = doc(db, 'products', itemToBoost.id);
            await updateDoc(productRef, {
                isBoosted: true,
                boostExpiresAt: expiresAt
            });

            // 6. 更新本地前端状态，立即显示发光特效
            setListings(prev => prev.map(p => p.id === itemToBoost.id ? { ...p, isBoosted: true, boostExpiresAt: expiresAt } : p));

            toast({ title: "Boost Protocol Executed", description: `24-Hour Highlight Activated for -500 Grams of Lunar Soil.` });
        } catch (err) {
            toast({ title: "Protocol Failed", variant: "destructive" });
        } finally {
            setIsBoosting(false);
            setItemToBoost(null);
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10 mt-4">
                    <h1 className="text-4xl font-black titanium-title italic uppercase tracking-tighter text-white">Your <span className="text-primary">Manifest</span></h1>
                    <Button className="bg-primary text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-105 transition-transform" asChild>
                        <Link href="/products/new"><Plus className="mr-2 h-4 w-4" /> New Asset</Link>
                    </Button>
                </div>

                {listings.length === 0 ? (
                    <div className="text-center py-32 bg-black/20 border border-white/5 backdrop-blur-xl rounded-[32px]">
                        <PackageOpen className="mx-auto h-16 w-16 opacity-20 mb-6 text-white" />
                        <h3 className="text-xl font-black uppercase tracking-widest text-white/70">No Assets Deployed</h3>
                        <p className="text-white/40 mt-2 font-mono text-xs">Initialize a new product to list it on the network.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {listings.map((item) => (
                           <ListingCard 
                               key={item.id} 
                               item={item} 
                               onDeleteClick={setItemToDelete} 
                               onBoostClick={setItemToBoost} // 传递加速点击事件
                           />
                        ))}
                    </div>
                )}
            </div>

            {/* 删除确认弹窗 */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent className="bg-[#09090b]/90 border border-white/10 backdrop-blur-3xl rounded-[24px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-black italic uppercase text-white tracking-tight">Erase Asset?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/50 font-mono text-xs">
                            This action will permanently delete this node from the network.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white/70">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)} className="bg-red-500 text-white font-black uppercase tracking-widest border border-red-500/50 hover:bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                           Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 🚀 高亮协议确认弹窗 (Lunar Boost Protocol) */}
            <AlertDialog open={!!itemToBoost} onOpenChange={(open) => !open && !isBoosting && setItemToBoost(null)}>
                <AlertDialogContent className="bg-black/80 border border-primary/30 backdrop-blur-3xl rounded-[32px] shadow-[0_0_50px_rgba(168,85,247,0.15)]">
                    <AlertDialogHeader>
                        <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                            <Rocket className="w-8 h-8 text-primary" />
                        </div>
                        <AlertDialogTitle className="text-center font-black italic uppercase text-2xl text-white tracking-tighter">
                            Activate <span className="text-primary">Highlight Protocol</span>?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center pt-2">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-2">
                                <div className="flex justify-between items-center text-white/80 font-mono text-xs uppercase">
                                    <span>Target Asset:</span>
                                    <span className="font-bold text-white truncate max-w-[150px]">{itemToBoost?.name}</span>
                                </div>
                                <div className="h-px w-full bg-white/10 my-1" />
                                <div className="flex justify-between items-center text-primary font-black uppercase tracking-widest text-sm">
                                    <span>Network Cost:</span>
                                    <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5" /> 500 Grams</span>
                                </div>
                            </div>
                            <p className="mt-4 text-white/40 font-mono text-[10px] uppercase leading-relaxed">
                                This will consume 500 grams of Lunar Soil. The asset will be prioritized in algorithms and highlighted for 24 hours.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
                        <AlertDialogCancel disabled={isBoosting} className="rounded-xl bg-white/5 border-white/10 text-white/70 hover:bg-white/10">Abort</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => { e.preventDefault(); handleConfirmBoost(); }} 
                            disabled={isBoosting}
                            className="rounded-xl bg-gradient-to-r from-primary to-purple-600 text-black font-black uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] transition-transform"
                        >
                           {isBoosting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
                           {isBoosting ? 'Transacting...' : 'Deploy Protocol'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}