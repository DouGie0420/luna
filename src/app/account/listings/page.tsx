'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import {
  Loader2, Edit, Trash2, Plus, PackageOpen,
  Eye, Heart, Star, Rocket, Zap, Database, ShoppingBag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const BOOST_COST = 500;

function ListingCard({ item, onDeleteClick, onBoostClick }: {
  item: Product;
  onDeleteClick: (id: string) => void;
  onBoostClick: (item: Product) => void;
}) {
  const getStatusBadge = (status?: any) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/15 text-green-300 border-green-500/30 text-xs">Active</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-xs">Under Review</Badge>;
      case 'hidden':
        return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">Hidden</Badge>;
      default:
        return <Badge variant="outline" className="text-xs border-white/15">Unknown</Badge>;
    }
  };

  const isCurrentlyBoosted = item.isBoosted && item.boostExpiresAt &&
    new Date(item.boostExpiresAt.toDate ? item.boostExpiresAt.toDate() : item.boostExpiresAt) > new Date();

  return (
    <div className={cn(
      'relative bg-card/40 backdrop-blur-sm rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col group',
      isCurrentlyBoosted
        ? 'border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
        : 'border-white/8 hover:border-white/14'
    )}>
      <div className={cn(
        'h-px w-full bg-gradient-to-r from-transparent to-transparent',
        isCurrentlyBoosted ? 'via-purple-500/50' : 'via-white/8'
      )} />

      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden">
        <Image
          src={item.images?.[0] || 'https://picsum.photos/seed/default-product/400/300'}
          alt={item.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {getStatusBadge(item.status)}
          {isCurrentlyBoosted && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] font-bold uppercase animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.4)] tracking-widest">
              <Zap className="w-2.5 h-2.5 mr-1" />Boosted
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-foreground truncate mb-1 group-hover:text-purple-300 transition-colors">{item.name}</h3>
        <p className="text-purple-300 font-mono text-sm mb-3">{item.price.toLocaleString()} {item.currency}</p>

        <div className="flex justify-between text-xs text-muted-foreground/40 mb-4 pt-3 border-t border-white/5">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500/70" />{item.likes || 0}</span>
          <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500/70" />{item.favorites || 0}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{item.views || 0}</span>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white/80 text-xs h-8"
              asChild
            >
              <Link href={`/products/${item.id}`}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />View/Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              onClick={() => onDeleteClick(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!isCurrentlyBoosted && (
            <Button
              onClick={() => onBoostClick(item)}
              className="w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 hover:to-pink-600/30 text-purple-300 border border-purple-500/30 text-xs h-8 font-semibold uppercase tracking-wider"
            >
              <Rocket className="mr-1.5 h-3.5 w-3.5" />Boost / {BOOST_COST} Grams
            </Button>
          )}
        </div>
      </div>
    </div>
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
  const [itemToBoost, setItemToBoost] = useState<Product | null>(null);
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      if (!user?.uid || !db) { setLoading(false); return; }
      try {
        setLoading(true);
        const q = query(collection(db, 'products'), where('sellerId', '==', user.uid));
        const snapshot = await getDocs(q);
        setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (err: any) {
        setErrorMsg('无法加载您的发布内容');
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [user?.uid, db]);

  useEffect(() => {
    if (errorMsg) {
      toast({ title: '错误', description: errorMsg, variant: 'destructive' });
      setErrorMsg(null);
    }
  }, [errorMsg, toast]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setListings(prev => prev.filter(item => item.id !== id));
      toast({ title: '已删除', description: '商品已从商城下架' });
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleConfirmBoost = async () => {
    if (!db || !user?.uid || !itemToBoost) return;
    setIsBoosting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) throw new Error('Account node not found');
      const currentSoil = userSnap.data().lunarSoil || 0;

      if (currentSoil < BOOST_COST) {
        toast({ title: 'Insufficient Lunar Soil', description: `Balance: ${currentSoil} Grams. Need ${BOOST_COST} Grams.`, variant: 'destructive' });
        setIsBoosting(false);
        return;
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await updateDoc(userRef, { lunarSoil: currentSoil - BOOST_COST });
      await updateDoc(doc(db, 'products', itemToBoost.id), { isBoosted: true, boostExpiresAt: expiresAt });
      setListings(prev => prev.map(p => p.id === itemToBoost.id ? { ...p, isBoosted: true, boostExpiresAt: expiresAt } : p));
      toast({ title: 'Boost Activated', description: `24-Hour Highlight Activated for -${BOOST_COST} Grams of Lunar Soil.` });
    } catch {
      toast({ title: 'Boost Failed', variant: 'destructive' });
    } finally {
      setIsBoosting(false);
      setItemToBoost(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="absolute -inset-3 bg-purple-500/15 rounded-full blur-lg animate-pulse" />
          <Loader2 className="relative h-7 w-7 animate-spin text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative p-4 md:p-5">
        {/* Background */}
        <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-blue-600/6 rounded-full blur-[100px]" />
        </div>

        <div>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                <ShoppingBag className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-headline">
                  My Listings
                </h1>
                <p className="text-sm text-muted-foreground/70">{listings.length} products deployed</p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_15px_rgba(168,85,247,0.25)] text-sm"
              asChild
            >
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" />New Asset
              </Link>
            </Button>
          </motion.div>

          {listings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/[0.02] pointer-events-none" />
              <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <div className="text-center py-20">
                  <div className="p-4 bg-white/5 rounded-2xl inline-flex mb-4 border border-white/8">
                    <PackageOpen className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground/70 mb-2">No Assets Deployed</h3>
                  <p className="text-muted-foreground/40 text-xs font-mono mb-6">Initialize a new product to list it on the network.</p>
                  <Link href="/products/new">
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 border-0">
                      <Plus className="mr-2 h-4 w-4" />Create First Listing
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {listings.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ListingCard item={item} onDeleteClick={setItemToDelete} onBoostClick={setItemToBoost} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="bg-card/90 border border-white/10 backdrop-blur-3xl rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground/60 text-sm">
              This will permanently remove the product from the marketplace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-foreground/70">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && handleDelete(itemToDelete)}
              className="bg-red-500 hover:bg-red-600 text-white border border-red-500/50"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Boost Dialog */}
      <AlertDialog open={!!itemToBoost} onOpenChange={(open) => !open && !isBoosting && setItemToBoost(null)}>
        <AlertDialogContent className="bg-card/90 border border-purple-500/25 backdrop-blur-3xl rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.1)]">
          <AlertDialogHeader>
            <div className="mx-auto w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <Rocket className="w-7 h-7 text-purple-400" />
            </div>
            <AlertDialogTitle className="text-center text-foreground text-lg font-bold">
              Activate Boost Protocol?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="mt-3">
                <div className="bg-white/5 rounded-xl p-4 border border-white/8 space-y-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground/70">
                    <span>Target Asset</span>
                    <span className="font-medium text-foreground truncate max-w-[150px]">{itemToBoost?.name}</span>
                  </div>
                  <div className="h-px w-full bg-white/8" />
                  <div className="flex justify-between items-center text-sm font-semibold text-purple-300">
                    <span>Network Cost</span>
                    <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5" />{BOOST_COST} Grams</span>
                  </div>
                </div>
                <p className="mt-3 text-muted-foreground/50 text-xs text-center leading-relaxed">
                  Consumes {BOOST_COST} Grams of Lunar Soil. Asset will be prioritized for 24 hours.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isBoosting} className="bg-white/5 border-white/10 text-foreground/70">Abort</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmBoost(); }}
              disabled={isBoosting}
              className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
            >
              {isBoosting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              {isBoosting ? 'Processing...' : 'Deploy Protocol'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
