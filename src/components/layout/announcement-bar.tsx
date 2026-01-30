'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Megaphone } from 'lucide-react';

const announcements = [
    { 
        id: 1, 
        title: "【公告】系统将于今晚凌晨2点进行升级维护", 
        content: "<p>为了提供更好的服务，LUNA交易平台将于今晚（周三）凌晨2:00至4:00进行系统升级维护。届时网站将暂时无法访问。感谢您的理解与支持。</p>" 
    },
    { 
        id: 2, 
        title: "【活动】赛博周一，全场商品限时折扣！", 
        content: `
            <p class="text-muted-foreground">赛博周一狂欢开启！即日起至下周一，全场电子产品、赛博配件享受高达30%的折扣，快来选购你的下一件装备吧！</p>
            <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop" alt="Cyber Monday" class="my-4 rounded-md" />
            <p class="text-muted-foreground">我们还有炫酷的动态GIF展示！</p>
            <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3oza3U1eGZyZzFpM2s4d3dpa3RpemF3cXY1eXpyZ3NqZzJkN2lqZyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif" alt="Hacker GIF" class="my-4 rounded-md" />
            <p class="text-muted-foreground">查看我们的宣传视频：</p>
            <video controls class="w-full my-4 rounded-md">
                <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <a href="#" class="text-primary font-semibold hover:underline">点击这里查看所有折扣商品 &rarr;</a>
        `
    }
];

export function AnnouncementBar() {
    // We'll show the second announcement to demonstrate rich content.
    const currentAnnouncement = announcements[1];

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
            <DialogContent className="sm:max-w-[600px] flex max-h-[80vh] flex-col">
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{currentAnnouncement.title}</DialogTitle>
                </DialogHeader>
                <div 
                  className="space-y-4 text-sm overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
                />
            </DialogContent>
        </Dialog>
    );
}
