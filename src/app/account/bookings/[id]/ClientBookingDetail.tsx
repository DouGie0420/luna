// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { format, differenceInDays } from 'date-fns';
import {
  Home, CalendarDays, Loader2, ArrowLeft, ExternalLink, AlertTriangle,
  XCircle, CheckCircle2, Clock, Wallet, Hash, ShieldAlert, RefreshCcw,
  Star, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Booking } from '@/lib/types';
import { useUSDTBalanceAndAllowance } from '@/hooks/useUSDTBalanceAndAllowance';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { connectToChain } from '@/lib/web3-provider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

const REQUIRED_CHAIN_ID = 84532;
const BASESCAN_URL = 'https://sepolia.basescan.org/tx/';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  paid:                   { label: '已付款 — 待入住', color: 'text-emerald-400', icon: CheckCircle2 },
  confirmed:              { label: '已确认', color: 'text-blue-400', icon: CheckCircle2 },
  pending:                { label: '待确认', color: 'text-amber-400', icon: Clock },
  cancellation_requested: { label: '退款申请已提交 — 等待管理员审核', color: 'text-orange-400', icon: AlertTriangle },
  disputed:               { label: '争议处理中', color: 'text-red-400', icon: ShieldAlert },
  refunded:               { label: '已退款', color: 'text-purple-400', icon: RefreshCcw },
  cancelled:              { label: '已取消', color: 'text-gray-400', icon: XCircle },
  completed:              { label: '已完成', color: 'text-teal-400', icon: CheckCircle2 },
};

