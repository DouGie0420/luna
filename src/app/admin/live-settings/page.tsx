'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { GlobalAudioPlayerConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Radio as RadioIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LiveStreamSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const configRef = useMemo(() => firestore ? doc(firestore, 'configs', 'global_audio_player') : null, [firestore]);
  const { data: liveConfig, loading } = useDoc<GlobalAudioPlayerConfig>(configRef);

  const [formData, setFormData] = useState({
    videoId: '',
    stationName: '',
    channelId: '',
    isVisible: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (liveConfig) {
      setFormData({
        videoId: liveConfig.content_source?.videoId || '',
        stationName: liveConfig.metadata?.stationName || '',
        channelId: liveConfig.metadata?.channelId || '',
        isVisible: liveConfig.display_logic?.isVisible || false,
      });
    }
  }, [liveConfig]);

  const handleUpdate = async () => {
    if (!configRef) return;
    setIsSubmitting(true);
    try {
      await updateDoc(configRef, {
        'content_source.videoId': formData.videoId,
        'metadata.stationName': formData.stationName,
        'metadata.channelId': formData.channelId,
        'display_logic.isVisible': formData.isVisible,
      });
      toast({
        title: '直播配置已更新',
        description: '更改已实时同步给所有用户！',
      });
    } catch (error) {
      console.error("Failed to update config:", error);
      toast({
        title: '更新失败',
        description: '请检查您的权限或网络连接。',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">直播源管理</h2>
            <Card>
                <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                    <div className="flex justify-end"><Skeleton className="h-10 w-28" /></div>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <h2 className="text-3xl font-headline">直播源管理</h2>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><RadioIcon className="text-primary"/>全局播放器设置</CardTitle>
                <CardDescription>
                    修改此处的设置会实时影响网站所有用户看到的右下角浮动播放器。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <Label htmlFor="isVisibleSwitch" className="text-base">全站播放器</Label>
                        <p className="text-sm text-muted-foreground">控制播放器是否对所有用户可见。</p>
                    </div>
                    <Switch
                        id="isVisibleSwitch"
                        checked={formData.isVisible}
                        onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                        disabled={isSubmitting}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="videoId">YouTube Video ID</Label>
                    <Input 
                        id="videoId"
                        placeholder="例如: jfKfPfyJRdk"
                        value={formData.videoId}
                        onChange={(e) => setFormData({ ...formData, videoId: e.target.value })}
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground">从 YouTube 直播链接中复制 v= 后面的代码。</p>
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="stationName">直播间名称</Label>
                    <Input 
                        id="stationName"
                        placeholder="例如: Luna Labs Radio"
                        value={formData.stationName}
                        onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                        disabled={isSubmitting}
                    />
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="channelId">YouTube Channel ID</Label>
                    <Input 
                        id="channelId"
                        placeholder="例如: UC..."
                        value={formData.channelId}
                        onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                        disabled={isSubmitting}
                    />
                     <p className="text-xs text-muted-foreground">用于未来可能的 API 自动关联。</p>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleUpdate} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        立即应用更改
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
