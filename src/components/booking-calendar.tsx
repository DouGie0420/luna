
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';
import type { RentalProperty, Booking } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BookingCalendarProps {
    property: RentalProperty;
}

export function BookingCalendar({ property }: BookingCalendarProps) {
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const bookingsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'rentalProperties', property.id, 'bookings'),
            where('status', '==', 'confirmed')
        );
    }, [firestore, property.id]);

    const { data: bookings, loading: bookingsLoading } = useCollection<Booking>(bookingsQuery);

    const disabledDays = useMemo(() => {
        if (!bookings) return [{ before: new Date() }];

        const bookedRanges = bookings.map(booking => ({
            from: (booking.checkIn as Timestamp).toDate(),
            to: (booking.checkOut as Timestamp).toDate()
        }));

        return [{ before: new Date() }, ...bookedRanges];
    }, [bookings]);

    const numberOfNights = date?.from && date?.to ? differenceInCalendarDays(date.to, date.from) : 0;
    const totalPrice = numberOfNights * property.pricePerDay;
    
    const handleReserve = async () => {
        if (!date?.from || !date?.to || !user || !profile || !firestore) {
            toast({ variant: 'destructive', title: 'Please select dates and log in to book.' });
            return;
        }

        setIsSubmitting(true);
        const bookingData: Omit<Booking, 'id'> = {
            propertyId: property.id,
            userId: user.uid,
            ownerId: property.ownerId,
            checkIn: date.from,
            checkOut: date.to,
            totalPrice,
            guests: 2, // Hardcoded for now
            status: 'pending',
            createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(firestore, 'rentalProperties', property.id, 'bookings'), bookingData);
            toast({ title: 'Booking Request Sent!', description: 'The host will confirm your booking shortly.'});
            setDate(undefined);
            // Optionally redirect to a "my bookings" page
            // router.push('/account/bookings');
        } catch (error) {
            console.error("Failed to create booking:", error);
            toast({ variant: 'destructive', title: 'Booking Failed', description: 'Please try again.'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card className="sticky top-24">
            <CardHeader>
                <CardTitle>฿{property.pricePerDay.toLocaleString()} / night</CardTitle>
            </CardHeader>
            <CardContent>
                 <Calendar
                    mode="range"
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={1}
                    disabled={disabledDays}
                    className="p-0"
                 />
                 {date?.from && (
                    <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                        <div className="flex justify-between text-sm">
                            <p>Check-in</p>
                            <p className="font-semibold">{format(date.from, 'PPP')}</p>
                        </div>
                         {date.to && (
                            <div className="flex justify-between text-sm mt-2">
                                <p>Check-out</p>
                                <p className="font-semibold">{format(date.to, 'PPP')}</p>
                            </div>
                        )}
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4">
                {numberOfNights > 0 && (
                    <div className="flex justify-between font-semibold">
                        <span>Total ({numberOfNights} nights)</span>
                        <span>฿{totalPrice.toLocaleString()}</span>
                    </div>
                )}
                 <Button size="lg" className="w-full h-12 text-lg" disabled={!date?.from || !date?.to || isSubmitting} onClick={handleReserve}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}
                    Reserve
                 </Button>
            </CardFooter>
        </Card>
    );
}

