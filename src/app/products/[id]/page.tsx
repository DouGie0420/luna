// 服务端组件 - 纯 Server Component
import ClientProductDetail from './ClientProductDetail';

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ]; // 后续可改成从 Firebase 动态获取所有产品 ID
}

export default function Page() {
  return <ClientProductDetail />;
}