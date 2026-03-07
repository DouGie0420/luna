'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2 } from "lucide-react";
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
    onSave?: () => void; // Callback to close dialog
}

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
            if (addressData) {
                setFormData(addressData);
            }
        } else {
            setFormData(EMPTY_ADDRESS);
        }
    }, [isEditMode, addressData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        if (userId === 'test-user-uid') {
            setTimeout(() => {
                toast({ 
                    title: isEditMode ? 'Address Updated' : 'Address Saved',
                    description: 'This is a mock action for the test user.'
                });
                onSave?.();
                if (!onSave) router.push('/account/addresses');
                setIsSubmitting(false);
            }, 500);
            return;
        }

        if (!firestore) return;

        const dataToSave = { ...formData };
        if ('id' in dataToSave) {
            delete (dataToSave as any).id;
        }

        if (isEditMode) {
            const docRef = doc(firestore, 'users', userId, 'addresses', addressId!);
            updateDoc(docRef, dataToSave)
                .then(() => {
                    toast({ title: 'Address Updated' });
                    onSave?.();
                    if (!onSave) router.push('/account/addresses');
                })
                .catch((serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: docRef.path,
                        operation: 'update',
                        requestResourceData: dataToSave,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                })
                .finally(() => setIsSubmitting(false));
        } else {
            const collectionRef = collection(firestore, 'users', userId, 'addresses');
            addDoc(collectionRef, dataToSave)
                .then(() => {
                    toast({ title: 'Address Saved' });
                    onSave?.();
                    if (!onSave) router.push('/account/addresses');
                })
                .catch((serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: collectionRef.path,
                        operation: 'create',
                        requestResourceData: dataToSave,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                })
                .finally(() => setIsSubmitting(false));
        }
    };
    
    const handleDelete = () => {
        if (!userId || !addressId) return;

        setIsSubmitting(true);

        if (userId === 'test-user-uid') {
            setTimeout(() => {
                toast({ 
                    title: 'Address Deleted',
                    description: 'This is a mock action for the test user.'
                });
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
                toast({ title: 'Address Deleted' });
                onSave?.();
                if (!onSave) router.push('/account/addresses');
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsSubmitting(false);
                setIsDeleteDialogOpen(false);
            });
    };
    
    if (isEditMode && addressLoading) {
        // Simple skeleton for dialogs
        return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    }

    return (
        <>
            <form className="grid gap-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="recipientName">Recipient Name</Label>
                        <Input id="recipientName" name="recipientName" value={formData.recipientName} onChange={handleInputChange} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required />
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input id="addressLine1" name="addressLine1" placeholder="Street address, building, apartment number" value={formData.addressLine1} onChange={handleInputChange} required />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                    <Input id="addressLine2" name="addressLine2" value={formData.addressLine2 || ''} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" name="city" value={formData.city} onChange={handleInputChange} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="province">Province / State</Label>
                        <Input id="province" name="province" value={formData.province} onChange={handleInputChange} required />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="grid gap-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" name="country" value={formData.country} onChange={handleInputChange} required />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="isDefault" checked={formData.isDefault} onCheckedChange={(checked) => setFormData(prev => ({...prev, isDefault: !!checked}))} />
                    <Label htmlFor="isDefault">Set as default address</Label>
                </div>
                <div className="flex justify-between items-center mt-4">
                    <div>
                        {isEditMode && (
                            <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSubmitting}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        )}
                    </div>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Address
                    </Button>
                </div>
            </form>
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this address? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
