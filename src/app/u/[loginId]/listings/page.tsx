// src/app/u/[loginId]/listings/page.tsx
import ClientListings from './ClientListings';

// Next.js 15 规范：Params 需要定义为 Promise
type Props = {
  params: Promise<{ loginId: string }>;
};

export async function generateStaticParams() {
  // 预生成 demo 路由，防止 build 时因为找不到 loginId 而报错
  return [
    { loginId: 'demo' },
    { loginId: 'test' },
  ];
}

export default async function Page({ params }: Props) {
  // 这里的 await 是 Next.js 15 的新要求
  const { loginId } = await params;

  return <ClientListings loginId={loginId} />;
}