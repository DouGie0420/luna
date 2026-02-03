'use client';

import { useUser } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminOrdersPage() {
    const { t } = useTranslation();
    const { profile, loading: userLoading } = useUser();

    if (userLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const hasAccess = !!(profile && ['admin', 'ghost', 'staff', 'support'].includes(profile.role || ''));

    if (!hasAccess) {
        return (
             <div>
                <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>{t('admin.layout.accessDenied')}</AlertTitle>
                    <AlertDescription>
                        您的角色没有权限查看所有订单。
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div>
            <h2 className="text-3xl font-headline mb-6">{t('admin.ordersPage.title')}</h2>
            <Card>
                <CardHeader>
                    <CardTitle className="text-lime-400">System Restoration in Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-semibold text-foreground">Rebuilding Orders Page...</p>
                        <p className="mt-2">Thank you for your patience. The page is being restored.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
