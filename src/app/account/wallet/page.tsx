'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useWeb3 } from '@/contexts/Web3Context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,

  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  ArrowRight,
  History,
  Link2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatWalletAddress } from '@/lib/avatarUtils';
import {
  getWalletChangeEligibility,
  submitWalletChangeRequest,
  type WalletChangeRequestRecord,
} from '@/lib/wallet-change-requests';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function toDateText(value: any): string {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function GlassCard({ children, className, delay = 0, accentColor = 'purple' }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  accentColor?: 'purple' | 'blue' | 'green' | 'yellow';
}) {
  const accents: Record<string, string> = {
    purple: 'via-purple-500/30',
    blue: 'via-blue-500/30',
    green: 'via-green-500/30',
    yellow: 'via-yellow-500/30',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('relative', className)}
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/[0.02] pointer-events-none" />
      <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
        <div className={cn('h-px w-full bg-gradient-to-r from-transparent to-transparent', accents[accentColor])} />
        <div className="p-6">
          {children}
        </div>
      </div>
    </motion.div>
  );
}

export default function WalletManagementPage() {
  const { user, profile } = useUser();
  const { account, connectWallet, boundWalletAddress, walletBindingMessage } = useWeb3();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [requests, setRequests] = useState<WalletChangeRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [reason, setReason] = useState('');
  const [approvedThisMonth, setApprovedThisMonth] = useState(0);
  const [hasPending, setHasPending] = useState(false);

  const connectedWallet = account?.toLowerCase() || null;
  const boundWallet = boundWalletAddress || profile?.walletAddress?.toLowerCase() || null;
  const isMismatch = !!connectedWallet && !!boundWallet && connectedWallet !== boundWallet;

  const loadRequests = async () => {
    if (!firestore || !user) return;

    setIsLoading(true);
    try {
      const q = query(collection(firestore, 'walletChangeRequests'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as WalletChangeRequestRecord));

      rows.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      setRequests(rows);

      const eligibility = await getWalletChangeEligibility(firestore, user.uid);
      setApprovedThisMonth(eligibility.approvedThisMonth);
      setHasPending(eligibility.hasPending);
    } catch (error) {
      console.error('Failed to load wallet change requests:', error);
      toast({ variant: 'destructive', title: 'Load failed', description: 'Could not load wallet change requests.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests().catch(console.error);
  }, [firestore, user?.uid]);

  const canSubmitRequest = useMemo(() => {
    return !!user && !!firestore && !!boundWallet && approvedThisMonth < 2 && !hasPending;
  }, [user, firestore, boundWallet, approvedThisMonth, hasPending]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({ title: 'Copied!', description: 'Wallet address copied.' });
  };

  const handleSubmitChangeRequest = async () => {
    if (!firestore || !user || !boundWallet) return;

    setIsSubmitting(true);
    try {
      const result = await submitWalletChangeRequest({
        firestore,
        userId: user.uid,
        userName: profile?.displayName || user.displayName || 'User',
        oldWalletAddress: boundWallet,
        newWalletAddress: newWalletAddress,
        source: 'manual',
        reason: reason.trim(),
      });

      if (!result.ok) {
        toast({ variant: 'destructive', title: 'Request blocked', description: result.message });
        return;
      }

      toast({ title: 'Request submitted', description: 'Your wallet change request is waiting for admin approval.' });
      setNewWalletAddress('');
      setReason('');
      await loadRequests();
    } catch (error) {
      console.error('Submit request failed:', error);
      toast({ variant: 'destructive', title: 'Submit failed', description: 'Failed to create wallet change request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return (
      <Badge className="bg-green-500/15 text-green-400 border-green-500/25 text-xs">
        <CheckCircle className="h-3 w-3 mr-1" />Approved
      </Badge>
    );
    if (status === 'rejected') return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-xs">
        <XCircle className="h-3 w-3 mr-1" />Rejected
      </Badge>
    );
    return (
      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/25 text-xs">
        <Clock className="h-3 w-3 mr-1" />Pending
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-sm w-full text-center"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 pointer-events-none" />
          <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-white/8 p-8">
            <div className="p-4 rounded-2xl bg-yellow-500/15 border border-yellow-500/20 inline-flex mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">请先登录</h2>
            <p className="text-muted-foreground/70 text-sm mb-6">您需要登录才能管理钱包。</p>
            <Link href="/auth/signin">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 border-0">登录</Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-purple-600/8 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto max-w-4xl space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-2"
        >
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Wallet className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent font-headline">
              Wallet Management
            </h1>
            <p className="text-sm text-muted-foreground/70">Wallet changes require admin approval to protect payment security.</p>
          </div>
        </motion.div>

        {/* Wallet Status Card */}
        <GlassCard delay={0.1} accentColor="blue">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/20">
              <Link2 className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-semibold text-sm text-foreground">Wallet Status</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-4">
            <div className="p-4 rounded-xl bg-background/40 border border-white/8">
              <p className="text-xs text-muted-foreground/60 mb-2">Connected Wallet</p>
              <p className="text-sm font-mono text-foreground/90 break-all">
                {connectedWallet || <span className="text-muted-foreground/50 italic">Not connected</span>}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background/40 border border-white/8">
              <p className="text-xs text-muted-foreground/60 mb-2">Bound Wallet</p>
              <p className="text-sm font-mono text-foreground/90 break-all">
                {boundWallet || <span className="text-muted-foreground/50 italic">Not bound</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* 本月审批额度 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-white/70">本月已审批</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white">{approvedThisMonth}</span>
                <span className="text-sm text-white/35 font-mono">/ 2</span>
                <div className="flex gap-1 ml-1">
                  {[0,1].map(i => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < approvedThisMonth ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-white/15'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Pending */}
            {hasPending && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <Clock className="w-5 h-5 text-yellow-400 shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-black text-yellow-300">有待审批的绑定请求</p>
                  <p className="text-xs text-yellow-400/60 mt-0.5">Pending wallet binding request</p>
                </div>
                <div className="ml-auto w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
              </div>
            )}

            {/* Mismatch */}
            {isMismatch && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                <div>
                  <p className="text-sm font-black text-orange-300">当前连接钱包与绑定钱包不一致</p>
                  <p className="text-xs text-orange-400/60 mt-0.5">Connected wallet differs from bound wallet</p>
                </div>
              </div>
            )}
          </div>

          {walletBindingMessage && (
            <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/8 p-3 text-sm text-blue-200">
              {walletBindingMessage}
            </div>
          )}

          {!account && (
            <Button
              onClick={async () => {
                try {
                  await connectWallet();
                } catch (err: any) {
                  const msg = err?.message || '';
                  if (err?.code === 4001 || msg.includes('rejected') || msg.includes('denied')) {
                    toast({ variant: 'destructive', title: '已取消', description: '你在 MetaMask 中拒绝了连接请求。' });
                  } else if (msg.includes('not installed') || msg.includes('not detected')) {
                    toast({ variant: 'destructive', title: '未检测到钱包', description: '请安装 MetaMask 或其他 Web3 钱包扩展后重试。' });
                  } else {
                    toast({ variant: 'destructive', title: '连接失败', description: msg || '无法连接钱包，请重试。' });
                  }
                }
              }}
              className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-0 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </GlassCard>

        {/* Change Request Form */}
        <GlassCard delay={0.2} accentColor="purple">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/20">
              <ArrowRight className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">Manual Wallet Change Request</h2>
              <p className="text-xs text-muted-foreground/60">If auto-request was not triggered, you can submit a request here.</p>
            </div>
          </div>

          <div className="h-px bg-white/5 mb-5" />

          <div className="space-y-3">
            <Input
              value={newWalletAddress}
              onChange={(e) => setNewWalletAddress(e.target.value)}
              placeholder="New wallet address (0x...)"
              className="bg-background/50 border-white/10 hover:border-purple-500/30 focus:border-purple-500/60 focus-visible:ring-purple-500/20 font-mono text-sm transition-colors"
              disabled={!canSubmitRequest || isSubmitting}
            />
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for wallet change"
              className="bg-background/50 border-white/10 hover:border-purple-500/30 focus:border-purple-500/60 focus-visible:ring-purple-500/20 text-sm resize-none transition-colors"
              rows={3}
              disabled={!canSubmitRequest || isSubmitting}
            />
            <div className="flex items-center justify-between gap-3">
              <Button
                onClick={handleSubmitChangeRequest}
                disabled={!canSubmitRequest || isSubmitting || !newWalletAddress.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Change Request
              </Button>
              {!canSubmitRequest && (
                <p className="text-xs text-yellow-400/80 flex-1">
                  Cannot submit: pending request exists, monthly limit reached, or no bound wallet.
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Request History */}
        <GlassCard delay={0.3} accentColor="green">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 rounded-xl bg-green-500/15 border border-green-500/20">
              <History className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="font-semibold text-sm text-foreground">Request History</h2>
          </div>

          <div className="h-px bg-white/5 mb-4" />

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="relative">
                <div className="absolute -inset-3 bg-purple-500/15 rounded-full blur-lg animate-pulse" />
                <Loader2 className="relative h-7 w-7 animate-spin text-purple-400" />
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground/50 text-sm">
              No wallet change requests yet.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request: any, idx) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-4 rounded-xl bg-background/30 border border-white/8 hover:border-white/12 transition-colors space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {getStatusBadge(request.status)}
                    <span className="text-xs text-muted-foreground/40">
                      Created: {toDateText(request.createdAt || request.requestTime)}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-background/40 border border-white/5">
                      <p className="text-xs text-muted-foreground/50 mb-1">From</p>
                      <p className="text-sm font-mono text-foreground/80">{formatWalletAddress(request.oldWalletAddress || '')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/40 border border-white/5">
                      <p className="text-xs text-muted-foreground/50 mb-1">To</p>
                      <p className="text-sm font-mono text-foreground/80">{formatWalletAddress(request.newWalletAddress || '')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-muted-foreground/50 space-x-3">
                      <span>Reviewed: {toDateText(request.reviewedAt || request.reviewTime)}</span>
                      {request.rejectionReason && (
                        <span className="text-red-400/70">Reason: {request.rejectionReason}</span>
                      )}
                    </div>
                    {request.newWalletAddress && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyAddress(request.newWalletAddress)}
                          className="h-7 w-7 p-0 hover:bg-white/5"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <a href={`https://basescan.org/address/${request.newWalletAddress}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-white/5">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
