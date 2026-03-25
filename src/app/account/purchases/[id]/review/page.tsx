export const dynamic = 'force-dynamic';

import ClientReview from "./ClientReview";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  return <ClientReview id={id} />;
}
