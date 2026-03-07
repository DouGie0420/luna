'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useWeb3 } from '@/contexts/Web3Context';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatWalletAddress } from '@/lib/avatarUtils';
import {
  getWalletChangeEligibility,
  submitWalletChangeRequest,
  type WalletChangeRequestRecord,
} from '@/lib/wallet-change-requests';
import Link from 'next/link';

function toDateText(value: any): string {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
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
      toast({
        variant: 'destructive',
        title: 'Load failed',
        description: 'Could not load wallet change requests.',
      });
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
        toast({
          variant: 'destructive',
          title: 'Request blocked',
          description: result.message,
        });
        return;
      }

      toast({
        title: 'Request submitted',
        description: 'Your wallet change request is waiting for admin approval.',
      });
      setNewWalletAddress('');
      setReason('');
      await loadRequests();
    } catch (error) {
      console.error('Submit request failed:', error);
      toast({
        variant: 'destructive',
        title: 'Submit failed',
        description: 'Failed to create wallet change request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (status === 'rejected') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-white/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/60 mb-6">You need to sign in to manage your wallet.</p>
          <Link href="/auth/signin">
            <Button className="bg-gradient-to-r from-primary to-secondary">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Wallet Management</h1>
          <p className="text-white/60">Wallet changes require admin approval to protect payment security.</p>
        </div>

        <Card className="glass-morphism border-white/10 p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Wallet Status
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-white/60 mb-1">Connected Wallet</p>
              <p className="text-white font-mono break-all">{connectedWallet || 'Not connected'}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg border border-white/10">
              <p className="text-xs text-white/60 mb-1">Bound Wallet</p>
              <p className="text-white font-mono break-all">{boundWallet || 'Not bound'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="text-white/80 border-white/30">Approved this month: {approvedThisMonth}/2</Badge>
            {hasPending && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40">Pending request exists</Badge>}
            {isMismatch && <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40">Connected wallet differs from bound wallet</Badge>}
          </div>

          {walletBindingMessage && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
              {walletBindingMessage}
            </div>
          )}

          {!account && (
            <Button onClick={connectWallet} className="bg-gradient-to-r from-primary to-secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </Card>

        <Card className="glass-morphism border-white/10 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Manual Wallet Change Request</h2>
          <p className="text-sm text-white/60">If auto-request was not triggered, you can submit a request here.</p>

          <div className="space-y-3">
            <Input
              value={newWalletAddress}
              onChange={(e) => setNewWalletAddress(e.target.value)}
              placeholder="New wallet address (0x...)"
              className="bg-black/40 border-white/20 text-white"
              disabled={!canSubmitRequest || isSubmitting}
            />
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for wallet change"
              className="bg-black/40 border-white/20 text-white"
              rows={3}
              disabled={!canSubmitRequest || isSubmitting}
            />
            <Button
              onClick={handleSubmitChangeRequest}
              disabled={!canSubmitRequest || isSubmitting || !newWalletAddress.trim()}
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Change Request
            </Button>
            {!canSubmitRequest && (
              <p className="text-xs text-yellow-300">You cannot submit now: pending request exists, monthly approved limit reached, or no bound wallet.</p>
            )}
          </div>
        </Card>

        <Card className="glass-morphism border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Request History</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-white/60">No wallet change requests yet.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request: any) => (
                <div key={request.id} className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {getStatusBadge(request.status)}
                    <span className="text-xs text-white/40">Created: {toDateText(request.createdAt || request.requestTime)}</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-white/50">From</p>
                      <p className="text-white font-mono">{formatWalletAddress(request.oldWalletAddress || '')}</p>
                    </div>
                    <div>
                      <p className="text-white/50">To</p>
                      <p className="text-white font-mono">{formatWalletAddress(request.newWalletAddress || '')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span>Reviewed: {toDateText(request.reviewedAt || request.reviewTime)}</span>
                    {request.rejectionReason ? <span className="text-red-300">Reason: {request.rejectionReason}</span> : null}
                  </div>

                  {request.newWalletAddress ? (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyAddress(request.newWalletAddress)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <a href={`https://basescan.org/address/${request.newWalletAddress}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


