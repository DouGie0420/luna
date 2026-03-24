// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Loader2, Home, Plus, Edit3, Eye, ShieldAlert, EyeOff, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active:        { label: '已上架', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  pending_review:{ label: '审核中', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  inactive:      { label: '已下架', color: 'bg-gray-500/15 text-gray-400 border-gray-500/25' },
  rejected:      { label: '已拒绝', color: 'bg-red-500/15 text-red-300 border-red-500/25' },
};

export default function MyRentalsPage() {
  const { user, profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const isPro = !!(profile?.isPro);

  useEffect(() => {
    if (!user || !firestore) return;
    setLoading(true);

    const fetchRentals = async () => {
      const results: any[] = [];
      const seenIds = new Set<string>();

      for (const field of ['ownerId', 'hostId']) {
        const q = query(
          collection(firestore, 'rentalProperties'),
          where(field, '==', user.uid)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() });
          }
        });
      }

      results.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(0);
        const tb = b.createdAt?.toDate?.() ?? new Date(0);
        return tb.getTime() - ta.getTime();
      });

      setRentals(results);
      setLoading(false);
    };

    fetchRentals().catch(console.error);
  }, [user, firestore]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (!firestore || toggling) return;
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    setToggling(id);
    try {
      await updateDoc(doc(firestore, 'rentalProperties', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setRentals(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast({ title: newStatus === 'active' ? '已上架' : '已下架' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message });
    } finally {
      setToggling(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white/30">
        <ShieldAlert className="w-12 h-12 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest">仅 PRO 商户可管理房源</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">我的房源</h1>
          <p className="text-sm text-white/35">管理你发布的所有房源</p>
        </div>
        <Link
          href="/products/new/rental"
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white text-sm font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          发布新房源
        </Link>
      </motion.div>

      {rentals.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4 text-white/20">
          <Home className="w-12 h-12 opacity-20" />
          <p className="text-sm font-mono uppercase tracking-widest">暂无发布的房源</p>
          <Link
            href="/products/new/rental"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
          >
            立即发布第一个房源
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental, i) => {
            const statusCfg = STATUS_CONFIG[rental.status] || STATUS_CONFIG.inactive;
            const location = typeof rental.location === 'string'
              ? rental.location
              : [rental.location?.city, rental.location?.country].filter(Boolean).join(', ');
            const price = rental.pricePerDay || rental.pricePerNight || rental.price || 0;
            const coverImage = rental.images?.[0];

            return (
              <motion.div
                key={rental.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/8 bg-[#0d0715]/80 overflow-hidden"
              >
                <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
                <div className="flex gap-4 p-4">
                  {/* Cover image */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/[0.04] flex items-center justify-center">
                    {coverImage ? (
                      <Image src={coverImage} alt={rental.title} width={96} height={96} className="w-full h-full object-cover" />
                    ) : (
                      <Home className="w-8 h-8 text-white/15" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white/90 truncate">{rental.title}</p>
                      <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    {location && (
                      <p className="text-xs text-white/35 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{location}
                      </p>
                    )}
                    <p className="text-xs text-white/35 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />฿{Number(price).toLocaleString()} / 晚
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-4 pb-4">
                  <Link
                    href={`/products/rental/${rental.id}/edit`}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/15 bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> 编辑
                  </Link>
                  <Link
                    href={`/products/rental/${rental.id}`}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-white/15 bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> 查看
                  </Link>
                  {['active', 'inactive'].includes(rental.status) && (
                    <button
                      onClick={() => toggleStatus(rental.id, rental.status)}
                      disabled={!!toggling}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${
                        rental.status === 'active'
                          ? 'border-gray-500/30 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {toggling === rental.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : rental.status === 'active' ? (
                        <><EyeOff className="w-3.5 h-3.5" /> 下架</>
                      ) : (
                        <><Eye className="w-3.5 h-3.5" /> 上架</>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
