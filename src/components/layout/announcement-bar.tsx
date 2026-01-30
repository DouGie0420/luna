'use client'

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Megaphone } from 'lucide-react';

const announcements = [
    { id: 1, title: "【公告】系统将于今晚凌晨2点进行升级维护", content: "为了提供更好的服务，LUNA交易平台将于今晚（周三）凌晨2:00至4:00进行系统升级维护。届时网站将暂时无法访问。感谢您的理解与支持。" },
    { id: 2, title: "【活动】赛博周一，全场商品限时折扣！", content: "赛博周一狂欢开启！即日起至下周一，全场电子产品、赛博配件享受高达30%的折扣，快来选购你的下一件装备吧！" }
];

export function AnnouncementBar() {
    // For this demo, we'll just show the first announcement.
    // A real implementation might cycle through them or fetch from a server.
    const currentAnnouncement = announcements[0];

    if (!currentAnnouncement) {
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
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{currentAnnouncement.title}</DialogTitle>
                </DialogHeader>
                <div className="mt-4 leading-relaxed text-muted-foreground">
                    <p>{currentAnnouncement.content}</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
