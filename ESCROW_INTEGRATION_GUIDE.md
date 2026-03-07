# LunaEscrow 前端集成指南

## ✅ 已完成的工作

### 1. 智能合约配置
- **合约地址**: `0x5CcD28825df05AEAf6F55b62c9a35695B070740F`
- **网络**: Base Sepolia (链 ID: 84532)
- **支付代币**: ETH (原生代币)
- **汇率**: 1 USDT (显示) = 0.001 ETH (支付)

### 2. 核心 Hooks 已创建

#### `useLunaEscrow.ts`
核心合约交互 hook，包含：
- `createOrder()` - 创建订单（支付 ETH）
- `confirmReceipt()` - 买家确认收货
- `raiseDispute()` - 发起争议
- `markAsShipped()` - 卖家标记发货
- `sellerRequestRelease()` - 卖家请求释放（20天后）
- `resolveDispute()` - 仲裁解决争议（仅 admin/support）
- `getOrder()` - 查询订单详情

#### `useEthPaymentAdapter.ts`
支付适配器 hook，包含：
- `usdtToEth()` - USDT 金额转 ETH
- `ethToUsdt()` - ETH 金额转 USDT
- `getPaymentInfo()` - 获取支付显示信息
- `createOrderWithConversion()` - 自动转换并创建订单

### 3. 支付按钮组件

#### `EscrowPaymentButton.tsx`
完整的支付按钮组件，包含：
- 网络自动切换（切换到 Base Sepolia）
- 支付确认对话框（显示 USDT → ETH 转换）
- 交易状态跟踪
- 交易哈希和区块链浏览器链接

## 🔧 如何使用

### 在商品详情页集成支付按钮

```tsx
import { EscrowPaymentButton } from '@/components/escrow-payment-button';

// 在商品详情页中
<EscrowPaymentButton
  productId={product.id}
  sellerId={product.sellerId}
  sellerAddress={product.seller.walletAddress}
  price={product.price}
  isOwner={isOwner}
  onSuccess={() => {
    // 支付成功后的回调
    router.push('/orders');
  }}
/>
```

### 在订单详情页集成操作按钮

```tsx
import { useLunaEscrow, OrderStatus } from '@/hooks/contracts/useLunaEscrow';

function OrderActions({ order, userRole }: { order: any, userRole: string }) {
  const { confirmReceipt, raiseDispute, markAsShipped, resolveDispute, isLoading } = useLunaEscrow();

  const isBuyer = order.buyer === userAddress;
  const isSeller = order.seller === userAddress;
  const isAdminOrSupport = ['admin', 'support'].includes(userRole);

  return (
    <div>
      {/* 买家操作 */}
      {isBuyer && order.status === OrderStatus.Shipped && (
        <Button onClick={() => confirmReceipt(order.id)} disabled={isLoading}>
          确认收货
        </Button>
      )}
      {isBuyer && (order.status === OrderStatus.Active || order.status === OrderStatus.Shipped) && (
        <Button onClick={() => raiseDispute(order.id)} disabled={isLoading}>
          发起争议
        </Button>
      )}

      {/* 卖家操作 */}
      {isSeller && order.status === OrderStatus.Active && (
        <Button onClick={() => markAsShipped(order.id)} disabled={isLoading}>
          标记发货
        </Button>
      )}

      {/* 仲裁员操作（仅 admin/support） */}
      {isAdminOrSupport && order.status === OrderStatus.Disputed && (
        <div>
          <Button onClick={() => resolveDispute(order.id, true)} disabled={isLoading}>
            退款给买家
          </Button>
          <Button onClick={() => resolveDispute(order.id, false)} disabled={isLoading}>
            释放给卖家
          </Button>
        </div>
      )}
    </div>
  );
}
```

## 🧪 测试流程

### 1. 环境准备
1. 安装 MetaMask 并创建钱包
2. 添加 Base Sepolia 网络：
   - 网络名称：Base Sepolia
   - RPC URL：https://sepolia.base.org
   - 链 ID：84532
   - 货币符号：ETH
3. 领取测试 ETH：https://www.coinbase.com/faucets/base-sepolia-faucet

### 2. 测试步骤

#### 买家流程
1. 登录 Luna 平台
2. 连接钱包（自动提示切换到 Base Sepolia）
3. 选择一个商品，点击"立即购买"
4. 在确认对话框中查看 USDT → ETH 转换
5. 确认支付，等待交易确认
6. 查看订单状态

#### 卖家流程
1. 收到订单通知
2. 发货后点击"标记发货"
3. 如果买家不确认，20天后可申请自动释放

#### 争议流程
1. 买家或卖家发起争议
2. Admin/Support 查看争议
3. 仲裁并决定退款或释放

## 🔐 安全注意事项

1. **私钥安全**：永远不要暴露您的私钥
2. **测试网 ETH**：仅用于测试，无实际价值
3. **交易确认**：等待交易确认后再进行下一步操作
4. **Gas 费用**：确保有足够的 ETH 支付 Gas 费用

## 📞 故障排除

### 常见问题

#### 1. "Network not found"
**解决**：手动添加 Base Sepolia 网络到 MetaMask

#### 2. "Insufficient funds"
**解决**：到水龙头领取更多测试 ETH

#### 3. "Transaction failed"
**解决**：检查 Gas 费用设置，或稍后再试

#### 4. "User rejected"
**解决**：用户在 MetaMask 中拒绝了交易，需要重新发起

## 📚 相关文档

- [Base Sepolia 文档](https://docs.base.org/networks)
- [Ethers.js 文档](https://docs.ethers.io/)
- [MetaMask 文档](https://docs.metamask.io/)

---

**祝您测试顺利！** 🚀
