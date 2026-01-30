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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTranslation } from "@/hooks/use-translation"

const purchases = [
    { 
      id: "ORD004", 
      product: { name: "Ceramic Vase", image: "https://images.unsplash.com/photo-1597589684358-2c2e07e8a3a4?q=80&w=600&auto=format&fit=crop", imageHint: "glitch art" }, 
      seller: { name: "Alex Doe", avatar: "https://images.unsplash.com/photo-1581094119822-2c5950a21345?q=80&w=100&auto=format&fit=crop" },
      amount: "2,500 THB", 
      status: "In Escrow", 
      date: "2023-10-28" 
    },
    { 
      id: "ORD005", 
      product: { name: "Gen-5 Smart Watch", image: "https://images.unsplash.com/photo-1617097429142-d0f735d45c43?q=80&w=600&auto=format&fit=crop", imageHint: "futuristic watch" }, 
      seller: { name: "Charlie Brown", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=100&auto=format&fit=crop" },
      amount: "150 USDT", 
      status: "Shipped", 
      date: "2023-10-27" 
    },
    { 
      id: "ORD002", 
      product: { name: "Handmade Leather Wallet", image: "https://images.unsplash.com/photo-1549492423-400259a5e3c2?q=80&w=600&auto=format&fit=crop", imageHint: "neon abstract" }, 
      seller: { name: "Billie Jean", avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=100&auto=format&fit=crop" },
      amount: "120 RMB", 
      status: "Completed", 
      date: "2023-10-25" 
    },
    { 
      id: "ORD006", 
      product: { name: "Vintage Film Camera", image: "https://images.unsplash.com/photo-1639762681057-408e52192e50?q=80&w=600&auto=format&fit=crop", imageHint: "cyberpunk character" }, 
      seller: { name: "Diana Prince", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop" },
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
            default: return 'secondary';
        }
    }
    return (
        <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={order.seller.avatar} alt={order.seller.name} />
                        <AvatarFallback>{order.seller.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm">{order.seller.name}</span>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
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
                <Button variant="ghost" size="sm">{t('accountPurchases.orderCard.viewDetails')}</Button>
                <Button variant="outline" size="sm">{t('accountPurchases.orderCard.contactSeller')}</Button>
                {order.status === 'Completed' ? (
                     <Button size="sm">{t('accountPurchases.orderCard.leaveReview')}</Button>
                ) : (
                    <Button size="sm">{t('accountPurchases.orderCard.confirmReceipt')}</Button>
                )}
            </CardFooter>
        </Card>
    );
};


export default function MyPurchasesPage() {
    const { t } = useTranslation();
    const renderOrders = (status?: string) => {
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
                    <TabsTrigger value="in-escrow">{t('accountPurchases.tabs.inEscrow')}</TabsTrigger>
                    <TabsTrigger value="shipped">{t('accountPurchases.tabs.shipped')}</TabsTrigger>
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
