'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, updateDoc, doc, where, writeBatch } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bell, Circle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export function NotificationBell() {
  const { user } = useUser();
  const firestore = useFirestore();

  const notificationsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, 'notifications'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: notifications, loading } = useCollection<Notification>(notificationsQuery);

  const unreadCount = useMemo(() => {
    if (!notifications) return 0;
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleOpenChange = async (open: boolean) => {
    if (open || !firestore || !notifications || unreadCount === 0) return;

    // Mark all unread as read
    const batch = writeBatch(firestore);
    notifications.forEach(notif => {
      if (!notif.read) {
        const notifRef = doc(firestore, 'notifications', notif.id);
        batch.update(notifRef, { read: true });
      }
    });
    await batch.commit();
  };

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Circle className="h-2 w-2 text-green-500 fill-green-500" />;
      case 'error':
        return <Circle className="h-2 w-2 text-red-500 fill-red-500" />;
      case 'warning':
        return <Circle className="h-2 w-2 text-yellow-500 fill-yellow-500" />;
      default:
        return <Circle className="h-2 w-2 text-gray-500 fill-gray-500" />;
    }
  };

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
         <div className="relative h-9 w-9 rounded-full p-0.5 bg-gradient-to-r from-yellow-300 via-lime-400 to-violet-500 animate-hue-rotate">
            <Button variant="ghost" size="icon" title="Notifications" className="h-full w-full rounded-full bg-background hover:bg-transparent">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <div className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-background animate-pulse" />
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96">
            {loading ? (
                 <p className="p-4 text-sm text-center text-muted-foreground">Loading...</p>
            ) : notifications && notifications.length > 0 ? (
              notifications.map(notif => (
                <DropdownMenuItem key={notif.id} className="flex items-start gap-3 whitespace-normal" asChild>
                  {/* We can make notifications link somewhere in the future */}
                  {/* <Link href={notif.link || '#'}> */}
                    <div className="mt-1">{getIconForType(notif.type)}</div>
                    <div className="flex-1">
                        <p className={`font-semibold ${!notif.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notif.title}</p>
                        <p className="text-xs text-muted-foreground">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}</p>
                    </div>
                  {/* </Link> */}
                </DropdownMenuItem>
              ))
            ) : (
                 <p className="p-4 text-sm text-center text-muted-foreground">No new notifications</p>
            )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
