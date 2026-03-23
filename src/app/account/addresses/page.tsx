
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { PlusCircle, Edit, Trash2, MapPin, Phone, Star } from "lucide-react";
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { UserAddress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

function AddressCard({ address, index, onDeleteClick }: { address: UserAddress; index: number; onDeleteClick: (id: string) => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
                address.isDefault
                    ? 'border-purple-500/40 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
                    : 'border-white/8 bg-white/[0.02] hover:border-white/14'
            }`}
        >
            {address.isDefault && (
                <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            )}
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Name + phone + default badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-white">{address.recipientName}</span>
                            {address.isDefault && (
                                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    <Star className="w-2.5 h-2.5" />默认
                                </span>
                            )}
                        </div>
                        {/* Phone */}
                        {address.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-white/55">
                                <Phone className="w-3.5 h-3.5 text-white/30 shrink-0" />
                                <span className="font-mono">{address.phone}</span>
                            </div>
                        )}
                        {/* Address */}
                        <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                            <p className="text-sm text-white/55 leading-relaxed">
                                {address.addressLine1}
                                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                                {', '}{address.city}
                                {address.province ? `, ${address.province}` : ''}
                                {address.postalCode ? ` ${address.postalCode}` : ''}
                                {', '}{address.country}
                            </p>
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <Link href={`/account/addresses/new?id=${address.id}`}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-purple-300 hover:border-purple-500/30 transition-all text-xs font-semibold">
                            <Edit className="w-3.5 h-3.5" />编辑
                        </Link>
                        <button
                            onClick={() => onDeleteClick(address.id)}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400/70 hover:text-red-300 hover:border-red-500/40 transition-all text-xs font-semibold"
                        >
                            <Trash2 className="w-3.5 h-3.5" />删除
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function AddressesPage() {
    const { t } = useTranslation();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

    const addressesCollectionQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'users', user.uid, 'addresses');
    }, [firestore, user]);

    const { data: addresses, loading: addressesLoading } = useCollection<UserAddress>(addressesCollectionQuery);

    const handleDelete = async () => {
        if (!user || !addressToDelete || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'users', user.uid, 'addresses', addressToDelete));
            toast({ title: '地址已删除' });
        } catch {
            toast({ variant: 'destructive', title: '删除失败', description: '请检查权限后重试。' });
        } finally {
            setAddressToDelete(null);
        }
    };

    const isLoading = userLoading || addressesLoading;

    return (
        <>
            <div className="p-4 md:p-5 max-w-3xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-5"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/12 border border-purple-500/25 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white leading-none">收货地址</h1>
                            <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest mt-0.5">Shipping Addresses</p>
                        </div>
                    </div>
                    <Button asChild className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 text-xs h-8 px-3">
                        <Link href="/account/addresses/new">
                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />新增地址
                        </Link>
                    </Button>
                </motion.div>

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                            <Skeleton key={i} className="h-28 rounded-2xl bg-white/[0.03]" />
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!isLoading && (!addresses || addresses.length === 0) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-24 text-center border border-dashed border-white/8 rounded-2xl"
                    >
                        <MapPin className="mx-auto h-10 w-10 mb-3 text-white/12" />
                        <p className="text-sm font-bold uppercase tracking-widest text-white/25 mb-4">暂无收货地址</p>
                        <Button asChild variant="outline" className="border-white/15 text-white/50 hover:text-white text-xs">
                            <Link href="/account/addresses/new">添加第一个地址</Link>
                        </Button>
                    </motion.div>
                )}

                {/* Address list */}
                {!isLoading && addresses && addresses.length > 0 && (
                    <div className="space-y-3">
                        {addresses.map((address, i) => (
                            <AddressCard key={address.id} address={address} index={i} onDeleteClick={setAddressToDelete} />
                        ))}
                    </div>
                )}
            </div>

            <AlertDialog open={!!addressToDelete} onOpenChange={(open) => !open && setAddressToDelete(null)}>
                <AlertDialogContent className="bg-[#0d0715]/95 border border-white/10 backdrop-blur-3xl rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">确认删除地址？</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/45">
                            此操作不可撤销，地址将被永久删除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white/70">取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 border-0">
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
