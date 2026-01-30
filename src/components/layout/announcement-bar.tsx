'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Megaphone } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SnakeBorder } from '../snake-border';

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
            <img src="https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif" alt="Hacker GIF" class="my-4 rounded-md" />
            <p class="text-muted-foreground mt-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor. Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat. Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim. Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue. Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Aliquam nibh.</p>
            <p class="text-muted-foreground mt-4">Donec vitae lectus. Nunc nec dui vitae nisi vehicula tincidunt. Sed id magna in erat placerat egestas. Nam congue, pede vitae dapibus aliquet, elit magna vulputate magna, vel egestas dui odio in sapien. Fusce metus. Nullam eu justo. In et felis. Nulla facilisi. Mauris consectetur, elit nec vulputate fringilla, enim risus pretium quam, ac scelerisque quam justo ac sem. Donec quis est. Sed aliquam, nisl vitae wisi vulputate commodo, odio sem che.</p>
            <p class="text-muted-foreground mt-4">Aenean et est a dui semper facilisis. Pellentesque placerat. Nam scelerisque, libero non luctus aliquam, sapien eros euismod lectus, vel luctus erat nulla eget odio. Pellentesque vel nibh. Proin ac quam. Proin vulputate. Duis mattis. Nunc eu erat. Sed diam. Nulla eget metus. Pellentesque eget tellus. Phasellus et massa. Nullam enim. Suspendisse potenti. Integer interdum. Sed ut quam. In hac habitasse platea dictumst. Nam sed est. Vivamus et elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Quisque ut velit. Praesent vitae lorem. Ut quis wisi. Sed vulputate, lectus eget volutpat tempus, purus justo egestas lorem, nec mollis nulla augue ut leo.</p>
            <a href="#" class="text-primary font-semibold hover:underline">点击这里查看所有折扣商品 &rarr;</a>
        `
    }
];

export function AnnouncementBar() {
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
                    className="space-y-4 text-sm"
                    dangerouslySetInnerHTML={{ __html: currentAnnouncement.content }}
                />
                </div>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
