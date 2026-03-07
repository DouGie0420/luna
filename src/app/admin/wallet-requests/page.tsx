'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { WalletChangeRequestRecord } from '@/lib/wallet-change-requests';

type WalletRequestStatusFilter = 'pending' | 'all';

interface WalletChangeRequestRow extends WalletChangeRequestRecord {
  id: string;
  reason?: string;
  createdAt?: any;
  reviewedAt?: any;
  approvedAt?: any;
  reviewerId?: string | null;
  rejectionReason?: string | null;
}

function toDateText(value: any): string {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function statusBadge(status: WalletChangeRequestRow['status']) {
  if (status === 'approved') {
    return (
      <Badge className="bg-green-500/15 text-green-300 border-green-500/40">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        Approved
      </Badge>
    );
  }

  if (status === 'rejected') {
    return (
      <Badge className="bg-red-500/15 text-red-300 border-red-500/40">
        <XCircle className="h-3.5 w-3.5 mr-1" />
        Rejected
      </Badge>
    );
  }

  return (
    <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/40">
      <Clock className="h-3.5 w-3.5 mr-1" />
      Pending
    </Badge>
  );
}

export default function WalletRequestsAdminPage() {
  const { user, profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [rows, setRows] = useState<WalletChangeRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<WalletRequestStatusFilter>('pending');

  const [rejectTarget, setRejectTarget] = useState<WalletChangeRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const hasAccess = useMemo(() => {
    return !!profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');
  }, [profile]);

  const loadRequests = useCallback(async () => {
    if (!firestore || !hasAccess) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const constraints = [] as any[];

      if (statusFilter === 'pending') {
        constraints.push(where('status', '==', 'pending'));
      }

      constraints.push(orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(query(collection(firestore, 'walletChangeRequests'), ...constraints));
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as WalletChangeRequestRow),
      }));

      setRows(list);
    } catch (error) {
      console.error('Failed to load wallet change requests:', error);
      toast({
        variant: 'destructive',
        title: 'Load failed',
        description: 'Could not load wallet change requests.',
      });
    } finally {
      setLoading(false);
    }
  }, [firestore, hasAccess, statusFilter, toast]);

  useEffect(() => {
    loadRequests().catch(console.error);
  }, [loadRequests]);

  const handleApprove = async (row: WalletChangeRequestRow) => {
    if (!firestore || !user) return;

    setProcessingId(row.id);

    try {
      const reqRef = doc(firestore, 'walletChangeRequests', row.id);
      const userRef = doc(firestore, 'users', row.userId);
      const batch = writeBatch(firestore);

      batch.update(userRef, {
        walletAddress: row.newWalletAddress,
        walletBindTime: serverTimestamp(),
        isWeb3Verified: true,
      });

      batch.update(reqRef, {
        status: 'approved',
        reviewerId: user.uid,
        reviewedAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        rejectionReason: null,
      });

      await batch.commit();

      toast({
        title: 'Request approved',
        description: 'Wallet binding has been updated for this user.',
      });

      await loadRequests();
    } catch (error) {
      console.error('Approve wallet request failed:', error);
      toast({
        variant: 'destructive',
        title: 'Approve failed',
        description: 'Could not approve this wallet change request.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!firestore || !user || !rejectTarget || !rejectReason.trim()) return;

    setProcessingId(rejectTarget.id);

    try {
      await updateDoc(doc(firestore, 'walletChangeRequests', rejectTarget.id), {
        status: 'rejected',
        reviewerId: user.uid,
        reviewedAt: serverTimestamp(),
        approvedAt: null,
        rejectionReason: rejectReason.trim(),
      });

      toast({
        title: 'Request rejected',
        description: 'Rejection reason has been saved.',
      });

      setRejectTarget(null);
      setRejectReason('');
      await loadRequests();
    } catch (error) {
      console.error('Reject wallet request failed:', error);
      toast({
        variant: 'destructive',
        title: 'Reject failed',
        description: 'Could not reject this wallet change request.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-white/70">
        You do not have permission to review wallet requests.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet Change Requests</h1>
          <p className="text-sm text-white/60">Review wallet rebinding requests before any payout address changes.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button variant="outline" onClick={() => loadRequests()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Request Queue ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Old Wallet</TableHead>
                <TableHead>New Wallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-white/60">
                    No wallet change requests found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const busy = processingId === row.id;
                  const canReview = row.status === 'pending';

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{row.userName || 'User'}</p>
                          <p className="text-xs text-white/50 font-mono">{row.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.oldWalletAddress || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{row.newWalletAddress}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {statusBadge(row.status)}
                          <p className="text-[11px] text-white/50">{row.source || 'manual'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-white/60">{toDateText(row.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Wallet className="h-4 w-4" />
                                  Wallet Change Request Detail
                                </DialogTitle>
                                <DialogDescription>
                                  Request ID: {row.id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="rounded-md border border-white/15 p-3">
                                  <p className="text-xs text-white/60 mb-1">User</p>
                                  <p className="font-medium">{row.userName || 'User'}</p>
                                  <p className="text-xs text-white/50 font-mono break-all">{row.userId}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div className="rounded-md border border-white/15 p-3">
                                    <p className="text-xs text-white/60 mb-1">Old Wallet</p>
                                    <p className="font-mono text-xs break-all">{row.oldWalletAddress || '-'}</p>
                                  </div>
                                  <div className="rounded-md border border-white/15 p-3">
                                    <p className="text-xs text-white/60 mb-1">New Wallet</p>
                                    <p className="font-mono text-xs break-all">{row.newWalletAddress}</p>
                                  </div>
                                </div>
                                <div className="rounded-md border border-white/15 p-3 space-y-1">
                                  <p><span className="text-white/60">Status:</span> {row.status}</p>
                                  <p><span className="text-white/60">Source:</span> {row.source || '-'}</p>
                                  <p><span className="text-white/60">Created:</span> {toDateText(row.createdAt)}</p>
                                  <p><span className="text-white/60">Reviewed:</span> {toDateText(row.reviewedAt)}</p>
                                  <p><span className="text-white/60">Reviewer:</span> {row.reviewerId || '-'}</p>
                                  {row.rejectionReason ? (
                                    <p className="text-red-300"><span className="text-white/60">Rejection:</span> {row.rejectionReason}</p>
                                  ) : null}
                                  {row.reason ? (
                                    <p><span className="text-white/60">User reason:</span> {row.reason}</p>
                                  ) : null}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-300 border-red-500/40 hover:bg-red-500/10"
                            disabled={!canReview || !!processingId}
                            onClick={() => setRejectTarget(row)}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          </Button>

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={!canReview || !!processingId}
                            onClick={() => handleApprove(row)}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject wallet change request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason. The user will see this in wallet request history.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-2 py-2">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || !!processingId}
            >
              {processingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
