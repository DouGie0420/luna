
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, Timestamp, getDoc, doc } from 'firebase/firestore';
import type { RentalProperty, Booking } from '@/lib/types';
import { DateRange } from 'react-day-picker';
import { differenceInCalendarDays, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Minus, Plus, Users } from 'lucide-react';
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
    const [guests, setGuests] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const bookingsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'bookings'),
            where('propertyId', '==', property.id),
            where('status', 'in', ['confirmed', 'paid', 'pending'])
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
    const totalPrice = numberOfNights * property.pricePerNight;
    
    const handleReserve = async () => {
        if (!date?.from || !date?.to || !user || !profile || !firestore) {
            toast({ variant: 'destructive', title: 'Please select dates and log in to book.' });
            return;
        }

        setIsSubmitting(true);
        const bookingData: Omit<Booking, 'id'> = {
            propertyId: property.id,
            propertyName: property.title,
            tenantId: user.uid,
            tenantEmail: user.email || '',
            tenantName: user.displayName || profile?.displayName || '',
            hostId: property.hostId || property.ownerId,
            checkIn: date.from,
            checkOut: date.to,
            totalPrice,
            nights: numberOfNights,
            guests,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        } as any;

        try {
            await addDoc(collection(firestore, 'bookings'), bookingData);
            toast({ title: 'Booking Request Sent!', description: 'The host will confirm your booking shortly.'});

            // Send email notifications (fire-and-forget, won't block the booking)
            try {
                const hostDoc = await getDoc(doc(firestore, 'users', property.hostId || property.ownerId));
                const hostData = hostDoc.data();
                fetch('/api/email/booking-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'new_booking',
                        hostEmail: hostData?.email || '',
                        hostName: hostData?.displayName || '',
                        tenantEmail: user.email || '',
                        tenantName: user.displayName || profile?.displayName || '',
                        propertyName: property.title,
                        propertyId: property.id,
                        checkIn: format(date.from!, 'yyyy年MM月dd日'),
                        checkOut: format(date.to!, 'yyyy年MM月dd日'),
                        nights: numberOfNights,
                        guests,
                        totalPrice,
                    }),
                }).catch(() => {});
            } catch (_) {}

            setDate(undefined);
            router.push('/account/bookings');
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
                <CardTitle>฿{property.pricePerNight.toLocaleString()} / night</CardTitle>
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
                 {/* Guest count selector */}
                 <div className="mt-4 flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <span className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Guests</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setGuests(g => Math.max(1, g - 1))}
                            className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                            <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-semibold text-sm">{guests}</span>
                        <button
                            onClick={() => setGuests(g => Math.min(property.maxGuests || 10, g + 1))}
                            className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                 </div>

                 {date?.from && (
                    <div className="mt-3 p-4 bg-secondary/50 rounded-lg">
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

