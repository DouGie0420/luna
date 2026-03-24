import ClientBookingDetail from './ClientBookingDetail';

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  return <ClientBookingDetail id={params.id} />;
}
