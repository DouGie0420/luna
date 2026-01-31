'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from '@/lib/user';

export default function KYCPage() {
    const { t } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [idFile, setIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const kycStatus = profile?.kycStatus || "Not Verified";

    const getKycStatusTranslation = (status: 'Not Verified' | 'Pending' | 'Verified') => {
        switch (status) {
            case 'Verified': return t('accountKYC.status.verified');
            case 'Pending': return t('accountKYC.status.pending');
            case 'Not Verified': return t('accountKYC.status.notVerified');
            default: return status;
        }
    }
    
    const handleSubmit = async () => {
        if (!idFile || !selfieFile) {
            toast({
                variant: "destructive",
                title: "Missing Documents",
                description: "Please upload both ID and selfie images.",
            });
            return;
        }

        if (!user || !firestore) {
            toast({
                variant: "destructive",
                title: "Authentication Error",
                description: "Could not identify user. Please try again.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            // In a real app, you would upload files to a storage service here.
            // For this prototype, we'll just update the status and add mock URLs.
            await updateUserProfile(firestore, user.uid, { 
                kycStatus: 'Pending',
                kycIdPhotoUrl: `https://picsum.photos/seed/${user.uid}-id/600/400`,
                kycSelfieUrl: `https://picsum.photos/seed/${user.uid}-selfie/600/400`,
            });
            toast({
                title: "Documents Submitted",
                description: "Your documents are now under review.",
            });
            // The UI will update automatically thanks to the useUser hook.
        } catch (error) {
            console.error("KYC submission error:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "An error occurred. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };


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
                            <input 
                                id="id-upload" 
                                type="file"
                                onChange={(e) => setIdFile(e.target.files ? e.target.files[0] : null)}
                                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"/>
                            <p className="text-xs text-muted-foreground">{t('accountKYC.idUploadDescription')}</p>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="selfie-upload">{t('accountKYC.selfieUploadLabel')}</Label>
                            <input 
                                id="selfie-upload" 
                                type="file" 
                                onChange={(e) => setSelfieFile(e.target.files ? e.target.files[0] : null)}
                                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"/>
                             <p className="text-xs text-muted-foreground">{t('accountKYC.selfieUploadDescription')}</p>
                        </div>
                         <div className="flex justify-end">
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('accountKYC.submitButton')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
