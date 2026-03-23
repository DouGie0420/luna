'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, Save, User, Phone, MapPin, Building2, Globe, Hash, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFirestore, useDoc } from '@/firebase';
import type { UserAddress } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const EMPTY_ADDRESS: Omit<UserAddress, 'id'> = {
    recipientName: '',
    phone: '',
    country: '',
    province: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    postalCode: '',
    isDefault: false,
};

interface AddressFormProps {
    userId: string;
    addressId?: string | null;
    onSave?: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-white/65 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full h-11 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/60 focus:bg-white/[0.09] transition-all";

export function AddressForm({ userId, addressId, onSave }: AddressFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const isEditMode = Boolean(addressId);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const addressRef = useMemo(() => {
        if (!firestore || !userId || !isEditMode) return null;
        return doc(firestore, 'users', userId, 'addresses', addressId!);
    }, [firestore, userId, isEditMode, addressId]);

    const { data: addressData, loading: addressLoading } = useDoc<UserAddress>(addressRef);

    const [formData, setFormData] = useState<Omit<UserAddress, 'id'>>(EMPTY_ADDRESS);

    useEffect(() => {
        if (isEditMode) {
            if (addressData) setFormData(addressData);
        } else {
            setFormData(EMPTY_ADDRESS);
        }
    }, [isEditMode, addressData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (userId === 'test-user-uid') {
            setTimeout(() => {
                toast({ title: isEditMode ? '地址已更新' : '地址已保存' });
                onSave?.();
                if (!onSave) router.push('/account/addresses');
                setIsSubmitting(false);
            }, 500);
            return;
        }

        if (!firestore) return;

        const dataToSave = { ...formData };
        if ('id' in dataToSave) delete (dataToSave as any).id;

        if (isEditMode) {
            const docRef = doc(firestore, 'users', userId, 'addresses', addressId!);
            updateDoc(docRef, dataToSave)
                .then(() => {
                    toast({ title: '地址已更新' });
                    onSave?.();
                    if (!onSave) router.push('/account/addresses');
                })
                .catch(() => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: docRef.path, operation: 'update', requestResourceData: dataToSave,
                    }));
                })
                .finally(() => setIsSubmitting(false));
        } else {
            const collectionRef = collection(firestore, 'users', userId, 'addresses');
            addDoc(collectionRef, dataToSave)
                .then(() => {
                    toast({ title: '地址已保存' });
                    onSave?.();
                    if (!onSave) router.push('/account/addresses');
                })
                .catch(() => {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: collectionRef.path, operation: 'create', requestResourceData: dataToSave,
                    }));
                })
                .finally(() => setIsSubmitting(false));
        }
    };

    const handleDelete = () => {
        if (!userId || !addressId) return;
        setIsSubmitting(true);

        if (userId === 'test-user-uid') {
            setTimeout(() => {
                toast({ title: '地址已删除' });
                onSave?.();
                if (!onSave) router.push('/account/addresses');
                setIsSubmitting(false);
                setIsDeleteDialogOpen(false);
            }, 500);
            return;
        }

        if (!firestore) return;
        const docRef = doc(firestore, 'users', userId, 'addresses', addressId);
        deleteDoc(docRef)
            .then(() => {
                toast({ title: '地址已删除' });
                onSave?.();
                if (!onSave) router.push('/account/addresses');
            })
            .catch(() => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: docRef.path, operation: 'delete',
                }));
            })
            .finally(() => {
                setIsSubmitting(false);
                setIsDeleteDialogOpen(false);
            });
    };

    if (isEditMode && addressLoading) {
        return (
            <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded-xl bg-white/[0.03]" />
                ))}
            </div>
        );
    }

    return (
        <>
            <form className="space-y-4 max-w-2xl mx-auto" onSubmit={handleSubmit}>

                {/* Section 1 — 收件人信息 */}
                <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/20">
                                <User className="w-3.5 h-3.5 text-purple-400" />
                            </div>
                            <span className="text-sm font-black text-white">收件人信息</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="收件人姓名">
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                                    <input
                                        className={inputCls + " pl-9"}
                                        id="recipientName" name="recipientName"
                                        placeholder="请输入姓名"
                                        value={formData.recipientName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </Field>
                            <Field label="手机号码">
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                                    <input
                                        className={inputCls + " pl-9"}
                                        id="phone" name="phone" type="tel"
                                        placeholder="请输入手机号"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* Section 2 — 地址详情 */}
                <div className="relative bg-card/40 backdrop-blur-sm rounded-2xl border border-white/8 overflow-hidden">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
                    <div className="p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/20">
                                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="text-sm font-black text-white">地址详情</span>
                        </div>

                        <Field label="详细地址">
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                                <input
                                    className={inputCls + " pl-9"}
                                    id="addressLine1" name="addressLine1"
                                    placeholder="街道地址、楼栋、门牌号"
                                    value={formData.addressLine1}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </Field>
                        <Field label="补充地址（选填）">
                            <input
                                className={inputCls}
                                id="addressLine2" name="addressLine2"
                                placeholder="公寓、单元、楼层等（选填）"
                                value={formData.addressLine2 || ''}
                                onChange={handleInputChange}
                            />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="城市">
                                <input
                                    className={inputCls}
                                    id="city" name="city"
                                    placeholder="城市"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Field>
                            <Field label="省 / 州">
                                <input
                                    className={inputCls}
                                    id="province" name="province"
                                    placeholder="省份或州"
                                    value={formData.province}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="邮政编码">
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                                    <input
                                        className={inputCls + " pl-9"}
                                        id="postalCode" name="postalCode"
                                        placeholder="邮编"
                                        value={formData.postalCode}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </Field>
                            <Field label="国家">
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                                    <input
                                        className={inputCls + " pl-9"}
                                        id="country" name="country"
                                        placeholder="国家"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </Field>
                        </div>
                    </div>
                </div>

                {/* Default toggle */}
                <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl border transition-all duration-200 ${
                        formData.isDefault
                            ? 'border-purple-500/40 bg-purple-500/12 shadow-[0_0_16px_rgba(168,85,247,0.1)]'
                            : 'border-white/8 bg-white/[0.02] hover:border-purple-500/20 hover:bg-purple-500/5'
                    }`}
                >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        formData.isDefault
                            ? 'border-purple-400 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                            : 'border-white/20'
                    }`}>
                        {formData.isDefault && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <Star className={`w-4 h-4 shrink-0 transition-colors ${formData.isDefault ? 'text-purple-300' : 'text-white/20'}`} />
                    <span className={`text-sm font-bold transition-colors ${
                        formData.isDefault ? 'text-purple-200' : 'text-white/40'
                    }`}>
                        设为默认地址
                    </span>
                    {formData.isDefault && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/25">默认</span>
                    )}
                </button>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                        {isEditMode && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                disabled={isSubmitting}
                                className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400/70 hover:text-red-300 hover:border-red-500/40 transition-all text-sm font-semibold disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />删除地址
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 h-10 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-all shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                    >
                        {isSubmitting
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Save className="w-4 h-4" />
                        }
                        保存地址
                    </button>
                </div>
            </form>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-[#0d0715]/95 border border-white/10 backdrop-blur-3xl rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">确认删除地址？</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/45">
                            此操作不可撤销，地址将被永久删除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white/70">取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="bg-red-500 hover:bg-red-600 border-0"
                        >
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
