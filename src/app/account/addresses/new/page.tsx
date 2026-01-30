'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
import { useUser, useFirestore, useDoc } from '@/firebase';
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

function AddressFormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent className="grid gap-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="grid gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
                <div className="flex justify-between items-center mt-4">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
    );
}

export default function AddressFormPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { user, loading: userLoading } = useUser();
    const firestore = useFirestore();

    const addressId = searchParams.get('id');
    const isEditMode = Boolean(addressId);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const addressRef = useMemo(() => {
        if (!firestore || !user?.uid || !isEditMode) return null;
        return doc(firestore, 'users', user.uid, 'addresses', addressId!);
    }, [firestore, user?.uid, isEditMode, addressId]);

    const { data: addressData, loading: addressLoading } = useDoc<UserAddress>(addressRef);

    const [formData, setFormData] = useState<Omit<UserAddress, 'id'>>(EMPTY_ADDRESS);
    
    useEffect(() => {
        if (isEditMode && addressData) {
            setFormData(addressData);
        }
    }, [isEditMode, addressData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        setIsSubmitting(true);
        
        // Mock for test user to prevent permission errors
        if (user.uid === 'test-user-uid') {
            setTimeout(() => {
                toast({ 
                    title: isEditMode ? 'Address Updated' : 'Address Saved',
                    description: 'This is a mock action for the test user.'
                });
                router.push('/account/addresses');
            }, 500);
            return;
        }

        if (!firestore) return;

        const dataToSave = { ...formData };
        if ('id' in dataToSave) {
            delete (dataToSave as any).id;
        }

        if (isEditMode) {
            const docRef = doc(firestore, 'users', user.uid, 'addresses', addressId!);
            updateDoc(docRef, dataToSave)
                .then(() => {
                    toast({ title: 'Address Updated' });
                    router.push('/account/addresses');
                })
                .catch((serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: docRef.path,
                        operation: 'update',
                        requestResourceData: dataToSave,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    setIsSubmitting(false);
                });
        } else {
            const collectionRef = collection(firestore, 'users', user.uid, 'addresses');
            addDoc(collectionRef, dataToSave)
                .then(() => {
                    toast({ title: 'Address Saved' });
                    router.push('/account/addresses');
                })
                .catch((serverError) => {
                    const permissionError = new FirestorePermissionError({
                        path: collectionRef.path,
                        operation: 'create',
                        requestResourceData: dataToSave,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    setIsSubmitting(false);
                });
        }
    };
    
    const handleDelete = () => {
        if (!user || !addressId) return;

        setIsSubmitting(true);

        // Mock for test user to prevent permission errors
        if (user.uid === 'test-user-uid') {
            setTimeout(() => {
                toast({ 
                    title: 'Address Deleted',
                    description: 'This is a mock action for the test user.'
                });
                router.push('/account/addresses');
            }, 500);
            return;
        }

        if (!firestore) return;
        
        const docRef = doc(firestore, 'users', user.uid, 'addresses', addressId);
        
        deleteDoc(docRef)
            .then(() => {
                toast({ title: 'Address Deleted' });
                router.push('/account/addresses');
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                setIsSubmitting(false);
                setIsDeleteDialogOpen(false);
            });
    };
    
    const isLoading = userLoading || (isEditMode && addressLoading);

    return (
        <>
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                {isLoading ? <AddressFormSkeleton /> : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-headline">
                            {isEditMode ? "Edit Address" : "Add New Address"}
                        </CardTitle>
                        <CardDescription>
                            {isEditMode ? "Update your address details." : "Enter the details for your new shipping address."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
                )}
            </div>
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
