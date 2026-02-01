'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Megaphone, Award, Newspaper, Tv, SlidersHorizontal, Image as ImageIcon } from "lucide-react";
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
} from "@/components/ui/accordion"
import { ScrollArea } from '@/components/ui/scroll-area';

// This is a placeholder page.
// In a real application, this would fetch and manage promotion data from Firestore.

export default function AdminPromotionsPage() {
    const [fixedMerchants, setFixedMerchants] = useState(Array(5).fill(''));
    const [duration, setDuration] = useState('24');
    const [position, setPosition] = useState(5);
    const [randomize, setRandomize] = useState(false);
    const [carouselCount, setCarouselCount] = useState('10');

    const handleFixedMerchantChange = (index: number, value: string) => {
        const newMerchants = [...fixedMerchants];
        newMerchants[index] = value;
        setFixedMerchants(newMerchants);
    };

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">广告管理 (Promotions)</h2>
            <div className="grid gap-8">
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone /> 顶部官方通知
                        </CardTitle>
                        <CardDescription>
                            管理网站顶部滚动播放的官方通知或活动信息。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea placeholder="输入当前的公告内容... 例如：【活动】赛博周一, 全场商品限时折扣！" />
                        <div className="flex justify-end">
                            <Button>发布通知</Button>
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
                                            <Input id={`carousel-desc-${index}`} placeholder="例如：探索最新潮的赛博装备" />
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
                            控制首页“认证商户”板块的展示逻辑和内容。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center space-x-2">
                            <Switch id="merchant-carousel-toggle" defaultChecked />
                            <Label htmlFor="merchant-carousel-toggle">启用轮播展示</Label>
                        </div>
                        <Separator />
                        <div>
                             <Label className="mb-4 block">指定固定商户 (最多5个)</Label>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {fixedMerchants.map((merchantId, index) => (
                                    <Input
                                        key={index}
                                        placeholder={`商户ID ${index + 1}`}
                                        value={merchantId}
                                        onChange={(e) => handleFixedMerchantChange(index, e.target.value)}
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
                             <Label>中号推荐位 (2个)</Label>
                             <p className="text-xs text-muted-foreground mb-2">输入帖子ID以在首页左侧区域展示。</p>
                             <div className="grid md:grid-cols-2 gap-4">
                                <Input placeholder="帖子ID 1" />
                                <Input placeholder="帖子ID 2" />
                             </div>
                        </div>
                        <div>
                            <Label>小型推荐位 (5个)</Label>
                             <p className="text-xs text-muted-foreground mb-2">输入帖子ID，用逗号分隔，以在首页右侧列表展示。</p>
                             <Textarea placeholder="post-id-1, post-id-2, post-id-3, post-id-4, post-id-5"></Textarea>
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
