import ClientPurchaseDetail from "./ClientPurchaseDetail";

export async function generateStaticParams() {
  return [
    { id: "demo" }, // ← MVP阶段手动填目前真实订单的 id
    { id: "test" },
    // 把所有真实订单 id 都加进来
  ];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: Props) {
  const { id } = await params;
  return <ClientPurchaseDetail id={id} />;
}
