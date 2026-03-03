'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useWeb3 } from '@/contexts/Web3Context';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatWalletAddress } from '@/lib/avatarUtils';
import type { WalletChangeRequest } from '@/lib/types';
import Link from 'next/link';

export default function WalletManagementPage() {
  const { user, profile } = useUser();
  const { account, connectWallet } = useWeb3();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [changeRequests, setChangeRequests] = useState<WalletChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载钱包更换申请
  useEffect(() => {
    if (!firestore || !user) return;

    const loadChangeRequests = async () => {
      try {
        const requestsRef = collection(firestore, 'wallet_change_requests');
        const q = query(requestsRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);

        const requests: WalletChangeRequest[] = [];
        snapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          } as WalletChangeRequest);
        });

        setChangeRequests(requests.sort((a, b) => 
          b.requestTime?.toDate?.().getTime() - a.requestTime?.toDate?.().getTime()
        ));
      } catch (error) {
        console.error('Error loading change requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChangeRequests();
  }, [firestore, user]);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: 'Copied!',
      description: 'Wallet address copied to clipboard.',
    });
  };

  const handleSubmitChangeRequest = async () => {
    if (!newWalletAddress.trim() || !reason.trim() || !user || !firestore || !profile?.walletAddress) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all fields.',
        variant: 'destructive'
      });
      return;
    }

    // 验证地址格式
    if (!newWalletAddress.startsWith('0x') || newWalletAddress.length !== 42) {
      toast({
        title: 'Invalid address',
        description: 'Please enter a valid wallet address.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(firestore, 'wallet_change_requests'), {
        userId: user.uid,
        oldWalletAddress: profile.walletAddress,
        newWalletAddress: newWalletAddress.trim(),
        reason: reason.trim(),
        status: 'pending',
        requestTime: serverTimestamp()
      });

      toast({
        title: 'Request submitted!',
        description: 'Your wallet change request has been submitted for review.',
      });

      setShowChangeForm(false);
      setNewWalletAddress('');
      setReason('');

      // 重新加载申请列表
      window.location.reload();
    } catch (error) {
      console.error('Error submitting change request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <Card className="glass-morphism border-white/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/60 mb-6">You need to sign in to manage your wallet.</p>
          <Link href="/auth/signin">
            <Button className="bg-gradient-to-r from-primary to-secondary">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Wallet Management</h1>
          <p className="text-white/60">
            Manage your connected wallet and request changes
          </p>
        </div>

        {/* Current Wallet */}
        <Card className="glass-morphism border-white/10 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Current Wallet
          </h2>

          {profile?.walletAddress ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex-1">
                  <p className="text-sm text-white/60 mb-1">Wallet Address</p>
                  <p className="text-white font-mono">{profile.walletAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAddress(profile.walletAddress!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a
                    href={`https://basescan.org/address/${profile.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

              {profile.walletBindTime && (
                <p className="text-sm text-white/60">
                  Bound since: {new Date(profile.walletBindTime.toDate()).toLocaleDateString()}
                </p>
              )}

              {!showChangeForm && (
                <Button
                  onClick={() => setShowChangeForm(true)}
                  variant="outline"
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  Request Wallet Change
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 mb-4">No wallet connected</p>
              <Button
                onClick={connectWallet}
                className="bg-gradient-to-r from-primary to-secondary"
              >
                Connect Wallet
              </Button>
            </div>
          )}
        </Card>

        {/* Change Request Form */}
        {showChangeForm && (
          <Card className="glass-morphism border-yellow-500/30 p-6 mb-8 bg-yellow-500/5">
            <h3 className="text-lg font-bold text-white mb-4">Request Wallet Change</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-2 block">New Wallet Address</label>
                <Input
                  value={newWalletAddress}
                  onChange={(e) => setNewWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="bg-black/40 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-white/70 mb-2 block">Reason for Change</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please explain why you need to change your wallet..."
                  className="bg-black/40 border-white/20 text-white"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitChangeRequest}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
                <Button
                  onClick={() => setShowChangeForm(false)}
                  variant="outline"
                  className="border-white/20"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Change Requests History */}
        <Card className="glass-morphism border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Change Request History</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : changeRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60">No change requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {changeRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(request.status)}
                        <span className="text-xs text-white/40">
                          {request.requestTime?.toDate?.().toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mb-1">From:</p>
                      <p className="text-white font-mono text-sm mb-2">{formatWalletAddress(request.oldWalletAddress)}</p>
                      <p className="text-sm text-white/60 mb-1">To:</p>
                      <p className="text-white font-mono text-sm mb-2">{formatWalletAddress(request.newWalletAddress)}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-lg">
                    <p className="text-sm text-white/60 mb-1">Reason:</p>
                    <p className="text-sm text-white">{request.reason}</p>
                  </div>
                  {request.status === 'rejected' && request.reviewNote && (
                    <div className="mt-3 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-sm text-red-400 mb-1">Admin Note:</p>
                      <p className="text-sm text-white">{request.reviewNote}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
