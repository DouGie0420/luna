'use client';

import { useCallback, useState } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { LUNA_ESCROW_CONTRACT_ADDRESS, LUNA_ESCROW_ABI, BASE_SEPOLIA_CONFIG } from '@/lib/web3/config';
import { useToast } from '@/hooks/use-toast';

// 订单状态枚举 (与合约一致)
export enum OrderStatus {
  Active = 0,      // 进行中
  Shipped = 1,     // 已发货
  Completed = 2,   // 已完成
  Disputed = 3,    // 争议中
  Refunded = 4,    // 已退款
}

// 订单状态文本映射
export const OrderStatusText: Record<OrderStatus, string> = {
  [OrderStatus.Active]: '进行中',
  [OrderStatus.Shipped]: '已发货',
  [OrderStatus.Completed]: '已完成',
  [OrderStatus.Disputed]: '争议中',
  [OrderStatus.Refunded]: '已退款',
};

// 订单数据结构
export interface Order {
  amount: bigint;           // ETH 金额 (wei)
  deliveryTimestamp: bigint;
  buyer: string;
  seller: string;
  status: OrderStatus;
}

// 扩展订单信息（带转换）
export interface OrderInfo extends Order {
  orderId: string;
  amountEth: string;        // ETH 可读格式
  amountUsdt: string;       // USDT 显示金额
  statusText: string;
  deliveryDate?: Date;
}

// Hook 返回类型
interface UseLunaEscrowReturn {
  // 状态
  isLoading: boolean;
  txHash: string | null;

  // 读取函数
  getOrder: (orderId: number | bigint) => Promise<Order | null>;
  getOrderInfo: (orderId: string | number) => Promise<OrderInfo | null>;
  getOrderStatus: (orderId: number | bigint) => Promise<OrderStatus | null>;

  // 写入函数 (买家)
  createOrder: (orderId: number | bigint, seller: string, amountEth: string) => Promise<boolean>;
  confirmReceipt: (orderId: number | bigint) => Promise<boolean>;
  raiseDispute: (orderId: number | bigint) => Promise<boolean>;

  // 写入函数 (卖家)
  markAsShipped: (orderId: number | bigint) => Promise<boolean>;
  sellerRequestRelease: (orderId: number | bigint) => Promise<boolean>;

  // 写入函数 (仲裁员 - admin/support)
  resolveDispute: (orderId: number | bigint, refundToBuyer: boolean) => Promise<boolean>;

  // 工具函数
  switchToBaseSepolia: () => Promise<boolean>;
  formatEth: (wei: bigint) => string;
  parseEth: (eth: string) => bigint;
  usdtToEth: (usdtAmount: string) => string;
  ethToUsdt: (ethAmount: string | bigint) => string;
}

// 汇率配置（测试网）
const ETH_TO_USDT_RATE = 0.001; // 1 USDT = 0.001 ETH (测试网模拟)

