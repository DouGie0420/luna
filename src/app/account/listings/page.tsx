'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from '@/hooks/use-translation';
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
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
import { Loader2, Edit, Trash2, Plus, PackageOpen, Eye, Heart, Star } from "lucide-react";

function ListingCard({ item, onDeleteClick }: { item: Product, onDeleteClick: (id: string) => void }) {
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

    return (
        <Card className="overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border border-transparent hover:border-primary/20">
            <CardHeader className="p-0 relative">
                <div className="aspect-[4/3] relative overflow-hidden rounded-t-lg">
                    <Image
                        src={item.images?.[0] || 'https://picsum.photos/seed/default-product/400/300'}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute top-2 right-2">
                        {getStatusBadge(item.status)}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow bg-card/50">
                <h3 className="font-bold truncate group-hover:text-primary">{item.name}</h3>
                <p className="text-primary font-mono text-lg">{item.price.toLocaleString()} {item.currency}</p>
                <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {item.likes || 0}</span>
                    <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {item.favorites || 0}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.views || 0}</span>
                </div>
            </CardContent>
            <CardFooter className="p-2 pt-0 flex gap-2 bg-card/50 rounded-b-lg">
                <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/products/${item.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> View/Edit
                    </Link>
                </Button>
                <Button 
                    variant="destructive" 
                    size="icon"
                    onClick={() => onDeleteClick(item.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
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

    if (loading) return <div className="p-20 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <>
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-headline">{t('accountListings.title')}</h1>
                    <Button asChild>
                        <Link href="/products/new"><Plus className="mr-2 h-4 w-4" /> {t('accountListings.newItem')}</Link>
                    </Button>
                </div>

                {listings.length === 0 ? (
                    <div className="text-center p-20 border-2 border-dashed rounded-xl">
                        <PackageOpen className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <h3 className="text-lg font-semibold">{t('accountListings.noListingsTitle')}</h3>
                        <p className="text-muted-foreground mt-1">{t('accountListings.noListingsDescription')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.map((item) => (
                           <ListingCard key={item.id} item={item} onDeleteClick={setItemToDelete} />
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete your listing. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)} className="bg-destructive hover:bg-destructive/90">
                           Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
