
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
import { uploadToR2 } from '@/lib/upload';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

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
            <Label htmlFor={id} className="text-sm font-semibold text-white/70">{title}</Label>
            {preview ? (
                <div className="relative aspect-video w-full max-w-sm">
                    <Image src={preview} alt="Preview" fill className="object-contain rounded-xl border border-white/10 bg-white/[0.03]" />
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
                <label htmlFor={id} className="relative flex flex-col items-center justify-center w-full h-40 border border-dashed border-white/15 rounded-xl cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all">
                    <div className="flex flex-col items-center justify-center text-center px-4">
                        <UploadCloud className="w-8 h-8 mb-2 text-white/25" />
                        <p className="mb-1 text-sm text-white/40"><span className="font-semibold text-white/60">点击上传</span> 或拖拽文件到此</p>
                        <p className="text-xs text-white/25">{description}</p>
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'selfie') => {
        const file = e.target.files?.[0];
        if (!file) {
            if (type === 'id') { setIdFile(null); setIdPreview(null); }
            else { setSelfieFile(null); setSelfiePreview(null); }
            return;
        }
        setIsSubmitting(true);
        try {
            const url = await uploadToR2(file, 'kyc');
            if (type === 'id') { setIdFile(file); setIdPreview(url); }
            else { setSelfieFile(file); setSelfiePreview(url); }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Image Error', description: error.message || 'Failed to upload image.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmit = async () => {
        if (!idFile || !selfieFile || !idPreview || !selfiePreview) {
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
            await updateUserProfile(firestore, user.uid, { 
                kycStatus: 'Pending',
                kycIdPhotoUrl: idPreview,
                kycSelfieUrl: selfiePreview,
            });
            toast({
                title: "Documents Submitted",
                description: "Your documents are now under review.",
            });
        } catch (error: any) {
            console.error("KYC submission error:", error);
            let description = "An error occurred while submitting your documents. Please try again.";
            if (error.code === 'invalid-argument') {
                description = "The uploaded image files are too large, even after compression. Please use smaller files and try again.";
            }
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: description,
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    const statusColor = kycStatus === 'Verified' ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/25' :
        kycStatus === 'Pending' ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25' :
        'text-red-400 bg-red-500/15 border-red-500/25';

    return (
        <div className="relative py-8 px-4 sm:px-6 max-w-3xl mx-auto space-y-5">
            {/* Background */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-yellow-600/4 rounded-full blur-[100px]" />
            </div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.12)]">
                    <ShieldCheck className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent font-headline">{t('accountKYC.title')}</h1>
                    <p className="text-sm text-muted-foreground/70">Identity Verification</p>
                </div>
            </motion.div>

            {/* Status card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden"
            >
                <div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
                <div className="p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider mb-1.5">{t('accountKYC.currentStatus')}</p>
                        <Badge className={`text-xs border ${statusColor}`}>{getKycStatusTranslation(kycStatus)}</Badge>
                    </div>
                    <ShieldCheck className={`h-8 w-8 ${kycStatus === 'Verified' ? 'text-emerald-400' : kycStatus === 'Pending' ? 'text-yellow-400' : 'text-white/20'}`} />
                </div>
                {kycStatus !== 'Verified' && (
                    <div className="px-5 pb-5">
                        <p className="text-sm text-white/40">
                            {kycStatus === 'Pending'
                                ? t('accountKYC.status.pendingDescription')
                                : t('accountKYC.status.notVerifiedDescription')
                            }
                        </p>
                    </div>
                )}
            </motion.div>

            {kycStatus === 'Not Verified' && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden"
                >
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                    <div className="p-5">
                        <h2 className="font-semibold text-sm text-white/80 mb-1">{t('accountKYC.submitTitle')}</h2>
                        <p className="text-xs text-white/35 mb-5">{t('accountKYC.submitDescription')}</p>
                        <div className="grid gap-6">
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
                            <div className="flex justify-end">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !idFile || !selfieFile}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 border-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('accountKYC.submitButton')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
