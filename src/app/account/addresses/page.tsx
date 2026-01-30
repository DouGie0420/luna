'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";
import { PlusCircle, MoreVertical, Edit, Trash2 } from "lucide-react";
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { UserAddress } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from '@/hooks/use-toast';

function AddressCard({ address, onDeleteClick }: { address: UserAddress; onDeleteClick: (addressId: string) => void; }) {
    return (
        <div className="p-4 border rounded-lg flex justify-between items-start">
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <p className="font-semibold">{address.recipientName}</p>
                    <p className="text-muted-foreground">{address.phone}</p>
                    {address.isDefault && <Badge>Default</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                    {address.addressLine1}, {address.addressLine2 ? `${address.addressLine2}, ` : ''}{address.city}, {address.province}, {address.postalCode}, {address.country}
                </p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/account/addresses/new?id=${address.id}`}>
                            <Edit className="mr-2 h-4 w-4"/>
                            <span>Edit</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                        onSelect={() => onDeleteClick(address.id)}
                    >
                        <Trash2 className="mr-2 h-4 w-4"/>
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function AddressesPageSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                </div>
            ))}
        </div>
    );
}

export default function AddressesPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const addressesCollectionQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'addresses');
  }, [firestore, user]);

  const { data: addresses, loading: addressesLoading } = useCollection<UserAddress>(addressesCollectionQuery);

  const handleDelete = async () => {
    if (!firestore || !user || !addressToDelete) return;
    try {
        const addressRef = doc(firestore, 'users', user.uid, 'addresses', addressToDelete);
        await deleteDoc(addressRef);
        toast({ title: 'Address Deleted' });
        setAddressToDelete(null);
    } catch (error) {
        console.error('Error deleting address:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete address.' });
    }
  };

  const isLoading = userLoading || addressesLoading;

  return (
    <>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-headline">{t('accountAddresses.title')}</h1>
            <Button asChild>
                <Link href="/account/addresses/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('accountAddresses.addNewAddress')}
                </Link>
            </Button>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>{t('accountAddresses.savedAddresses')}</CardTitle>
                <CardDescription>{t('accountAddresses.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <AddressesPageSkeleton />
                ) : addresses && addresses.length > 0 ? (
                    <div className="space-y-4">
                        {addresses.map(address => (
                            <AddressCard key={address.id} address={address} onDeleteClick={setAddressToDelete} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <h3 className="text-lg font-semibold">{t('accountAddresses.noAddresses')}</h3>
                        <p className="text-muted-foreground mt-2">{t('accountAddresses.noAddressesDescription')}</p>
                         <Button asChild variant="outline" className="mt-4">
                            <Link href="/account/addresses/new">
                                {t('accountAddresses.addFirstAddress')}
                            </Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
      <AlertDialog open={!!addressToDelete} onOpenChange={(open) => !open && setAddressToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to delete this address? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAddressToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
