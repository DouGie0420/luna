// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection, query, orderBy, getDocs, doc, updateDoc,
  where, serverTimestamp, limit,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Loader2, ShieldAlert, ExternalLink, Hash, Check, X,
  CalendarDays, Home, RefreshCw,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';
import type { Booking } from '@/lib/types';
import Link from 'next/link';

const REQUIRED_CHAIN_ID = 84532;
const BASESCAN_URL = 'https://sepolia.basescan.org/tx/';

const STATUS_BADGE: Record<string, string> = {
  paid:                   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  confirmed:              'bg-blue-500/20 text-blue-300 border-blue-500/30',
  pending:                'bg-amber-500/20 text-amber-300 border-amber-500/30',
  cancellation_requested: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  disputed:               'bg-red-500/20 text-red-300 border-red-500/30',
  refunded:               'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cancelled:              'bg-gray-500/20 text-gray-300 border-gray-500/30',
  completed:              'bg-teal-500/20 text-teal-300 border-teal-500/30',
};

export default function AdminBookingsPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'cancellation_requested' | 'disputed'>('cancellation_requested');
  const [bookings, setBookings] = useState<(Booking & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<(Booking & { id: string }) | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);

  const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
  const { resolveDispute, isInteracting, interactionError } = useEscrowContract();

  const hasAccess = useMemo(
    () => profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role),
    [profile]
  );

  const fetchBookings = () => {
    if (!firestore || !hasAccess) return;
    setLoading(true);
    let q;
    if (activeTab === 'all') {
      q = query(collection(firestore, 'bookings'), orderBy('createdAt', 'desc'), limit(100));
    } else {
      q = query(
        collection(firestore, 'bookings'),
        where('status', '==', activeTab),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }
    getDocs(q)
      .then(snap => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [firestore, hasAccess, activeTab]);

  const handleResolve = async (refundToBuyer: boolean) => {
    if (!firestore || !selectedBooking) return;

    if (!isConnected || !address) {
      toast({ variant: 'destructive', title: '请连接管理员钱包' });
      return;
    }
    const currentChainId = typeof chainId === 'string' && chainId.startsWith('0x')
      ? parseInt(chainId, 16) : Number(chainId);
    if (currentChainId !== REQUIRED_CHAIN_ID) {
      toast({ variant: 'destructive', title: '网络错误', description: '请切换到 Base Sepolia 测试网。' });
      await connectToChain(REQUIRED_CHAIN_ID, toast);
      return;
    }
    if (!selectedBooking.escrowOrderId) {
      toast({ variant: 'destructive', title: '缺少合约 ID', description: '该预定缺少链上 escrowOrderId，无法执行退款。' });
      return;
    }

    setProcessingId(selectedBooking.id);
    try {
      toast({ title: '链上操作中', description: refundToBuyer ? '正在执行退款...' : '正在释放资金给房主...' });
      const txResult = await resolveDispute(selectedBooking.escrowOrderId, refundToBuyer);

      if (!txResult?.success) {
        throw new Error(txResult?.error || interactionError || '链上交易失败');
      }

      const newStatus = refundToBuyer ? 'refunded' : 'completed';
      await updateDoc(doc(firestore, 'bookings', selectedBooking.id), {
        status: newStatus,
        cancellationApproved: refundToBuyer,
        refundTxHash: refundToBuyer ? txResult.hash : null,
        resolvedAt: serverTimestamp(),
        disputeResolvedTxHash: txResult.hash,
        updatedAt: serverTimestamp(),
      });

      toast({
        title: '操作成功',
        description: refundToBuyer ? `ETH 已退还给租客。TX: ${txResult.hash?.slice(0, 12)}...` : '资金已释放给房主。',
      });
      setIsResolveDialogOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (e: any) {
      toast({ variant: 'destructive', title: '执行失败', description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <p className="text-lg font-bold text-destructive">权限不足</p>
      </div>
    );
  }

  return (
    <>
      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="bg-[#0d0715] border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>处理退款申请</DialogTitle>
            <DialogDescription className="text-white/50">
              选择退款给租客或将资金释放给房主。此操作将触发链上交易，不可撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-3 space-y-2 text-sm text-white/70">
              <p><span className="text-white/40">房源：</span>{selectedBooking.propertyName || selectedBooking.propertyId?.slice(0, 12)}</p>
              <p><span className="text-white/40">取消原因：</span>{selectedBooking.cancellationReason || '未填写'}</p>
              {selectedBooking.billingSnapshot?.paidETH && (
                <p><span className="text-white/40">付款金额：</span>
                  <span className="text-emerald-400 font-mono">{selectedBooking.billingSnapshot.paidETH.toFixed(6)} ETH</span>
                </p>
              )}
              {!selectedBooking.escrowOrderId && (
                <p className="text-red-400 text-xs">⚠️ 缺少 escrowOrderId，无法执行链上操作</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsResolveDialogOpen(false)} disabled={isInteracting}>取消</Button>
            <Button
              onClick={() => handleResolve(false)}
              disabled={isInteracting || !selectedBooking?.escrowOrderId}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInteracting && processingId === selectedBooking?.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Check className="w-4 h-4 mr-2" /> 释放给房主
            </Button>
            <Button
              onClick={() => handleResolve(true)}
              disabled={isInteracting || !selectedBooking?.escrowOrderId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isInteracting && processingId === selectedBooking?.id && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <RefreshCw className="w-4 h-4 mr-2" /> 退款给租客
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page */}
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">租房预定管理</h1>
            <p className="text-sm text-white/40 mt-1">处理退款申请，执行链上仲裁</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="cancellation_requested">退款申请</TabsTrigger>
            <TabsTrigger value="disputed">争议中</TabsTrigger>
            <TabsTrigger value="all">全部预定</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center text-white/30 py-12 font-mono text-sm uppercase tracking-widest">
                暂无记录
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map(booking => {
                  const checkIn  = booking.checkIn?.toDate  ? booking.checkIn.toDate()  : new Date(booking.checkIn);
                  const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
                  const badgeClass = STATUS_BADGE[booking.status] || STATUS_BADGE.pending;

                  return (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-white/8 bg-[#0d0715]/90 p-5 flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <Home className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white truncate">
                              {booking.propertyName || `房源 #${booking.propertyId?.slice(0, 8)}`}
                            </p>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-white/40 font-mono flex-wrap">
                            <span><CalendarDays className="w-3 h-3 inline mr-1" />{format(checkIn, 'MM/dd')} — {format(checkOut, 'MM/dd')}</span>
                            {booking.billingSnapshot?.paidETH && (
                              <span className="text-emerald-400">{booking.billingSnapshot.paidETH.toFixed(4)} ETH</span>
                            )}
                          </div>
                          {booking.cancellationReason && (
                            <p className="text-xs text-orange-300/70 mt-1">退款原因: {booking.cancellationReason}</p>
                          )}
                          {booking.txHash && (
                            <a
                              href={`${BASESCAN_URL}${booking.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-purple-400/60 hover:text-purple-400 font-mono mt-1"
                            >
                              <Hash className="w-3 h-3" />
                              {booking.txHash.slice(0, 20)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <p className="text-[10px] text-white/20 font-mono mt-1">
                            租客: {booking.tenantId?.slice(0, 12)}... | 房主: {booking.hostId?.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      {['cancellation_requested', 'disputed'].includes(booking.status) && (
                        <Button
                          size="sm"
                          onClick={() => { setSelectedBooking(booking); setIsResolveDialogOpen(true); }}
                          disabled={processingId === booking.id}
                          className="shrink-0 bg-purple-600/80 hover:bg-purple-600 text-white"
                        >
                          处理退款
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
