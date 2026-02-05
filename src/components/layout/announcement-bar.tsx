
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Megaphone, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SnakeBorder } from '../snake-border';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

// Define the type for the announcement data
type Announcement = {
    id: string;
    title: string;
    content: string;
    isActive: boolean;
    createdAt: any;
}

export function AnnouncementBar() {
  const firestore = useFirestore();
  const announcementRef = firestore ? doc(firestore, 'announcements', 'live') : null;
  const { data: currentAnnouncement, loading } = useDoc<Announcement>(announcementRef);

  if (loading) {
    return (
        <div className="group flex max-w-md cursor-pointer items-center gap-2 transition-colors lg:max-w-xl">
          <Megaphone className="h-4 w-4 flex-shrink-0 text-primary" />
          <p className="truncate text-sm text-muted-foreground group-hover:text-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading...
          </p>
        </div>
    )
  }

  if (!currentAnnouncement || !currentAnnouncement.isActive) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="group flex max-w-md cursor-pointer items-center gap-2 transition-colors lg:max-w-xl">
          <Megaphone className="h-4 w-4 flex-shrink-0 text-primary" />
          <p className="truncate text-sm text-muted-foreground group-hover:text-foreground">
            {currentAnnouncement.title}
          </p>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 border-0 overflow-hidden shadow-xl shadow-primary/20">
        <div className="relative h-full max-h-[80vh] flex flex-col bg-card">
            
            <div className="pixel-grid absolute inset-0 -z-10 opacity-40" />
            <SnakeBorder className="absolute inset-0 z-0" />

            <div className="flex-shrink-0 p-6 pb-2 z-10">
                <DialogHeader className="p-0 text-left">
                <DialogTitle className="font-headline text-2xl">
                    {currentAnnouncement.title}
                </DialogTitle>
                </DialogHeader>
            </div>

            <ScrollArea className="flex-1 min-h-0 z-10">
                <div className="px-6 pb-6">
                <div
                    className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-foreground/90 [&_img]:rounded-md [&_img]:my-4 [&_a]:text-primary [&_a:hover]:underline [&_iframe]:rounded-md [&_iframe]:my-4"
                    dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
                />
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