export function useLunaEscrow(): UseLunaEscrowReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { toast } = useToast();

  // 获取合约实例
  const getContract = useCallback(async (withSigner = false) => {
    if (typeof window === 'undefined' || !window.ethereum) {
      toast({
        variant: 'destructive',
        title: '钱包未安装',
        description: '请安装 MetaMask 或其他 Web3 钱包',
      });
      return null;
    }

    const provider = new BrowserProvider(window.ethereum);

    if (withSigner) {
      const signer = await provider.getSigner();
      return new Contract(LUNA_ESCROW_CONTRACT_ADDRESS, LUNA_ESCROW_ABI, signer);
    }

    return new Contract(LUNA_ESCROW_CONTRACT_ADDRESS, LUNA_ESCROW_ABI, provider);
  }, [toast]);

  // 切换到 Base Sepolia 网络
  const switchToBaseSepolia = useCallback(async (): Promise<boolean> => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${BASE_SEPOLIA_CONFIG.chainId.toString(16)}` }],
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${BASE_SEPOLIA_CONFIG.chainId.toString(16)}`,
              chainName: BASE_SEPOLIA_CONFIG.name,
              nativeCurrency: {
                name: BASE_SEPOLIA_CONFIG.currency,
                symbol: BASE_SEPOLIA_CONFIG.currency,
                decimals: 18,
              },
              rpcUrls: [BASE_SEPOLIA_CONFIG.rpcUrl],
              blockExplorerUrls: [BASE_SEPOLIA_CONFIG.explorerUrl],
            }],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Base Sepolia:', addError);
          return false;
        }
      }
      return false;
    }
  }, []);

  // 获取订单详情
  const getOrder = useCallback(async (orderId: number | bigint): Promise<Order | null> => {
    try {
      const contract = await getContract(false);
      if (!contract) return null;

      const order = await contract.orders(orderId);
      return {
        amount: order.amount,
        deliveryTimestamp: order.deliveryTimestamp,
        buyer: order.buyer,
        seller: order.seller,
        status: order.status as OrderStatus,
      };
    } catch (error) {
      console.error('Failed to get order:', error);
      return null;
    }
  }, [getContract]);

  // 获取订单信息（带转换）
  const getOrderInfo = useCallback(async (orderId: string | number): Promise<OrderInfo | null> => {
    const order = await getOrder(BigInt(orderId));
    if (!order) return null;

    const amountEth = formatEther(order.amount);

    return {
      ...order,
      orderId: orderId.toString(),
      amountEth,
      amountUsdt: ethToUsdt(amountEth),
      statusText: OrderStatusText[order.status],
      deliveryDate: order.deliveryTimestamp > 0
        ? new Date(Number(order.deliveryTimestamp) * 1000)
        : undefined,
    };
  }, [getOrder]);

  // 获取订单状态
  const getOrderStatus = useCallback(async (orderId: number | bigint): Promise<OrderStatus | null> => {
    const order = await getOrder(orderId);
    return order?.status ?? null;
  }, [getOrder]);

  // 创建订单 (买家) - 使用 ETH 支付
  const createOrder = useCallback(async (
    orderId: number | bigint,
    seller: string,
    amountEth: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setTxHash(null);

    try {
      // 先切换到 Base Sepolia
      const switched = await switchToBaseSepolia();
      if (!switched) {
        toast({
          variant: 'destructive',
          title: '网络切换失败',
          description: '请手动切换到 Base Sepolia 测试网',
        });
        return false;
      }

      const contract = await getContract(true);
      if (!contract) return false;

      const amountWei = parseEther(amountEth);

      toast({
        title: '准备创建订单',
        description: `支付 ${amountEth} ETH (显示: ${ethToUsdt(amountEth)} USDT)`,
      });

      const tx = await contract.createOrder(orderId, seller, {
        value: amountWei,
      });

      setTxHash(tx.hash);

      toast({
        title: '交易已提交',
        description: `订单创建中... Hash: ${tx.hash.slice(0, 10)}...`,
      });

      const receipt = await tx.wait();

      toast({
        title: '订单创建成功!',
        description: `订单 ID: ${orderId}, 区块: ${receipt?.blockNumber}`,
      });

      return true;
    } catch (error: any) {
      console.error('Failed to create order:', error);
      toast({
        variant: 'destructive',
        title: '创建订单失败',
        description: error.reason || error.message || 'Unknown error',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, switchToBaseSepolia, toast]);

  // 确认收货 (买家)
  const confirmReceipt = useCallback(async (orderId: number | bigint): Promise<boolean> => {
    setIsLoading(true);
    setTxHash(null);

    try {
      const contract = await getContract(true);
      if (!contract) return false;

      const tx = await contract.confirmReceipt(orderId);
      setTxHash(tx.hash);

      toast({
        title: '交易已提交',
        description: `确认收货中... Hash: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: '确认收货成功!',
        description: '资金已释放给卖家',
      });

      return true;
    } catch (error: any) {
      console.error('Failed to confirm receipt:', error);
      toast({
        variant: 'destructive',
        title: '确认收货失败',
        description: error.reason || error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, toast]);

  // 发起争议 (买家/卖家)
  const raiseDispute = useCallback(async (orderId: number | bigint): Promise<boolean> => {
    setIsLoading(true);
    setTxHash(null);

    try {
      const contract = await getContract(true);
      if (!contract) return false;

      const tx = await contract.raiseDispute(orderId);
      setTxHash(tx.hash);

      toast({
        title: '交易已提交',
        description: `发起争议中... Hash: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: '争议已发起!',
        description: '等待平台仲裁',
      });

      return true;
    } catch (error: any) {
      console.error('Failed to raise dispute:', error);
      toast({
        variant: 'destructive',
        title: '发起争议失败',
        description: error.reason || error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, toast]);

  // 标记发货 (卖家)
  const markAsShipped = useCallback(async (orderId: number | bigint): Promise<boolean> => {
    setIsLoading(true);
    setTxHash(null);

    try {
      const contract = await getContract(true);
      if (!contract) return false;

      const tx = await contract.markAsShipped(orderId);
      setTxHash(tx.hash);

      toast({
        title: '交易已提交',
        description: `标记发货中... Hash: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: '发货成功!',
        description: '买家可以确认收货了',
      });

      return true;
    } catch (error: any) {
      console.error('Failed to mark as shipped:', error);
      toast({
        variant: 'destructive',
        title: '标记发货失败',
        description: error.reason || error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, toast]);

  // 卖家请求释放 (20天后自动释放)
  const sellerRequestRelease = useCallback(async (orderId: number | bigint): Promise<boolean> => {
    setIsLoading(true);
    setTxHash(null);

    try {
      const contract = await getContract(true);
      if (!contract) return false;

      const tx = await contract.sellerRequestRelease(orderId);
      setTxHash(tx.hash);

      toast({
        title: '交易已提交',
        description: `请求释放资金中... Hash: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: '资金已释放!',
        description: '20天期限已到，资金已自动释放',
      });

      return true;
    } catch (error: any) {
      console.error('Failed to request release:', error);
      toast({
        variant: 'destructive',
        title: '请求释放失败',
        description: error.reason || error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, toast]);

  // 仲裁解决争议 (仅 admin/support 可用)
  const resolveDispute = useCallback(async (
    orderId: number | bigint,
    refundToBuyer: boolean
  ): Promise<boolean> => {
    setIsLoading(true);
    setTxHash(null);

    try {
      const contract = await getContract(true);
      if (!contract) return false;

      const tx = await contract.resolveDispute(orderId, refundToBuyer);
      setTxHash(tx.hash);

      toast({
        title: '交易已提交',
        description: `仲裁处理中... Hash: ${tx.hash.slice(0, 10)}...`,
      });

      await tx.wait();

      toast({
        title: '仲裁完成!',
        description: refundToBuyer ? '资金已退还给买家' : '资金已释放给卖家',
      });

      return true;
    } catch (error: any) {
      console.error('Failed to resolve dispute:', error);
      toast({
        variant: 'destructive',
        title: '仲裁失败',
        description: error.reason || error.message,
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getContract, toast]);

  // 工具函数：格式化 ETH
  const formatEth = useCallback((wei: bigint): string => {
    return formatEther(wei);
  }, []);

  // 工具函数：解析 ETH
  const parseEth = useCallback((eth: string): bigint => {
    return parseEther(eth);
  }, []);

  // USDT 到 ETH 转换（测试网模拟汇率）
  const usdtToEth = useCallback((usdtAmount: string): string => {
    const usdt = parseFloat(usdtAmount);
    const eth = usdt * ETH_TO_USDT_RATE;
    return eth.toFixed(6);
  }, []);

  // ETH 到 USDT 转换
  const ethToUsdt = useCallback((ethAmount: string | bigint): string => {
    let eth: number;
    if (typeof ethAmount === 'bigint') {
      eth = parseFloat(formatEther(ethAmount));
    } else {
      eth = parseFloat(ethAmount);
    }
    const usdt = eth / ETH_TO_USDT_RATE;
    return usdt.toFixed(2);
  }, []);

  return {
    isLoading,
    txHash,
    getOrder,
    getOrderInfo,
    getOrderStatus,
    createOrder,
    confirmReceipt,
    raiseDispute,
    markAsShipped,
    sellerRequestRelease,
    resolveDispute,
    switchToBaseSepolia,
    formatEth,
    parseEth,
    usdtToEth,
    ethToUsdt,
  };
}

// 导出类型和常量
export type { Order, OrderInfo, UseLunaEscrowReturn };
export { OrderStatus, OrderStatusText };
