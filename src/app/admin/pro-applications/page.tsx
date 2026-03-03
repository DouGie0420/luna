// @ts-nocheck
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  writeBatch,
  where,
  getDocs,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Award,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '@/hooks/use-translation';
import type { ProApplication } from '@/lib/types';
import { createNotification } from '@/lib/notifications';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PAGE_SIZE = 50;

const planTiers: Record<string, string> = {
    tier1: '1 Month',
    tier2: '3 Months',
    tier3: '1 Year',
};

export default function AdminProApplicationsPage() {
  const { profile, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<ProApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<any>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const hasAccess = profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || '');

  const fetchApplications = useCallback(async (loadMore = false) => {
    if (!firestore || !hasAccess) {
      setLoading(false);
      return;
    }

    if (loadMore) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    
    try {
      const constraints = [
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE),
      ];

      if (loadMore && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }

      const q = query(collection(firestore, 'proApplications'), ...constraints);
      const documentSnapshots = await getDocs(q);

      const newApplications = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProApplication));
      
      setRequests(prev => loadMore ? [...prev, ...newApplications] : newApplications);
      setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
      setHasMore(documentSnapshots.docs.length === PAGE_SIZE);

    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [firestore, hasAccess, lastVisible]);
  
  useEffect(() => {
    fetchApplications();
  }, [firestore, hasAccess]);


  const handleApprove = async (request: ProApplication) => {
    if (!firestore || !profile) return;
    setProcessingId(request.id);
    try {
      const batch = writeBatch(firestore);
      const requestRef = doc(firestore, 'proApplications', request.id);
      const userRef = doc(firestore, 'users', request.userId);

      batch.update(userRef, { isPro: true, displayedBadge: 'pro' });
      batch.update(requestRef, { status: 'approved', reviewedAt: new Date(), reviewerId: profile.uid });

      await batch.commit();

      // await createNotification(firestore, request.userId, { type: 'proRequestApproved', actor: profile, requestId: request.id });
      setRequests(prev => prev.filter(r => r.id !== request.id));
      toast({ title: '申请已批准' });
    } catch (error: any) {
        console.error("Error approving PRO application:", error);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `users/${request.userId} or proApplications/${request.id}`,
            operation: 'update',
        }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: ProApplication) => {
    if (!firestore || !profile) return;
    setProcessingId(request.id);

    try {
        const requestRef = doc(firestore, "proApplications", request.id);
        await updateDoc(requestRef, {
            status: 'rejected',
            reviewedAt: new Date(),
            reviewerId: profile.uid,
        });

        // await createNotification(firestore, request.userId, { type: 'proRequestRejected', actor: profile, requestId: request.id });
        setRequests(prev => prev.filter(r => r.id !== request.id));
        toast({ title: '申请已拒绝' });
    } catch (error: any) {
        console.error("Error rejecting PRO application:", error);
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `proApplications/${request.id}`,
            operation: 'update',
        }));
    } finally {
        setProcessingId(null);
    }
  };

  const isLoading = authLoading || loading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if(error) {
    return (
         <div className="flex h-[60vh] items-center justify-center">
             <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="mt-4 text-lg font-semibold text-destructive">数据库查询失败</h2>
                <p className="mt-2 text-sm text-muted-foreground">无法加载PRO申请。这很可能是因为缺少数据库索引。</p>
                <p className="mt-1 text-xs text-muted-foreground">请检查Firebase控制台以创建所需的复合索引。</p>
                <pre className="mt-4 p-4 text-xs bg-muted rounded-md text-left overflow-auto">{error.message}</pre>
             </div>
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PRO 商户申请</h1>
          <p className="text-sm text-muted-foreground">审核用户的 PRO 认证申请，批准后他们将获得专属特权。</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">当前权限: {profile?.role?.toUpperCase()}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            待处理申请 ({requests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>申请人</TableHead>
                <TableHead>申请套餐</TableHead>
                <TableHead>申请时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests && requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.userName} <span className="font-mono text-xs text-muted-foreground">({req.userId.slice(0, 8)}...)</span></TableCell>
                    <TableCell><Badge variant="secondary">{planTiers[req.plan] || req.plan}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {req.createdAt?.toDate ? formatDistanceToNow(req.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" variant="outline" className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(req)} disabled={!!processingId}
                        >
                          {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />} 拒绝
                        </Button>
                        <Button
                          size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(req)} disabled={!!processingId}
                        >
                          {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} 批准
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <AlertCircle className="mx-auto h-6 w-6 mb-2" />
                    暂无待处理的 PRO 申请
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={() => fetchApplications(true)} disabled={loadingMore}>
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
