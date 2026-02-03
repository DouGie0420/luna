'use client';

import React, { useEffect, useState } from 'react';
import { useFirestore, useUser } from "@/firebase";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2, Plus, PackageOpen } from "lucide-react";
import Link from 'next/link';

export default function MyListingsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchListings = async () => {
            if (!user?.uid || !db) {
                // If no user, no need to fetch, just stop loading.
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
                }));
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
            toast({
                title: "错误",
                description: errorMsg,
                variant: "destructive",
            });
            setErrorMsg(null); 
        }
    }, [errorMsg, toast]);

    const handleDelete = async (id: string) => {
        if (!db) return;
        if (!confirm("确定要删除这件商品吗？")) return;
        try {
            await deleteDoc(doc(db, "products", id));
            setListings(prev => prev.filter(item => item.id !== id));
            toast({ title: "已删除", description: "商品已从商城下架" });
        } catch (err) {
            toast({ title: "删除失败", variant: "destructive" });
        }
    };

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">我发布的商品</h1>
                <Button asChild>
                    <Link href="/products/new"><Plus className="mr-2 h-4 w-4" /> 发布新商品</Link>
                </Button>
            </div>

            {listings.length === 0 ? (
                <div className="text-center p-20 border-2 border-dashed rounded-xl">
                    <PackageOpen className="mx-auto h-12 w-12 opacity-20 mb-4" />
                    <p className="text-muted-foreground">你还没有发布过任何商品</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((item) => (
                        <Card key={item.id} className="overflow-hidden bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="truncate">{item.name}</CardTitle>
                                <p className="text-primary font-mono">{item.price} {item.currency}</p>
                            </CardHeader>
                            <CardContent className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" asChild>
                                    <Link href={`/products/${item.id}`}>
                                        <Edit className="mr-2 h-4 w-4" /> 查看/编辑
                                    </Link>
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="px-3"
                                    onClick={() => handleDelete(item.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
