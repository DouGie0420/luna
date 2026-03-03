// 服务端组件
import ClientEditPostDetail from './ClientEditPostDetail';

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
}

export default function Page() {
  return <ClientEditPostDetail />;
}