'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Megaphone, Award, Newspaper } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// This is a placeholder page.
// In a real application, this would fetch and manage promotion data from Firestore.

export default function AdminPromotionsPage() {

    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">广告管理 (Promotions)</h2>
            <div className="grid gap-8">
                
                {/* Homepage Hero Banner Management */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone /> 首页横幅广告管理
                        </CardTitle>
                        <CardDescription>
                            管理首页顶部的轮播大图广告。您可以发布新的促销活动或修改现有的活动。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            当前的促销活动: <strong>赛博周一 (Cyber Monday)</strong>
                        </p>
                        <Button>修改活动</Button>
                    </CardContent>
                </Card>

                {/* Verified Merchants Showcase */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award /> 认证商户展示管理
                        </CardTitle>
                        <CardDescription>
                            控制首页“认证商户”板块的展示逻辑和内容。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="merchant-carousel-toggle" defaultChecked />
                            <Label htmlFor="merchant-carousel-toggle">启用轮播展示</Label>
                        </div>
                        <Separator />
                        <div>
                             <Label>指定固定商户</Label>
                             <p className="text-xs text-muted-foreground mb-2">输入用户ID以固定展示，用逗号分隔。如果为空，则默认展示最新认证的商户。</p>
                             <div className="flex gap-2">
                                <Textarea placeholder="user-id-1, user-id-2, user-id-3"></Textarea>
                                <Button>保存</Button>
                             </div>
                        </div>
                    </CardContent>
                </Card>
                
                {/* Featured Community Posts */}
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Newspaper /> 梦境之湖社区内容推荐
                        </CardTitle>
                        <CardDescription>
                            在首页“静谧之海”板块置顶或推荐社区帖子。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div>
                             <Label>指定置顶帖子</Label>
                             <p className="text-xs text-muted-foreground mb-2">输入帖子ID以在首页固定展示。目前仅支持一个。</p>
                             <div className="flex gap-2">
                                <Input placeholder="post-id-1" />
                                <Button>保存</Button>
                             </div>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
