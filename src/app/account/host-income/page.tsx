// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { format, getMonth, getYear, startOfMonth } from 'date-fns';
import { Loader2, TrendingUp, Home, ShieldAlert, Wallet, CalendarDays, BarChart3 } from 'lucide-react';
import type { Booking } from '@/lib/types';

const PAID_STATUSES = ['paid', 'confirmed', 'completed'];

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-2xl border bg-[#0d0715]/80 p-5 ${accent || 'border-white/8'}`}>
      <p className="text-xs text-white/40 uppercase tracking-widest font-mono mb-1">{label}</p>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default function HostIncomePage() {
  const { user, profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const [bookings, setBookings] = useState<(Booking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const isPro = !!(profile?.isPro);

  useEffect(() => {
    if (!user || !firestore) return;
    setLoading(true);

    const fetchAll = async () => {
      const results: (Booking & { id: string })[] = [];
      const seenIds = new Set<string>();

      for (const field of ['hostId', 'ownerId']) {
        const q = query(
          collection(firestore, 'bookings'),
          where(field, '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(500)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          if (!seenIds.has(d.id)) {
            seenIds.add(d.id);
            results.push({ id: d.id, ...d.data() } as any);
          }
        });
      }

      setBookings(results.filter(b => PAID_STATUSES.includes(b.status)));
      setLoading(false);
    };

    fetchAll().catch(console.error);
  }, [user, firestore]);

  const stats = useMemo(() => {
    if (!bookings.length) return { total: 0, totalETH: 0, completed: 0, monthly: {} as Record<string, number> };

    let total = 0;
    let totalETH = 0;
    const monthly: Record<string, number> = {};

    for (const b of bookings) {
      const amount = b.totalPrice || 0;
      const eth = b.billingSnapshot?.paidETH || 0;
      total += amount;
      totalETH += eth;

      const createdDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      const key = format(startOfMonth(createdDate), 'yyyy-MM');
      monthly[key] = (monthly[key] || 0) + amount;
    }

    return { total, totalETH, completed: bookings.filter(b => b.status === 'completed').length, monthly };
  }, [bookings]);

  const sortedMonths = useMemo(() =>
    Object.entries(stats.monthly).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6),
    [stats.monthly]
  );

  const maxMonthly = useMemo(() =>
    Math.max(...sortedMonths.map(([, v]) => v), 1),
    [sortedMonths]
  );

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
        <p className="text-sm font-mono uppercase tracking-widest">仅 PRO 商户可查看收入统计</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight">收入统计</h1>
        <p className="text-sm text-white/35">房源出租收入总览</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="总收入 (THB)"
          value={`฿${stats.total.toLocaleString()}`}
          sub="所有已确认订单"
          accent="border-emerald-500/20"
        />
        <StatCard
          label="总收入 (ETH)"
          value={stats.totalETH > 0 ? `${stats.totalETH.toFixed(4)} ETH` : '—'}
          sub="链上支付金额"
          accent="border-blue-500/20"
        />
        <StatCard
          label="总订单数"
          value={String(bookings.length)}
          sub={`已完成 ${stats.completed} 单`}
          accent="border-purple-500/20"
        />
      </motion.div>

      {/* Monthly chart */}
      {sortedMonths.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/8 bg-[#0d0715]/80 p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">月度收入</h2>
          </div>
          <div className="flex items-end gap-3 h-36">
            {sortedMonths.map(([month, amount]) => {
              const pct = Math.max((amount / maxMonthly) * 100, 4);
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-white/30 font-mono">{amount >= 1000 ? `${(amount/1000).toFixed(1)}k` : amount}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-purple-600/60 to-purple-400/40 transition-all" style={{ height: `${pct}%` }} />
                  <span className="text-[9px] text-white/20 font-mono truncate w-full text-center">{month.slice(5)}/{month.slice(2,4)}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Booking list */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-2xl border border-white/8 bg-[#0d0715]/80 overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-white/6">
          <CalendarDays className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest">收款记录</h2>
        </div>

        {bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/20">
            <Home className="w-8 h-8 opacity-20" />
            <p className="text-sm">暂无收款记录</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {bookings.slice(0, 50).map((b, i) => {
              const checkIn = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
              const checkOut = b.checkOut?.toDate ? b.checkOut.toDate() : new Date(b.checkOut);
              const amount = b.billingSnapshot?.paidETH
                ? `${b.billingSnapshot.paidETH} ETH`
                : b.totalPrice ? `฿${b.totalPrice.toLocaleString()}` : '—';

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/80 truncate">
                      {b.propertyName || `房源 #${b.propertyId?.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-white/30 font-mono">
                      {format(checkIn, 'MM/dd')} — {format(checkOut, 'MM/dd')} · {b.nights || '?'}晚
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-300">{amount}</p>
                    <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      b.status === 'completed' ? 'bg-teal-500/15 text-teal-300' :
                      b.status === 'paid' ? 'bg-emerald-500/15 text-emerald-300' :
                      'bg-blue-500/15 text-blue-300'
                    }`}>{b.status}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
