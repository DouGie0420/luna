
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Megaphone, Award, Newspaper, SlidersHorizontal, Image as ImageIcon, Video as VideoIcon, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';


export default function AdminPromotionsPage() {
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementContent, setAnnouncementContent] = useState('');
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
    const [mediaUrl, setMediaUrl] = useState('');

    const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
    const [isLoadingAnnouncement, setIsLoadingAnnouncement] = useState(true);

    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (!firestore) return;
        setIsLoadingAnnouncement(true);
        const announcementRef = doc(firestore, 'announcements', 'live');
        getDoc(announcementRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAnnouncementTitle(data.title);
                setAnnouncementContent(data.content);
            }
        }).catch(error => {
            console.error("Failed to fetch announcement:", error);
            toast({
                variant: 'destructive',
                title: '加载通知失败',
                description: '请检查您的网络连接或权限。'
            });
        }).finally(() => {
            setIsLoadingAnnouncement(false);
        });
    }, [firestore, toast]);


    const [carouselCount, setCarouselCount] = useState('10');

    const [fixedMerchants, setFixedMerchants] = useState(Array(6).fill(''));
    const [duration, setDuration] = useState('24');
    const [position, setPosition] = useState(5);
    const [randomize, setRandomize] = useState(false);

    const [mediumPostIds, setMediumPostIds] = useState(Array(10).fill(''));
    const [smallPostIds, setSmallPostIds] = useState(Array(5).fill(''));

    const handleArrayStateChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
        setter(prev => {
            const newArr = [...prev];
            newArr[index] = value;
            return newArr;
        });
    };

    const handlePublishAnnouncement = async () => {
        if (!firestore) return;
        if (!announcementTitle.trim() || !announcementContent.trim()) {
            toast({
                variant: 'destructive',
                title: '内容不能为空',
                description: '请填写标题和内容后发布。'
            });
            return;
        }

        setIsSubmittingAnnouncement(true);
        try {
            const announcementRef = doc(firestore, 'announcements', 'live');
            await setDoc(announcementRef, {
                title: announcementTitle,
                content: announcementContent,
                isActive: true,
                createdAt: serverTimestamp(),
            }, { merge: true });
            toast({
                title: '通知已发布',
                description: '顶部滚动通知已更新。'
            });
        } catch (error) {
            console.error("Failed to publish announcement:", error);
            toast({
                variant: 'destructive',
                title: '发布失败',
                description: '请检查您的网络连接或权限。'
            });
        } finally {
            setIsSubmittingAnnouncement(false);
        }
    };

    const handleInsertMedia = (type: 'image' | 'video') => {
        if (!mediaUrl) return;
        
        let textToInsert = '';
        if (type === 'image') {
            textToInsert = `\n<img src="${mediaUrl}" alt="announcement image" style="margin-top: 1rem; margin-bottom: 1rem; border-radius: 0.5rem;" />\n`;
            setIsImageDialogOpen(false);
        } else if (type === 'video') {
            let videoEmbedUrl = mediaUrl;
            const youtubeMatch = mediaUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (youtubeMatch && youtubeMatch[1]) {
              videoEmbedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
              textToInsert = `\n<iframe width="100%" src="${videoEmbedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="margin-top: 1rem; margin-bottom: 1rem; border-radius: 0.5rem; aspect-ratio: 16 / 9;"></iframe>\n`;
            } else {
                 toast({ variant: 'destructive', title: '无效的YouTube链接' });
                 return;
            }

            setIsVideoDialogOpen(false);
        }
        
        setAnnouncementContent(prev => prev + textToInsert);
        setMediaUrl('');
    };

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">首页广告管理</h2>
            <div className="grid gap-8">
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone /> 顶部官方通知
                        </CardTitle>
                        <CardDescription>
                            管理网站顶部滚动播放的官方通知或活动信息。支持插入图片和视频链接。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="announcement-title">通知标题</Label>
                            <Input 
                                id="announcement-title"
                                placeholder="输入当前的公告标题..." 
                                value={announcementTitle}
                                onChange={(e) => setAnnouncementTitle(e.target.value)}
                                disabled={isLoadingAnnouncement || isSubmittingAnnouncement}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="announcement-content">通知内容</Label>
                            <Textarea 
                                id="announcement-content"
                                placeholder="输入公告的详细内容..."
                                value={announcementContent}
                                onChange={(e) => setAnnouncementContent(e.target.value)}
                                rows={5}
                                disabled={isLoadingAnnouncement || isSubmittingAnnouncement}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm"><ImageIcon className="mr-2 h-4 w-4" /> 插入图片</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>插入图片链接</DialogTitle>
                                    </DialogHeader>
                                    <Input placeholder="https://example.com/image.png" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                                    <DialogFooter>
                                        <Button onClick={() => handleInsertMedia('image')}>确认插入</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                             <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm"><VideoIcon className="mr-2 h-4 w-4" /> 插入视频</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>插入视频链接 (YouTube)</DialogTitle>
                                    </DialogHeader>
                                    <Input placeholder="https://www.youtube.com/watch?v=..." value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                                    <DialogFooter>
                                        <Button onClick={() => handleInsertMedia('video')}>确认插入</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handlePublishAnnouncement} disabled={isLoadingAnnouncement || isSubmittingAnnouncement}>
                                {isSubmittingAnnouncement && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                发布通知
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon /> 首页轮播广告管理
                        </CardTitle>
                        <CardDescription>
                            管理首页顶部的轮播大图广告。最多可配置20个广告位。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            <div className="md:col-span-1 grid gap-2">
                                <Label>选择轮播数量</Label>
                                <Select value={carouselCount} onValueChange={setCarouselCount}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">展示5个</SelectItem>
                                        <SelectItem value="10">展示10个</SelectItem>
                                        <SelectItem value="15">展示15个</SelectItem>
                                        <SelectItem value="20">展示20个</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <ScrollArea className="h-96 pr-4">
                            <Accordion type="multiple" className="w-full">
                                {Array.from({ length: 20 }).map((_, index) => (
                                <AccordionItem value={`item-${index + 1}`} key={index}>
                                    <AccordionTrigger>广告位 {index + 1}</AccordionTrigger>
                                    <AccordionContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`carousel-title-${index}`}>标题</Label>
                                            <Input id={`carousel-title-${index}`} placeholder="例如：未来已来" />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label htmlFor={`carousel-desc-${index}`}>描述</Label>
                                            <Textarea id={`carousel-desc-${index}`} placeholder="例如：探索最新潮的赛博装备" />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label htmlFor={`carousel-img-${index}`}>图片链接</Label>
                                            <Input id={`carousel-img-${index}`} placeholder="https://picsum.photos/..." />
                                        </div>
                                         <div className="grid gap-2">
                                            <Label htmlFor={`carousel-link-${index}`}>跳转链接</Label>
                                            <Input id={`carousel-link-${index}`} placeholder="/promo/..." />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                        <div className="flex justify-end mt-4">
                            <Button>保存轮播设置</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award /> 认证商户展示管理
                        </CardTitle>
                        <CardDescription>
                            控制首页“认证商户”板块的展示逻辑和内容。可设置多个固定商户ID。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center space-x-2">
                            <Switch id="merchant-carousel-toggle" defaultChecked />
                            <Label htmlFor="merchant-carousel-toggle">启用轮播展示</Label>
                        </div>
                        <Separator />
                        <div>
                             <Label className="mb-4 block">指定固定商户 (6个位置)</Label>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {fixedMerchants.map((merchantId, index) => (
                                    <Input
                                        key={index}
                                        placeholder={`商户ID ${index + 1}`}
                                        value={merchantId}
                                        onChange={(e) => handleArrayStateChange(setFixedMerchants, index, e.target.value)}
                                    />
                                ))}
                             </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="duration">推送时长</Label>
                                <Select value={duration} onValueChange={setDuration}>
                                    <SelectTrigger id="duration">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="12">12小时</SelectItem>
                                        <SelectItem value="24">24小时</SelectItem>
                                        <SelectItem value="48">48小时</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="position">前排位置</Label>
                                <Input
                                    id="position"
                                    type="number"
                                    value={position}
                                    onChange={(e) => setPosition(Number(e.target.value))}
                                    placeholder="例如：5"
                                />
                                <p className="text-xs text-muted-foreground">固定在首页该类目前 {position} 位内显示</p>
                            </div>
                            <div className="grid gap-2 pt-6">
                                <div className="flex items-center space-x-2">
                                    <Switch id="random-display" checked={randomize} onCheckedChange={setRandomize} />
                                    <Label htmlFor="random-display">随机展示</Label>
                                </div>
                            </div>
                        </div>
                         <div className="flex justify-end">
                            <Button>保存商户设置</Button>
                         </div>
                    </CardContent>
                </Card>
                
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Newspaper /> 梦境之湖社区内容推荐
                        </CardTitle>
                        <CardDescription>
                            在首页“梦境之湖”板块置顶或推荐社区帖子。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div>
                             <Label>中号推荐位 (10个)</Label>
                             <p className="text-xs text-muted-foreground mb-2">输入帖子ID以在首页左侧区域展示。</p>
                             <div className="grid md:grid-cols-2 gap-4">
                                {mediumPostIds.map((postId, index) => (
                                    <Input 
                                        key={`medium-${index}`}
                                        placeholder={`帖子ID ${index + 1}`}
                                        value={postId}
                                        onChange={(e) => handleArrayStateChange(setMediumPostIds, index, e.target.value)}
                                    />
                                ))}
                             </div>
                        </div>
                        <div>
                            <Label>小型推荐位 (5个)</Label>
                             <p className="text-xs text-muted-foreground mb-2">输入帖子ID以在首页右侧列表展示。</p>
                            <div className="grid grid-cols-1 gap-4">
                                {smallPostIds.map((postId, index) => (
                                     <Input
                                        key={`small-${index}`}
                                        placeholder={`帖子ID ${index + 1}`}
                                        value={postId}
                                        onChange={(e) => handleArrayStateChange(setSmallPostIds, index, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>
                         <div className="flex justify-end">
                            <Button>保存社区推荐</Button>
                         </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
