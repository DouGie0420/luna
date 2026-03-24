// 动态渲染 - 从 Firebase 实时读取数据
export const dynamic = 'force-dynamic';

import ClientRentalDetail from './ClientRentalDetail';

export default function Page() {
  return <ClientRentalDetail />;
}