// 服务端组件 - 纯 Server Component
import ClientFollowers from './ClientFollowers';

export function generateStaticParams() {
  return [
    { loginId: 'demo' },
    { loginId: 'test' },
  ]; // 后续可改成从 Firebase 动态获取所有 loginId
}

export default function Page() {
  return <ClientFollowers />;
}