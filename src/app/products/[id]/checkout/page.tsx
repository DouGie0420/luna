// 服务端组件 - 纯 Server Component
import { Suspense } from 'react';
import ClientCheckout from './ClientCheckout';

export function generateStaticParams() {
  return [
    { id: '1' },
    { id: '2' },
    { id: '3' },
  ];
}

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <ClientCheckout />
    </Suspense>
  );
}