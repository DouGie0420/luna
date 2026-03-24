// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection, query, where, orderBy, getDocs, doc, updateDoc,
  serverTimestamp, limit,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import {
  Home, CalendarDays, Loader2, CheckCircle2, XCircle, Clock,
  User, AlertTriangle, Wallet, RefreshCw, Eye, ShieldAlert,
  CheckSquare, Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  pending:                { label: '待确认',     color: 'bg-amber-500/15 text-amber-300 border-amber-500/25',   dot: 'bg-amber-400' },
  confirmed:              { label: '已确认',     color: 'bg-blue-500/15 text-blue-300 border-blue-500/25',      dot: 'bg-blue-400' },
  paid:                   { label: '已付款',     color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', dot: 'bg-emerald-400' },
  cancellation_requested: { label: '申请退款',   color: 'bg-orange-500/15 text-orange-300 border-orange-500/25', dot: 'bg-orange-400' },
  disputed:               { label: '争议处理中', color: 'bg-red-500/15 text-red-300 border-red-500/25',         dot: 'bg-red-400' },
  refunded:               { label: '已退款',     color: 'bg-purple-500/15 text-purple-300 border-purple-500/25', dot: 'bg-purple-400' },
  cancelled:              { label: '已取消',     color: 'bg-gray-500/15 text-gray-400 border-gray-500/25',      dot: 'bg-gray-400' },
  completed:              { label: '已完成',     color: 'bg-teal-500/15 text-teal-300 border-teal-500/25',      dot: 'bg-teal-400' },
};

type TabKey = 'pending' | 'active' | 'history' | 'cancellations';

const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: 'pending',       label: '待确认',   statuses: ['pending'] },
  { key: 'active',        label: '进行中',   statuses: ['confirmed', 'paid'] },
  { key: 'cancellations', label: '退款申请', statuses: ['cancellation_requested', 'disputed'] },
  { key: 'history',       label: '历史记录', statuses: ['completed', 'refunded', 'cancelled'] },
];

