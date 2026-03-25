export const dynamic = 'force-dynamic';

import ClientSellerReview from "./ClientSellerReview";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SellerReviewPage({ params }: Props) {
  const { id } = await params;
  return <ClientSellerReview id={id} />;
}
