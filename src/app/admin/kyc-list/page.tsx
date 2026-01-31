
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldAlert, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/use-translation';

export default function KycListPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [applications, setApplications] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [rejectionTarget, setRejectionTarget] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!firestore || !user) return;
    
    setLoading(true);
    const q = query(collection(firestore, 'users'), where('kycStatus', '==', 'Pending'));
    
    getDocs(q)
      .then(querySnapshot => {
        const pendingUsers = querySnapshot.docs.map(doc => ({...doc.data(), uid: doc.id}) as UserProfile);
        setApplications(pendingUsers);
      })
      .catch(error => {
        console.error("Error fetching KYC applications: ", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: t('admin.kycListPage.fetchError'),
        });
      })
      .finally(() => setLoading(false));

  }, [firestore, user, toast, t]);

  const handleApprove = async (targetUid: string) => {
    setProcessingId(targetUid);
    
    if (!firestore) return;

    try {
      const userRef = doc(firestore, 'users', targetUid);
      await updateDoc(userRef, { kycStatus: 'Verified' });
      
      const notificationsCollection = collection(firestore, 'users', targetUid, 'notifications');
      const notification = {
            title: t('admin.kycListPage.userStatusUpdated', { status: 'Verified' }),
            message: t('admin.kycListPage.userStatusUpdatedDesc', { uid: targetUid.slice(0, 8) }),
            read: false,
            createdAt: serverTimestamp(),
            type: 'success' as const
          };

      await addDoc(notificationsCollection, notification);

      setApplications(prev => prev.filter(app => app.uid !== targetUid));
      toast({
          title: t('admin.kycListPage.userStatusUpdated', { status: 'Verified' }),
          description: t('admin.kycListPage.userStatusUpdatedDesc', { uid: targetUid.slice(0, 8) }),
      });
    } catch (error) {
      console.error("Error approving user: ", error);
      toast({
        variant: "destructive",
        title: t('admin.kycListPage.actionFailed'),
        description: t('admin.kycListPage.actionFailedDesc'),
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionTarget || !rejectionReason.trim() || !firestore) return;

    const targetUid = rejectionTarget.uid;
    setProcessingId(targetUid);

    try {
      const userRef = doc(firestore, 'users', targetUid);
      await updateDoc(userRef, { kycStatus: 'Not Verified' });

      const notificationsCollection = collection(firestore, 'users', targetUid, 'notifications');
      const notification = {
            title: t('admin.kycListPage.userStatusUpdated', { status: 'Not Verified' }),
            message: t('admin.kycListPage.kycRejectedNotification', { reason: rejectionReason }),
            read: false,
            createdAt: serverTimestamp(),
            type: 'error' as const
          };
      await addDoc(notificationsCollection, notification);
      
      setApplications(prev => prev.filter(app => app.uid !== targetUid));
      toast({
          title: t('admin.kycListPage.userStatusUpdated', { status: 'Not Verified' }),
          description: t('admin.kycListPage.userStatusUpdatedDesc', { uid: targetUid.slice(0, 8) }),
      });

    } catch (error) {
       console.error("Error rejecting user: ", error);
      toast({
        variant: "destructive",
        title: t('admin.kycListPage.actionFailed'),
        description: t('admin.kycListPage.actionFailedDesc'),
      });
    } finally {
      setProcessingId(null);
      setRejectionTarget(null);
      setRejectionReason('');
    }
  }
  
  if (userLoading || loading) {
    return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div>
      <h2 className="text-3xl font-headline mb-6">{t('admin.kycListPage.title')}</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('admin.kycListPage.user')}</TableHead>
            <TableHead>{t('admin.kycListPage.uid')}</TableHead>
            <TableHead>{t('admin.kycListPage.submitted')}</TableHead>
            <TableHead>{t('admin.kycListPage.documents')}</TableHead>
            <TableHead className="text-right">{t('admin.kycListPage.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length > 0 ? (
            applications.map(app => (
              <TableRow key={app.uid}>
                <TableCell className="font-medium flex items-center gap-3">
                  <Avatar>
                      <AvatarImage src={app.photoURL} alt={app.displayName} />
                      <AvatarFallback>{app.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {app.displayName}
                </TableCell>
                <TableCell className="font-mono text-xs">{app.uid}</TableCell>
                <TableCell>{app.lastLogin?.toDate ? formatDistanceToNow(app.lastLogin.toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={!app.kycIdPhotoUrl}>{t('admin.kycListPage.view')}</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{t('admin.kycListPage.dialogTitle', { displayName: app.displayName })}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h3 className="font-semibold mb-2">{t('admin.kycListPage.idDocument')}</h3>
                          {app.kycIdPhotoUrl ? (
                            <Image src={app.kycIdPhotoUrl} alt="ID Document" width={600} height={400} className="rounded-md" />
                          ) : <p>{t('admin.kycListPage.noIdPhoto')}</p>}
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">{t('admin.kycListPage.selfie')}</h3>
                          {app.kycSelfieUrl ? (
                            <Image src={app.kycSelfieUrl} alt="Selfie" width={600} height={400} className="rounded-md" />
                          ) : <p>{t('admin.kycListPage.noSelfie')}</p>}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => handleApprove(app.uid)}
                    disabled={processingId === app.uid}
                  >
                    {processingId === app.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    {t('admin.kycListPage.approve')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => setRejectionTarget(app)}
                    disabled={processingId === app.uid}
                  >
                    {processingId === app.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    {t('admin.kycListPage.reject')}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                {t('admin.kycListPage.noPending')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!rejectionTarget} onOpenChange={(open) => !open && setRejectionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.kycListPage.rejectConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.kycListPage.rejectConfirmDescription').replace('{userName}', rejectionTarget?.displayName || 'user')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="rejection-reason">{t('admin.kycListPage.rejectionReasonLabel')}</Label>
            <Textarea
              id="rejection-reason"
              placeholder={t('admin.kycListPage.rejectionReasonPlaceholder')}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionTarget(null)}>{t('admin.kycListPage.deleteCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={!rejectionReason.trim() || !!processingId}>
              {processingId === rejectionTarget?.uid && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('admin.kycListPage.confirmReject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
