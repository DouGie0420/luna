'use client'

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslation } from "@/hooks/use-translation"
import type { OrderStatus } from "@/lib/types"

const purchases = [
    { 
      id: "ORD007", 
      product: { name: "Hand-Painted Ceramic Vase", image: "https://picsum.photos/seed/purchase1/600/400", imageHint: "glitch art" }, 
      seller: { name: "Alex Doe", avatar: "https://picsum.photos/seed/user1/100/100" },
      amount: "2,500 THB", 
      status: "In Escrow", // To Ship
      date: "2023-10-29" 
    },
    { 
      id: "ORD004", 
      product: { name: "Suno ai v5国际版充值 | 账号", image: "https://picsum.photos/seed/purchase2/600/400", imageHint: "futuristic watch" }, 
      seller: { name: "南极弹吉他的橘黄海葵", avatar: "https://picsum.photos/seed/user10/100/100" },
      amount: "¥76.00", 
      status: "Shipped", // To Receive
      date: "2023-10-27" 
    },
    { 
      id: "ORD002", 
      product: { name: "Handmade Leather Wallet", image: "https://picsum.photos/seed/purchase3/600/400", imageHint: "neon abstract" }, 
      seller: { name: "Billie Jean", avatar: "https://picsum.photos/seed/user2/100/100" },
      amount: "120 RMB", 
      status: "Completed", 
      date: "2023-10-25" 
    },
    { 
      id: "ORD006", 
      product: { name: "Vintage Film Camera", image: "https://picsum.photos/seed/purchase4/600/400", imageHint: "cyberpunk character" }, 
      seller: { name: "Diana Prince", avatar: "https://picsum.photos/seed/user4/100/100" },
      amount: "6,500 THB", 
      status: "Disputed", 
      date: "2023-10-24" 
    },
]

const OrderCard = ({ order }: { order: typeof purchases[0] }) => {
    const { t } = useTranslation();
    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Completed': return 'default';
            case 'Disputed': return 'destructive';
            case 'Shipped': return 'secondary';
            default: return 'secondary';
        }
    }
    
    const getStatusTranslation = (status: string) => {
        const keyPart = status.replace(/\s+/g, '').charAt(0).toLowerCase() + status.replace(/\s+/g, '').slice(1);
        return t(`accountPurchases.status.${keyPart}`);
    }

    return (
        <Link href={`/account/purchases/${order.id}`}>
        <Card className="overflow-hidden hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={order.seller.avatar} alt={order.seller.name} />
                        <AvatarFallback>{order.seller.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm">{order.seller.name}</span>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)}>{getStatusTranslation(order.status)}</Badge>
            </CardHeader>
            <CardContent className="p-4 bg-secondary/20">
                <div className="flex items-center gap-4">
                    <div className="aspect-square w-24 relative">
                        <Image src={order.product.image} alt={order.product.name} fill className="object-cover" data-ai-hint={order.product.imageHint} />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold leading-tight">{order.product.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">{order.id} | {order.date}</p>
                        <p className="text-lg font-bold text-primary mt-2">{order.amount}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 flex justify-end gap-2">
                <Button variant="outline" size="sm">{t('accountPurchases.orderCard.contactSeller')}</Button>
                {order.status === 'Completed' ? (
                     <Button size="sm">{t('accountPurchases.orderCard.leaveReview')}</Button>
                ) : (
                    <Button size="sm">{t('accountPurchases.orderCard.confirmReceipt')}</Button>
                )}
            </CardFooter>
        </Card>
        </Link>
    );
};


export default function MyPurchasesPage() {
    const { t } = useTranslation();
    const renderOrders = (status?: OrderStatus) => {
        const filteredOrders = status ? purchases.filter(o => o.status === status) : purchases;
        if (filteredOrders.length === 0) {
            return (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">{t('accountPurchases.noOrdersTitle')}</h2>
                    <p className="text-muted-foreground mt-2 mb-6">{t('accountPurchases.noOrdersDescription')}</p>
                </div>
            )
        }
        return (
            <div className="space-y-6">
                {filteredOrders.map(order => <OrderCard key={order.id} order={order} />)}
            </div>
        )
    }

    return (
        <div className="p-6 md:p-8 lg:p-12">
            <h1 className="text-3xl font-headline mb-6">{t('accountPurchases.title')}</h1>
            
            <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-5 mb-6">
                    <TabsTrigger value="all">{t('accountPurchases.tabs.all')}</TabsTrigger>
                    <TabsTrigger value="in-escrow">{t('accountPurchases.tabs.toShip')}</TabsTrigger>
                    <TabsTrigger value="shipped">{t('accountPurchases.tabs.toReceive')}</TabsTrigger>
                    <TabsTrigger value="completed">{t('accountPurchases.tabs.completed')}</TabsTrigger>
                    <TabsTrigger value="disputed">{t('accountPurchases.tabs.disputed')}</TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderOrders()}</TabsContent>
                <TabsContent value="in-escrow">{renderOrders('In Escrow')}</TabsContent>
                <TabsContent value="shipped">{renderOrders('Shipped')}</TabsContent>
                <TabsContent value="completed">{renderOrders('Completed')}</TabsContent>
                <TabsContent value="disputed">{renderOrders('Disputed')}</TabsContent>
            </Tabs>
        </div>
    )
}
