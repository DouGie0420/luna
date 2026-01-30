'use client';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { Separator } from "@/components/ui/separator";

export default function AccountProfilePage() {
    const { user, profile, loading } = useUser();

    if (loading) {
        return (
            <div>
                <h1 className="text-3xl font-headline mb-6"><Skeleton className="h-8 w-48" /></h1>
                <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-1/3" /></CardTitle>
                        <CardDescription><Skeleton className="h-4 w-2/3" /></CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Skeleton className="h-10 w-24" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div>
            <h1 className="text-3xl font-headline mb-6">My Profile</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your personal details and view account status.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="full-name">Full Name</Label>
                            <Input id="full-name" defaultValue={profile?.displayName || user?.displayName || ''} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" defaultValue={profile?.email || user?.email || ''} readOnly className="text-muted-foreground" />
                        </div>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="avatar">Avatar URL</Label>
                        <Input id="avatar" defaultValue={profile?.photoURL || user?.photoURL || ''} />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label>KYC Status</Label>
                            <Badge variant={
                                profile?.kycStatus === "Verified" ? "default" :
                                profile?.kycStatus === "Pending" ? "secondary" :
                                "destructive"
                            }>{profile?.kycStatus || 'N/A'}</Badge>
                        </div>
                        <div className="grid gap-2">
                            <Label>Joined On</Label>
                            <p className="text-sm text-muted-foreground pt-2">
                                {profile?.createdAt?.toDate ? format(profile.createdAt.toDate(), 'PPP') : 'N/A'}
                            </p>
                        </div>
                         <div className="grid gap-2">
                            <Label>Last Login</Label>
                             <p className="text-sm text-muted-foreground pt-2">
                                {profile?.lastLogin?.toDate ? format(profile.lastLogin.toDate(), 'PPP p') : 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button>Save Changes</Button>
                </CardFooter>
            </Card>
        </div>
    )
}
