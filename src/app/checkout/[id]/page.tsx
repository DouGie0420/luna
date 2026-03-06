import ClientCheckout from './ClientCheckout';

// 🚀 核心修复 1：强制声明为完全动态渲染。
// 结算页必须实时获取最新的用户状态和订单信息，绝不能被静态缓存！
export const dynamic = 'force-dynamic';

// 🚀 核心修复 2：适配 Next.js 15 的异步 params 规范
export default async function CheckoutPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 等待路由参数解析完成
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  // 🚀 核心修复 3：将解析出的真实订单 ID 显式传递给客户端结算组件
  return <ClientCheckout id={orderId} />;
}