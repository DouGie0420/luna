// 服务端组件（纯 Server Component）
import ClientPostDetail from './ClientPostDetail';

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ]; // 以后可以改成从 Firebase 动态获取所有帖子ID
}

export default function Page({ params }: { params: { id: string } }) {
  return <ClientPostDetail />;
}