// ─── Booking card ─────────────────────────────────────────────────────────────
function BookingCard({
  booking,
  onConfirm,
  onDecline,
  onApproveCancellation,
  onDeclineCancellation,
  onMarkCompleted,
  processing,
}: {
  booking: Booking & { id: string };
  onConfirm?: (id: string) => void;
  onDecline?: (id: string) => void;
  onApproveCancellation?: (id: string) => void;
  onDeclineCancellation?: (id: string) => void;
  onMarkCompleted?: (id: string) => void;
  processing: string | null;
}) {
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: 'bg-gray-500/15 text-gray-400 border-gray-500/25', dot: 'bg-gray-400' };
  const checkIn  = booking.checkIn?.toDate  ? booking.checkIn.toDate()  : new Date(booking.checkIn);
  const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
  const nights   = differenceInDays(checkOut, checkIn);
  const isProcessing = processing === booking.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-[#0d0715]/80 overflow-hidden hover:border-purple-500/25 transition-all"
    >
      {/* Top accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Home className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">
                {booking.propertyName || `房源 #${booking.propertyId?.slice(0, 8)}`}
              </p>
              <p className="text-xs text-white/35 font-mono mt-0.5">
                订单 #{booking.id?.slice(0, 10)}
              </p>
            </div>
          </div>
          <span className={cn('shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5', cfg.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        </div>

        {/* Dates & nights */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.04] border border-white/8">
            <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold">入住</span>
            <span className="text-sm font-black text-white">{format(checkIn, 'MM/dd')}</span>
            <span className="text-[10px] text-white/40 font-mono">{format(checkIn, 'yyyy')}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.04] border border-white/8">
            <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold">退房</span>
            <span className="text-sm font-black text-white">{format(checkOut, 'MM/dd')}</span>
            <span className="text-[10px] text-white/40 font-mono">{format(checkOut, 'yyyy')}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-white/[0.04] border border-white/8">
            <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold">晚数</span>
            <span className="text-sm font-black text-white">{nights}</span>
            <span className="text-[10px] text-white/40 font-mono">nights</span>
          </div>
        </div>

        {/* Guest & amount row */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/6">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-white/30" />
            <span className="text-xs text-white/50 font-mono">
              {booking.guestName || booking.tenantId?.slice(0, 10) || booking.userId?.slice(0, 10) || '—'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-black text-emerald-300">
              {booking.billingSnapshot?.paidETH
                ? `${booking.billingSnapshot.paidETH} ETH`
                : booking.totalPrice
                ? `${booking.totalPrice} THB`
                : '—'}
            </span>
          </div>
        </div>

        {/* Cancellation reason */}
        {booking.cancellationReason && (
          <div className="p-3 rounded-xl bg-orange-500/8 border border-orange-500/20">
            <p className="text-xs font-bold text-orange-300 mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> 退款原因
            </p>
            <p className="text-xs text-white/60 leading-relaxed">{booking.cancellationReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {/* Pending: confirm or decline */}
          {booking.status === 'pending' && (
            <>
              <button
                onClick={() => onConfirm?.(booking.id)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600/80 border border-emerald-500/30 text-white text-xs font-bold hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                确认预定
              </button>
              <button
                onClick={() => onDecline?.(booking.id)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-white/15 bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> 拒绝
              </button>
            </>
          )}

          {/* Cancellation request: approve or decline */}
          {booking.status === 'cancellation_requested' && (
            <>
              <button
                onClick={() => onApproveCancellation?.(booking.id)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-red-600/80 border border-red-500/30 text-white text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                批准退款
              </button>
              <button
                onClick={() => onDeclineCancellation?.(booking.id)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-white/15 bg-white/5 text-white/60 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                拒绝退款
              </button>
            </>
          )}

          {/* Mark as completed — only for paid/confirmed after checkout date */}
          {['paid', 'confirmed'].includes(booking.status) && (() => {
            const checkOutDate = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
            return checkOutDate < new Date();
          })() && (
            <button
              onClick={() => onMarkCompleted?.(booking.id)}
              disabled={isProcessing}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-teal-600/80 border border-teal-500/30 text-white text-xs font-bold hover:bg-teal-600 transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
              标记完成
            </button>
          )}

          {/* View detail */}
          <Link
            href={`/account/bookings/${booking.id}`}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/40 text-xs font-semibold hover:bg-white/8 hover:text-white/70 transition-all ml-auto"
          >
            <Eye className="w-3.5 h-3.5" /> 详情
          </Link>
        </div>

        {/* Tenant contact info — visible after confirmation */}
        {['confirmed', 'paid', 'completed'].includes(booking.status) && (booking.tenantEmail || booking.guestEmail) && (
          <div className="mx-5 mb-4 p-3 rounded-xl bg-blue-500/8 border border-blue-500/15 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div>
              <p className="text-[10px] text-blue-400/70 font-mono uppercase tracking-wider">房客联系方式</p>
              <p className="text-xs text-white/70">{booking.tenantEmail || booking.guestEmail}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HostBookingsPage() {
  const { user, profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [bookings, setBookings] = useState<(Booking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!firestore || !user) return;
    setLoading(true);
    try {
      const tab = TABS.find(t => t.key === activeTab)!;
      // Query by hostId OR ownerId (both field names used in the codebase)
      const results: (Booking & { id: string })[] = [];
      const seenIds = new Set<string>();

      for (const field of ['hostId', 'ownerId']) {
        for (const status of tab.statuses) {
          const q = query(
            collection(firestore, 'bookings'),
            where(field, '==', user.uid),
            where('status', '==', status),
            orderBy('createdAt', 'desc'),
            limit(50)
          );
          const snap = await getDocs(q);
          snap.docs.forEach(d => {
            if (!seenIds.has(d.id)) {
              seenIds.add(d.id);
              results.push({ id: d.id, ...d.data() } as any);
            }
          });
        }
      }

      results.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(0);
        const tb = b.createdAt?.toDate?.() ?? new Date(0);
        return tb.getTime() - ta.getTime();
      });
      setBookings(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [firestore, user, activeTab]);

  const handleConfirm = async (bookingId: string) => {
    if (!firestore || processing) return;
    setProcessing(bookingId);
    try {
      const bookingData = bookings.find(b => b.id === bookingId);
      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '已确认预定', description: '房客已收到确认通知。' });
      // Send confirmation email to tenant
      if (bookingData?.tenantEmail) {
        fetch('/api/email/booking-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_confirmed',
            tenantEmail: bookingData.tenantEmail,
            tenantName: bookingData.tenantName || bookingData.guestName || '',
            propertyName: bookingData.propertyName || '',
            checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('zh-CN') : '',
            checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('zh-CN') : '',
            nights: bookingData.nights || 0,
            guests: bookingData.guests || 1,
            totalPrice: bookingData.totalPrice || 0,
          }),
        }).catch(() => {});
      }
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (bookingId: string) => {
    if (!firestore || processing) return;
    setProcessing(bookingId);
    try {
      const bookingData = bookings.find(b => b.id === bookingId);
      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: 'cancelled',
        declinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '已拒绝预定', description: '预定已取消。' });
      // Send cancellation email to tenant
      if (bookingData?.tenantEmail) {
        fetch('/api/email/booking-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_cancelled',
            tenantEmail: bookingData.tenantEmail,
            tenantName: bookingData.tenantName || bookingData.guestName || '',
            propertyName: bookingData.propertyName || '',
            checkIn: bookingData.checkIn?.toDate ? bookingData.checkIn.toDate().toLocaleDateString('zh-CN') : '',
            checkOut: bookingData.checkOut?.toDate ? bookingData.checkOut.toDate().toLocaleDateString('zh-CN') : '',
          }),
        }).catch(() => {});
      }
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleApproveCancellation = async (bookingId: string) => {
    if (!firestore || processing) return;
    setProcessing(bookingId);
    try {
      await updateDoc(doc(firestore, 'bookings', bookingId), {
        cancellationApproved: true,
        status: 'disputed', // Escalate to admin for on-chain refund
        updatedAt: serverTimestamp(),
      });
      toast({ title: '已批准退款申请', description: '管理员将处理链上退款，请稍后。' });
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleDeclineCancellation = async (bookingId: string) => {
    if (!firestore || processing) return;
    setProcessing(bookingId);
    try {
      await updateDoc(doc(firestore, 'bookings', bookingId), {
        cancellationRequested: false,
        cancellationApproved: false,
        status: 'paid',
        updatedAt: serverTimestamp(),
      });
      toast({ title: '已拒绝退款申请', description: '预定将继续正常进行。' });
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkCompleted = async (bookingId: string) => {
    if (!firestore || processing) return;
    setProcessing(bookingId);
    try {
      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast({ title: '已标记为完成', description: '感谢完成此次入住。房客现在可以留下评价。' });
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { pending: 0, active: 0, cancellations: 0, history: 0 };
    // We only have current tab's data loaded; show badge only for pending
    if (activeTab === 'pending') c.pending = bookings.length;
    return c;
  }, [bookings, activeTab]);

  const isPro = !!(profile?.isPro);

  if (authLoading) {
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
        <p className="text-sm font-mono uppercase tracking-widest">仅 PRO 商户可访问此功能</p>
        <p className="text-xs text-white/20">升级为 PRO 商户后可发布房源并管理预定</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight">房源订单</h1>
        <p className="text-sm text-white/35">查看和管理您房源收到的所有预定请求</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/8 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
              activeTab === tab.key
                ? 'bg-gradient-to-r from-purple-500/25 to-pink-500/15 text-purple-200 border border-purple-500/25'
                : 'text-white/35 hover:text-white/60 hover:bg-white/5'
            )}
          >
            {tab.label}
            {tab.key === 'pending' && bookings.length > 0 && activeTab === 'pending' && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {bookings.length}
              </span>
            )}
            {tab.key === 'cancellations' && bookings.length > 0 && activeTab === 'cancellations' && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {bookings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
          <p className="text-sm text-white/30">加载中...</p>
        </div>
      ) : bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
            {activeTab === 'pending' ? (
              <Clock className="w-7 h-7 text-white/20" />
            ) : activeTab === 'cancellations' ? (
              <AlertTriangle className="w-7 h-7 text-white/20" />
            ) : (
              <Home className="w-7 h-7 text-white/20" />
            )}
          </div>
          <p className="text-white/30 text-sm">
            {activeTab === 'pending' ? '暂无待确认的预定' :
             activeTab === 'active'  ? '暂无进行中的预定' :
             activeTab === 'cancellations' ? '暂无退款申请' :
             '暂无历史记录'}
          </p>
          <Link
            href="/products/rental/all"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
          >
            查看我的房源
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {bookings.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.04 }}
              >
                <BookingCard
                  booking={b}
                  onConfirm={handleConfirm}
                  onDecline={handleDecline}
                  onApproveCancellation={handleApproveCancellation}
                  onDeclineCancellation={handleDeclineCancellation}
                  onMarkCompleted={handleMarkCompleted}
                  processing={processing}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
