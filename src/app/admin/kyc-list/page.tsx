
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
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

// In a real app, this would come from auth claims. For this prototype, we hardcode it.
const ADMIN_UID = 'test-user-uid';

export default function KycListPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [applications, setApplications] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore || !user) return;

    // Simulate admin access check
    if (user.uid !== ADMIN_UID) {
        setLoading(false);
        return;
    }
    
    setLoading(true);
    const q = query(collection(firestore, 'users'), where('kycStatus', '==', 'Pending'));
    
    getDocs(q)
      .then(querySnapshot => {
        const pendingUsers = querySnapshot.docs.map(doc => doc.data() as UserProfile);
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
    
    // --- MOCK ACTION ---
    // In a real app, this would be a Cloud Function call.
    // The frontend cannot directly update other users' documents due to security rules.
    // We simulate the action for this prototype.
    setTimeout(() => {
      // Update local state to reflect the change in the UI
      setApplications(prev => prev.filter(app => app.uid !== targetUid));
      
      toast({
        title: `User ${newStatus}`,
        description: `(Prototype Action) User ${targetUid.slice(0, 8)}... has been ${newStatus}.`,
      });
      setProcessingId(null);
    }, 1000);
    
    // The code below is what you'd use with a backend function or relaxed rules,
    // but it will fail with the current secure rules.
    /*
    if (!firestore) return;
    try {
      const userRef = doc(firestore, 'users', targetUid);
      await updateDoc(userRef, { kycStatus: newStatus });
      setApplications(prev => prev.filter(app => app.uid !== targetUid));
      toast({
        title: "Success",
        description: `User status updated to ${newStatus}.`
      });
    } catch (error) {
      console.error("Error updating user status: ", error);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "You do not have permission to perform this action.",
      });
    } finally {
      setProcessingId(null);
    }
    */
  };
  
  if (userLoading || loading) {
    return <div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  // Simulated admin access check
  if (!user || user.uid !== ADMIN_UID) {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You do not have permission to view this page. This is for admin users only.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-headline mb-6">KYC Applications</h2>
      <Alert className="mb-6">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Prototype Mode</AlertTitle>
        <AlertDescription>
          Approve/Reject actions are simulated and will not write to the database due to security rules. The UI will update to demonstrate the flow.
        </AlertDescription>
      </Alert>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>UID</TableHead>
            <TableHead>Submitted</TableHead>
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
              <TableCell colSpan={4} className="h-24 text-center">
                No pending KYC applications.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