export default function ClientBookingDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [booking, setBooking] = useState<(Booking & { id: string }) | null>(null);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Review state
  const [existingReview, setExistingReview] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { address, isConnected, chainId } = useUSDTBalanceAndAllowance();
  const { raiseDispute, isInteracting, interactionError } = useEscrowContract();

  useEffect(() => {
    if (!firestore || !id) return;
    Promise.all([
      getDoc(doc(firestore, 'bookings', id)),
    ]).then(([bSnap]) => {
      if (!bSnap.exists()) { setLoading(false); return; }
      const bData = { id: bSnap.id, ...bSnap.data() } as any;
      setBooking(bData);
      if (bData.propertyId) {
        getDoc(doc(firestore, 'rentalProperties', bData.propertyId))
          .then(pSnap => { if (pSnap.exists()) setProperty({ id: pSnap.id, ...pSnap.data() }); })
          .catch(console.error);
      }
    }).catch(console.error).finally(() => setLoading(false));

    // Fetch existing review for this booking
    const reviewQ = query(
      collection(firestore, 'reviews'),
      where('bookingId', '==', id)
    );
    getDocs(reviewQ).then(snap => {
      if (!snap.empty) setExistingReview({ id: snap.docs[0].id, ...snap.docs[0].data() });
    }).catch(console.error);
  }, [firestore, id]);

  const handleRequestCancellation = async () => {
    if (!firestore || !user || !booking || isCancelling) return;
    if (!cancelReason.trim()) {
      toast({ variant: 'destructive', title: '请填写取消原因' });
      return;
    }

    const isPaid = ['paid', 'confirmed'].includes(booking.status || '');

    if (isPaid) {
      // For paid bookings: need wallet + chain check before raising dispute on-chain
      if (!isConnected || !address) {
        toast({ variant: 'destructive', title: '请先连接 Web3 钱包', description: '需要钱包签名来发起链上退款申请。' });
        return;
      }
      const currentChainId = typeof chainId === 'string' && chainId.startsWith('0x')
        ? parseInt(chainId, 16)
        : Number(chainId);
      if (currentChainId !== REQUIRED_CHAIN_ID) {
        toast({ variant: 'destructive', title: '网络错误', description: '请切换到 Base Sepolia 测试网。' });
        await connectToChain(REQUIRED_CHAIN_ID, toast);
        return;
      }
    }

    setIsCancelling(true);
    try {
      if (isPaid && booking.escrowOrderId) {
        // Raise dispute on-chain first
        toast({ title: '链上申请中', description: '正在钱包签名，发起退款争议...' });
        const txResult = await raiseDispute(booking.escrowOrderId);
        if (!txResult?.success) {
          throw new Error(txResult?.error || interactionError || '链上争议发起失败');
        }
        // Update Firestore after successful on-chain tx
        await updateDoc(doc(firestore, 'bookings', id), {
          status: 'cancellation_requested',
          cancellationRequested: true,
          cancellationReason: cancelReason.trim(),
          cancellationRequestedAt: serverTimestamp(),
          disputeTxHash: txResult.hash,
          updatedAt: serverTimestamp(),
        });
        toast({ title: '退款申请已提交', description: '已在链上发起争议，管理员将在 24 小时内审核并退款。' });
      } else {
        // Unpaid / pending — cancel immediately
        await updateDoc(doc(firestore, 'bookings', id), {
          status: 'cancelled',
          cancellationReason: cancelReason.trim(),
          cancellationRequestedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: '预定已取消' });
      }
      setIsCancelDialogOpen(false);
      setCancelReason('');
      setBooking(prev => prev ? { ...prev, status: isPaid ? 'cancellation_requested' : 'cancelled', cancellationRequested: isPaid } : prev);
    } catch (e: any) {
      toast({ variant: 'destructive', title: '操作失败', description: e.message || '请稍后重试' });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!firestore || !user || !booking || isSubmittingReview) return;
    if (!reviewComment.trim()) {
      toast({ variant: 'destructive', title: '请填写评价内容' });
      return;
    }
    setIsSubmittingReview(true);
    try {
      // Map 1-5 stars to existing reviews collection format
      const type = reviewRating >= 4 ? 'good' : reviewRating >= 3 ? 'neutral' : 'bad';
      const score = reviewRating >= 4 ? 10 : reviewRating >= 3 ? 5 : 1;
      const reviewData = {
        bookingId: id,
        propertyId: booking.propertyId,
        userId: user.uid,
        userName: user.displayName || '',
        userAvatar: user.photoURL || '',
        content: reviewComment.trim(),
        score,
        type,
        rating: reviewRating,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(firestore, 'reviews'), reviewData);
      setExistingReview({ id: ref.id, ...reviewData });
      toast({ title: '评价已提交', description: '感谢你的反馈！' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: '提交失败', description: e.message });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!booking || (user && booking.tenantId !== user.uid)) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4 text-white/30">
        <ShieldAlert className="w-12 h-12 opacity-20" />
        <p className="text-sm font-mono uppercase tracking-widest">预定记录不存在或无权访问</p>
        <Button variant="ghost" onClick={() => router.push('/account/bookings')}>返回列表</Button>
      </div>
    );
  }

  const checkIn  = booking.checkIn?.toDate  ? booking.checkIn.toDate()  : new Date(booking.checkIn);
  const checkOut = booking.checkOut?.toDate ? booking.checkOut.toDate() : new Date(booking.checkOut);
  const nights   = differenceInDays(checkOut, checkIn);
  const cfg      = STATUS_CONFIG[booking.status] || { label: booking.status, color: 'text-white/50', icon: Clock };
  const StatusIcon = cfg.icon;
  const paidETH  = booking.billingSnapshot?.paidETH;
  const totalUSD = booking.billingSnapshot?.totalUSD;
  const canCancel = !['completed', 'cancelled', 'refunded', 'cancellation_requested', 'disputed'].includes(booking.status || '');

  return (
    <>
      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="bg-[#0d0715] border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>申请取消预定</DialogTitle>
            <DialogDescription className="text-white/50">
              {['paid', 'confirmed'].includes(booking.status || '')
                ? '您已付款，取消将在链上发起退款争议，管理员审核后退还 ETH。'
                : '取消后预定将立即失效。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="text-sm text-white/70">
                <p className="font-semibold text-orange-300 mb-1">
                  {booking.propertyName || `房源 ID: ${booking.propertyId?.slice(0, 8)}`}
                </p>
                <p className="font-mono text-xs text-white/40">
                  {format(checkIn, 'yyyy/MM/dd')} → {format(checkOut, 'yyyy/MM/dd')} ({nights} 晚)
                </p>
                {paidETH && (
                  <p className="font-mono text-xs mt-1 text-white/40">已付: {paidETH.toFixed(4)} ETH</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2">
                取消原因 *
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="请填写取消原因（如：行程变更、日期冲突等）"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/60 transition-all resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} disabled={isCancelling}>
              放弃
            </Button>
            <Button
              onClick={handleRequestCancellation}
              disabled={isCancelling || !cancelReason.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isCancelling && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              确认申请取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="px-6 py-8 max-w-2xl">
        {/* Back */}
        <button
          onClick={() => router.push('/account/bookings')}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          我的预定
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Status Card */}
          <div className="rounded-2xl border border-white/8 bg-[#0d0715]/90 p-6">
            <div className={`flex items-center gap-2 text-sm font-semibold ${cfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {cfg.label}
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">
              {booking.propertyName || `房源 #${booking.propertyId?.slice(0, 8)}`}
            </h2>
            {property?.location && (
              <p className="text-sm text-white/40 mt-1">
                {property.location.address || ''} {property.location.city || ''}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="rounded-2xl border border-white/8 bg-[#0d0715]/90 p-5 space-y-3">
            <p className="text-xs uppercase tracking-widest font-mono text-white/30">入住详情</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-white/30 mb-1">入住</p>
                <p className="text-sm font-semibold text-white">{format(checkIn, 'yyyy年MM月dd日')}</p>
              </div>
              <div>
                <p className="text-xs text-white/30 mb-1">退房</p>
                <p className="text-sm font-semibold text-white">{format(checkOut, 'yyyy年MM月dd日')}</p>
              </div>
            </div>
            <p className="text-xs text-white/40 font-mono">共 {nights} 晚</p>
          </div>

          {/* Payment */}
          {booking.billingSnapshot && (
            <div className="rounded-2xl border border-white/8 bg-[#0d0715]/90 p-5 space-y-3">
              <p className="text-xs uppercase tracking-widest font-mono text-white/30">付款信息</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">房费总计</span>
                  <span className="text-white font-mono">${totalUSD?.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">支付金额 (ETH)</span>
                  <span className="text-emerald-400 font-mono">{paidETH?.toFixed(6)} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">ETH 汇率 (下单时)</span>
                  <span className="text-white/40 font-mono">${booking.billingSnapshot.ethPriceAtBooking?.toFixed(0)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Transaction */}
          {booking.txHash && (
            <div className="rounded-2xl border border-white/8 bg-[#0d0715]/90 p-5">
              <p className="text-xs uppercase tracking-widest font-mono text-white/30 mb-2">链上交易</p>
              <a
                href={`${BASESCAN_URL}${booking.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-mono break-all"
              >
                <Hash className="w-3 h-3 shrink-0" />
                {booking.txHash}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {/* Cancellation info */}
          {booking.cancellationRequested && booking.cancellationReason && (
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
              <p className="text-xs uppercase tracking-widest font-mono text-orange-400/70 mb-2">退款申请</p>
              <p className="text-sm text-white/70">{booking.cancellationReason}</p>
              {booking.cancellationRequestedAt?.toDate && (
                <p className="text-xs text-white/30 font-mono mt-2">
                  申请时间: {format(booking.cancellationRequestedAt.toDate(), 'yyyy-MM-dd HH:mm')}
                </p>
              )}
            </div>
          )}

          {/* Refund info */}
          {booking.refundTxHash && (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
              <p className="text-xs uppercase tracking-widest font-mono text-purple-400/70 mb-2">退款交易</p>
              <a
                href={`${BASESCAN_URL}${booking.refundTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-mono break-all"
              >
                <Hash className="w-3 h-3 shrink-0" />
                {booking.refundTxHash}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {/* Actions */}
          {canCancel && (
            <Button
              onClick={() => setIsCancelDialogOpen(true)}
              variant="outline"
              className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60"
            >
              <XCircle className="w-4 h-4 mr-2" />
              申请取消并退款
            </Button>
          )}

          {property && (
            <Button asChild variant="ghost" className="w-full text-white/40 hover:text-white/60">
              <a href={`/products/rental/${booking.propertyId}`}>查看房源详情</a>
            </Button>
          )}

          {/* Review Section — only for completed bookings */}
          {booking.status === 'completed' && (
            <div className="rounded-2xl border border-white/8 bg-[#0d0715]/90 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <p className="text-xs uppercase tracking-widest font-mono text-white/50">入住评价</p>
              </div>

              {existingReview ? (
                <div className="space-y-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= existingReview.rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{existingReview.content}</p>
                  <p className="text-xs text-white/25 font-mono">已评价</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Star rating */}
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setReviewRating(s)}>
                        <Star className={`w-6 h-6 transition-colors ${s <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-white/20 hover:text-amber-400/50'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="分享你的入住体验..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.07] border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/60 resize-none"
                  />
                  <Button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview || !reviewComment.trim()}
                    size="sm"
                    className="bg-purple-600/80 hover:bg-purple-600 text-white border-0"
                  >
                    {isSubmittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Send className="w-3.5 h-3.5 mr-2" />}
                    提交评价
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
