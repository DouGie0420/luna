import ClientSold from "./ClientSold";

export async function generateStaticParams() {
  return [
    { id: "demo" }, // ← MVP阶段手动填目前真实用户的 id
    { id: "test" },
    // 把所有真实用户 id 都加进来
  ];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserSoldPage({ params }: Props) {
  const { id } = await params;
  return <ClientSold id={id} />;
}
