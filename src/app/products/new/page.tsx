'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, ShieldAlert } from "lucide-react"
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/back-button';

export default function NewProductPage() {
  const { user, profile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
      if (!loading && !user) {
          router.replace('/login?redirect=/products/new');
      }
  }, [user, loading, router]);
  
  if (loading || !user) {
      return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
        </div>
      );
  }

  if (profile && profile.kycStatus !== 'Verified') {
      return (
           <>
              <div className="sticky top-20 z-30 border-b bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto flex h-16 items-center px-4">
                  <BackButton />
                </div>
              </div>
              <div className="container mx-auto px-4 py-12">
                  <div className="max-w-3xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl font-headline">无法发布商品</CardTitle>
                            <CardDescription>
                                需要完成认证才能发布商品。
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Alert variant="destructive">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>需要KYC认证</AlertTitle>
                                <AlertDescription className="flex flex-col gap-4">
                                    <p>您的账户尚未完成KYC（了解你的客户）认证。为了确保平台交易的安全，您必须先完成认证才能发布商品。</p>
                                    <Button asChild className="mt-4 w-fit">
                                        <Link href="/account/kyc">前往认证</Link>
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                  </div>
              </div>
           </>
      );
  }


  return (
    <>
      <div className="sticky top-20 z-30 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4">
          <BackButton />
        </div>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-headline">List a New Item</CardTitle>
              <CardDescription>
                Fill in the details below to put your item on the market.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input id="name" placeholder="e.g. Vintage Leather Jacket" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe your item in detail..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" type="number" placeholder="100.00" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select defaultValue="THB">
                            <SelectTrigger>
                                <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="THB">THB (Thai Baht)</SelectItem>
                                <SelectItem value="USDT">USDT (Tether)</SelectItem>
                                <SelectItem value="RMB-alipay">Alipay (RMB)</SelectItem>
                                <SelectItem value="RMB-wechat">WeChat Pay (RMB)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="accessories">Accessories</SelectItem>
                            <SelectItem value="home-goods">Home Goods</SelectItem>
                            <SelectItem value="sports-outdoors">Sports & Outdoors</SelectItem>
                            <SelectItem value="fashion">Fashion</SelectItem>
                            <SelectItem value="musical-instruments">Musical Instruments</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Item Images</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Drag & drop files here, or click to browse</p>
                        <Button variant="outline" className="mt-4">Select Files</Button>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" size="lg">List Item</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
