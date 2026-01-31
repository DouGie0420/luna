'use client';

import { useEffect, useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

export function NotificationsProvider() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'), 
        where('userId', '==', user.uid),
        where('read', '==', false)
    );
  }, [firestore, user]);

  const { data: notifications } = useCollection<Notification>(notificationsQuery);

  useEffect(() => {
    if (notifications && notifications.length > 0 && firestore) {
      notifications.forEach(notif => {
        toast({
          title: (
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> {notif.title}
            </div>
          ),
          description: notif.message,
          duration: 10000,
        });

        // Mark as read
        const notifRef = doc(firestore, 'notifications', notif.id);
        updateDoc(notifRef, { read: true });
      });
    }
  }, [notifications, firestore, toast]);

  return null; // This component doesn't render anything itself
}
