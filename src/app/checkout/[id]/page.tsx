// 服务端组件（纯 Server Component）
import ClientCheckout from './ClientCheckout';

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ]; // 后续可改成从 Firebase 动态获取真实订单ID
}

export default function Page({ params }: { params: { id: string } }) {
  return <ClientCheckout />;
}