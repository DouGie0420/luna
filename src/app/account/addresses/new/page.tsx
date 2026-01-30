'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeaderWithBackAndClose } from "@/components/page-header-with-back-and-close";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
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
import Link from 'next/link';

// Mock data for demonstration
const mockAddress = {
    id: 'addr1',
    recipientName: 'Alex Doe',
    phone: '+66 81 234 5678',
    country: 'Thailand',
    province: 'Bangkok',
    city: 'Bangkok',
    addressLine1: '123 Cyberpunk Road, Sukhumvit Soi 11',
    addressLine2: '',
    postalCode: '10110',
    isDefault: true,
};

export default function AddressFormPage() {
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const addressId = searchParams.get('id');
    const isEditMode = Boolean(addressId);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // In a real app, you'd fetch the address data if in edit mode
    const [formData, setFormData] = useState(isEditMode ? mockAddress : {
        recipientName: '',
        phone: '',
        country: '',
        province: '',
        city: '',
        addressLine1: '',
        addressLine2: '',
        postalCode: '',
        isDefault: false,
    });
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="container mx-auto px-4 py-12 max-w-2xl">
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
                        <form className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="recipientName">Recipient Name</Label>
                                    <Input id="recipientName" name="recipientName" value={formData.recipientName} onChange={handleInputChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone Number</Label>
                                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
                                </div>
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="addressLine1">Address Line 1</Label>
                                <Input id="addressLine1" name="addressLine1" placeholder="Street address, building, apartment number" value={formData.addressLine1} onChange={handleInputChange} />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                                <Input id="addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleInputChange} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="grid gap-2">
                                    <Label htmlFor="city">City</Label>
                                    <Input id="city" name="city" value={formData.city} onChange={handleInputChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="province">Province / State</Label>
                                    <Input id="province" name="province" value={formData.province} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="grid gap-2">
                                    <Label htmlFor="postalCode">Postal Code</Label>
                                    <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="country">Country</Label>
                                    <Input id="country" name="country" value={formData.country} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="isDefault" checked={formData.isDefault} onCheckedChange={(checked) => setFormData(prev => ({...prev, isDefault: !!checked}))} />
                                <Label htmlFor="isDefault">Set as default address</Label>
                            </div>
                            <div className="flex justify-between items-center mt-4">
                                <div>
                                    {isEditMode && (
                                        <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    )}
                                </div>
                                <Button type="submit" size="lg">Save Address</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
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
                            onClick={() => {
                                // Handle deletion logic here
                                setIsDeleteDialogOpen(false);
                            }}
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
