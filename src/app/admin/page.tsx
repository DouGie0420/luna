'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, ShieldCheck, Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import Link from "next/link";

export default function AdminDashboardPage() {
    const firestore = useFirestore();
    const { t } = useTranslation();
    const [stats, setStats] = useState({ totalUsers: 0, pendingKyc: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchStats = async () => {
            setLoading(true);
            const usersCollection = collection(firestore, 'users');
            
            const totalUsersSnapshot = await getDocs(usersCollection);
            const totalUsers = totalUsersSnapshot.size;

            const pendingKycQuery = query(usersCollection, where('kycStatus', '==', 'Pending'));
            const pendingKycSnapshot = await getDocs(pendingKycQuery);
            const pendingKyc = pendingKycSnapshot.size;
            
            setStats({ totalUsers, pendingKyc });
            setLoading(false);
        }

        fetchStats();

    }, [firestore]);


    if (loading) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboardPage.totalUsers')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboardPage.pendingKyc')}</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <div className="grid gap-6 md:grid-cols-2">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.dashboardPage.totalUsers')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    </CardContent>
                </Card>
                <Link href="/admin/kyc-list">
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('admin.dashboardPage.pendingKyc')}</CardTitle>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pendingKyc}</div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
             <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.dashboardPage.recentActivity')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{t('admin.dashboardPage.activityFeedPlaceholder')}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
