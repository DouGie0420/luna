'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressForm } from '@/components/address-form';

function AddressFormPageSkeleton() {
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
    const { user, loading: userLoading } = useUser();

    const addressId = searchParams.get('id');
    const isEditMode = Boolean(addressId);
    
    const isLoading = userLoading;

    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
            {isLoading || !user ? <AddressFormPageSkeleton /> : (
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
                    <AddressForm userId={user.uid} addressId={addressId} />
                </CardContent>
            </Card>
            )}
        </div>
    )
}
