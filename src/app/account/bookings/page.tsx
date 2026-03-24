// @ts-nocheck
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { query, collection, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, Loader2, Clock, XCircle, CheckCircle2, AlertTriangle, Home } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Booking } from '@/lib/types';

const STATUS_CONFIG = {
  paid:                   { label: '已付款', color: 'bg-emerald-500/80 text-white' },
  confirmed:              { label: '已确认', color: 'bg-blue-500/80 text-white' },
  pending:                { label: '待确认', color: 'bg-amber-500/80 text-white' },
  cancellation_requested: { label: '申请退款中', color: 'bg-orange-500/80 text-white' },
  disputed:               { label: '争议处理中', color: 'bg-red-500/80 text-white' },
  refunded:               { label: '已退款', color: 'bg-purple-500/80 text-white' },
  cancelled:              { label: '已取消', color: 'bg-gray-500/80 text-white' },
  completed:              { label: '已完成', color: 'bg-teal-500/80 text-white' },
};

function BookingCard({ booking, index }: { booking: Booking & { id: string }; index: number }) {
  const cfg = STATUS_CONFIG[booking.status] || { label: booking.status, color: 'bg-gray-500/80 text-white' };
  const checkIn  = booking.checkIn?.toDate ? booking.checkIn.toDate() : new Date(booking.checkIn);
  const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
  const paidETH  = booking.billingSnapshot?.paidETH;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/account/bookings/${booking.id}`}>
        <div className="group relative rounded-2xl border border-white/8 bg-[#0d0715]/90 overflow-hidden hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(168,85,247,0.14)] p-5 flex gap-4">
          {/* Icon */}
          <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Home className="w-5 h-5 text-purple-400" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-white/90 truncate">
                {booking.propertyName || `房源 #${booking.propertyId?.slice(0, 8)}`}
              </p>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40 font-mono">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {format(checkIn, 'MM/dd')} — {format(checkOut, 'MM/dd')}
              </span>
              {paidETH && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {paidETH.toFixed(4)} ETH
                </span>
              )}
            </div>

            <p className="text-[10px] text-white/20 font-mono mt-1 uppercase tracking-widest">
              ID: {booking.id.slice(0, 16)}...
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function MyBookingsPage() {
  const { user, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const [bookings, setBookings] = useState<(Booking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !firestore) return;
    setLoading(true);
    const q = query(
      collection(firestore, 'bookings'),
      where('tenantId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    getDocs(q)
      .then(snap => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, firestore]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">我的预定</h1>
        <p className="text-sm text-white/40 mt-1">所有租房预定记录，点击查看详情或申请退款</p>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4 text-white/30">
          <Home className="w-12 h-12 opacity-20" />
          <p className="text-sm uppercase tracking-widest font-mono">暂无预定记录</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/rentals">浏览房源</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b, i) => (
            <BookingCard key={b.id} booking={b} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
