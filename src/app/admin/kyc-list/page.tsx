
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function KycListPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [applications, setApplications] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !user) return;
    
    // The layout already handles admin access check, but we can keep this as a fallback.
    // if (profile?.role !== 'admin') {
    //     setLoading(false);
    //     return;
    // }
    
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
          description: "Could not fetch KYC applications.",
        });
      })
      .finally(() => setLoading(false));

  }, [firestore, user, toast]);

  const handleAction = async (targetUid: string, newStatus: 'Verified' | 'Not Verified') => {
    setProcessingId(targetUid);
    
    if (!firestore) return;

    try {
      // In a real production app, this should be a Cloud Function for security.
      // For this prototype, we'll allow admin clients to write directly.
      const userRef = doc(firestore, 'users', targetUid);
      await updateDoc(userRef, { kycStatus: newStatus });
      
      // Send notification based on template
      const notificationsCollection = collection(firestore, 'notifications');
      const notification = newStatus === 'Verified'
        ? {
            userId: targetUid,
            title: 'KYC 验证成功',
            message: '您的赛博身份已激活，快去点亮勋章吧！',
            read: false,
            createdAt: serverTimestamp(),
            type: 'success' as const
          }
        : {
            userId: targetUid,
            title: 'KYC 资料需修改',
            message: '您的照片不符合规范，请重新上传。',
            read: false,
            createdAt: serverTimestamp(),
            type: 'error' as const
          };

      await addDoc(notificationsCollection, notification);

      setApplications(prev => prev.filter(app => app.uid !== targetUid));
      toast({
          title: `User ${newStatus}`,
          description: `User ${targetUid.slice(0, 8)}... status has been updated and they have been notified.`,
      });
    } catch (error) {
      console.error("Error updating user status: ", error);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not update user status. Check Firestore rules and permissions.",
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  if (userLoading || loading) {
    return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div>
      <h2 className="text-3xl font-headline mb-6">KYC Applications</h2>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>UID</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Documents</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                      <Button variant="outline" size="sm" disabled={!app.kycIdPhotoUrl}>View</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>KYC Documents for {app.displayName}</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h3 className="font-semibold mb-2">ID Document</h3>
                          {app.kycIdPhotoUrl ? (
                            <Image src={app.kycIdPhotoUrl} alt="ID Document" width={600} height={400} className="rounded-md" />
                          ) : <p>No ID photo submitted.</p>}
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Selfie</h3>
                          {app.kycSelfieUrl ? (
                            <Image src={app.kycSelfieUrl} alt="Selfie" width={600} height={400} className="rounded-md" />
                          ) : <p>No selfie submitted.</p>}
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
                    onClick={() => handleAction(app.uid, 'Verified')}
                    disabled={processingId === app.uid}
                  >
                    {processingId === app.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => handleAction(app.uid, 'Not Verified')}
                    disabled={processingId === app.uid}
                  >
                    {processingId === app.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No pending KYC applications.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
