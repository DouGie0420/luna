'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, ShieldCheck, Loader2, DollarSign, Activity, AlertCircle, TrendingUp, HandCoins } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import Link from "next/link";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
    totalUsers: number;
    pendingKyc: number;
    pendingPaymentRequests: number;
    totalGmv: number;
};

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig


export default function AdminDashboardPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const usersCollection = collection(firestore, 'users');
                const ordersCollection = collection(firestore, 'orders');
                const paymentRequestsCollection = collection(firestore, 'paymentChangeRequests');

                const totalUsersSnapshot = await getDocs(usersCollection);
                const pendingKycQuery = query(usersCollection, where('kycStatus', '==', 'Pending'));
                const pendingKycSnapshot = await getDocs(pendingKycQuery);
                
                const pendingPaymentQuery = query(paymentRequestsCollection, where('status', '==', 'pending'));
                const pendingPaymentSnapshot = await getDocs(pendingPaymentQuery);

                const completedOrdersQuery = query(ordersCollection, where('status', '==', 'Completed'));
                const completedOrdersSnapshot = await getDocs(completedOrdersQuery);
                const totalGmv = completedOrdersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);

                setStats({
                    totalUsers: totalUsersSnapshot.size,
                    pendingKyc: pendingKycSnapshot.size,
                    pendingPaymentRequests: pendingPaymentSnapshot.size,
                    totalGmv,
                });
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();

    }, [firestore]);


    if (loading || !stats) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                     <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium"><Skeleton className="h-4 w-24" /></CardTitle>
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            <div className="text-xs text-muted-foreground"><Skeleton className="h-3 w-40" /></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总成交额 (GMV)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">¥{stats.totalGmv.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">所有已完成订单的总金额</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">手续费总收入 (Coming Soon)</CardTitle>
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-muted-foreground/50">¥ -</div>
                        <p className="text-xs text-muted-foreground">需要更新订单结构以追踪费用</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">总用户数</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                         <div className="text-xs text-muted-foreground">&nbsp;</div>
                    </CardContent>
                </Card>
            </div>
            
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                 <Link href="/admin/kyc-list">
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-red-500/10 border-red-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">待处理KYC申请</CardTitle>
                            <AlertCircle className="h-4 w-4 text-red-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-300">{stats.pendingKyc}</div>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/admin/payment-requests">
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer bg-red-500/10 border-red-500/30">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">待处理收款申请</CardTitle>
                            <AlertCircle className="h-4 w-4 text-red-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-300">{stats.pendingPaymentRequests}</div>
                        </CardContent>
                    </Card>
                </Link>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>近期活动</CardTitle>
                        <CardContent className="pl-0">
                           <p className="text-muted-foreground text-sm py-12 text-center">活动源将在此处显示。</p>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp/> 交易量趋势 (示例)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                         <ChartContainer config={chartConfig} className="h-[200px] w-full">
                            <BarChart accessibilityLayer data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
             </div>
        </div>
    );
}
