'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, UploadCloud, X } from "lucide-react";
import { useUser, useFirestore } from "@/firebase";
import { useTranslation } from "@/hooks/use-translation";
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from '@/lib/user';
import Image from 'next/image';

const FileUploader = ({ preview, onFileChange, onRemove, id, title, description, disabled }: {
    preview: string | null;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    id: string;
    title: string;
    description: string;
    disabled: boolean;
}) => {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id} className="font-semibold">{title}</Label>
            {preview ? (
                <div className="relative aspect-video w-full max-w-sm">
                    <Image src={preview} alt="Preview" fill className="object-contain rounded-md border bg-muted/20" />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                        onClick={onRemove}
                        disabled={disabled}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <label htmlFor={id} className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">点击上传</span> 或拖拽文件到此</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <input id={id} type="file" className="sr-only" onChange={onFileChange} accept="image/*" disabled={disabled} />
                </label>
            )}
        </div>
    );
};


export default function KYCPage() {
    const { t } = useTranslation();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [idFile, setIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string | null>(null);
    const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
        const file = e.target.files ? e.target.files[0] : null;
        
        if (type === 'id') {
            setIdFile(file);
        } else {
            setSelfieFile(file);
        }

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (type === 'id') {
                    setIdPreview(result);
                } else {
                    setSelfiePreview(result);
                }
            };
            reader.readAsDataURL(file);
        } else {
             if (type === 'id') {
                setIdPreview(null);
            } else {
                setSelfiePreview(null);
            }
        }
    };
    
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
                    <CardContent className="grid gap-8">
                        <FileUploader
                            id="id-upload"
                            preview={idPreview}
                            onFileChange={(e) => handleFileChange(e, 'id')}
                            onRemove={() => { setIdFile(null); setIdPreview(null); }}
                            title={t('accountKYC.idUploadLabel')}
                            description={t('accountKYC.idUploadDescription')}
                            disabled={isSubmitting}
                        />
                        <FileUploader
                            id="selfie-upload"
                            preview={selfiePreview}
                            onFileChange={(e) => handleFileChange(e, 'selfie')}
                            onRemove={() => { setSelfieFile(null); setSelfiePreview(null); }}
                            title={t('accountKYC.selfieUploadLabel')}
                            description={t('accountKYC.selfieUploadDescription')}
                            disabled={isSubmitting}
                        />
                         <div className="flex justify-end mt-4">
                            <Button onClick={handleSubmit} disabled={isSubmitting || !idFile || !selfieFile}>
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
