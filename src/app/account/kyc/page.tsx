'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { useUser } from "@/firebase";
import { useTranslation } from "@/hooks/use-translation";

export default function KYCPage() {
    const { t } = useTranslation();
    const { profile } = useUser();
    const kycStatus = profile?.kycStatus || "Not Verified"; // Can be 'Not Verified', 'Pending', 'Verified'

    const getKycStatusTranslation = (status: 'Not Verified' | 'Pending' | 'Verified') => {
        switch (status) {
            case 'Verified': return t('accountKYC.status.verified');
            case 'Pending': return t('accountKYC.status.pending');
            case 'Not Verified': return t('accountKYC.status.notVerified');
            default: return status;
        }
    }

    return (
        <div className="p-6 md:p-8 lg:p-12">
            <h1 className="text-3xl font-headline mb-6">{t('accountKYC.title')}</h1>

            <Card className="mb-8">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>{t('accountKYC.currentStatus')}</CardTitle>
                             <Badge variant={
                                kycStatus === "Verified" ? "default" :
                                kycStatus === "Pending" ? "secondary" :
                                "destructive"
                            }>{getKycStatusTranslation(kycStatus)}</Badge>
                        </div>
                    </div>
                </CardHeader>
                 {kycStatus !== 'Verified' && (
                    <CardContent>
                        <p className="text-muted-foreground">
                            {kycStatus === 'Pending' 
                                ? t('accountKYC.status.pendingDescription')
                                : t('accountKYC.status.notVerifiedDescription')
                            }
                        </p>
                    </CardContent>
                 )}
            </Card>

            {kycStatus === 'Not Verified' && (
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('accountKYC.submitTitle')}</CardTitle>
                        <CardDescription>
                            {t('accountKYC.submitDescription')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="id-upload">{t('accountKYC.idUploadLabel')}</Label>
                            <input id="id-upload" type="file" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"/>
                            <p className="text-xs text-muted-foreground">{t('accountKYC.idUploadDescription')}</p>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="selfie-upload">{t('accountKYC.selfieUploadLabel')}</Label>
                            <input id="selfie-upload" type="file" className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"/>
                             <p className="text-xs text-muted-foreground">{t('accountKYC.selfieUploadDescription')}</p>
                        </div>
                         <div className="flex justify-end">
                            <Button>{t('accountKYC.submitButton')}</Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
