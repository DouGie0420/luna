import ClientSold from './ClientSold';

export async function generateStaticParams() {
  // 🔥 MVP阶段：手动添加你目前所有真实用户的 loginId（以后可改成自动拉取）
  // 只要在这里加一个，build 时就会生成对应的静态页面
  return [
    { loginId: 'demo' },        // ← 改成你的测试用户
    { loginId: 'test' },        // ← 改成你的测试用户
    // { loginId: '你的loginId1' },
    // { loginId: '你的loginId2' },
    // 把所有已存在的用户都加上，build 就会 100% 通过
  ];
}

interface Props {
  params: Promise<{ loginId: string }>;
}

export default async function UserSoldPage({ params }: Props) {
  const { loginId } = await params;
  return <ClientSold loginId={loginId} />;
}