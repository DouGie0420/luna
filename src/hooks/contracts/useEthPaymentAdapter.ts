'use client';

import { useCallback } from 'react';
import { formatEther, parseEther } from 'ethers';
import {
  useLunaEscrow,
  OrderStatus,
  OrderStatusText,
  OrderInfo,
  Order,
} from './useLunaEscrow';

// 汇率配置：测试网 1 USDT = 0.001 ETH
const ETH_TO_USDT_RATE = 0.001;

export interface PaymentDisplayInfo {
  displayAmount: string;    // 显示的 USDT 金额
  payAmount: string;        // 实际支付的 ETH 金额
  displaySymbol: string;    // 显示符号 (USDT)
  paySymbol: string;        // 支付符号 (ETH)
  exchangeRate: string;     // 汇率说明
}

export interface OrderDisplayInfo extends OrderInfo {
  displayStatus: string;
  shortTxHash?: string;
  explorerUrl?: string;
}

export function useEthPaymentAdapter() {
  const lunaEscrow = useLunaEscrow();

  // 转换 USDT 显示金额到 ETH 支付金额
  const usdtToEth = useCallback((usdtAmount: string | number): string => {
    const usdt = parseFloat(usdtAmount.toString());
    const eth = usdt * ETH_TO_USDT_RATE;
    return eth.toFixed(6);
  }, []);

  // 转换 ETH 金额到 USDT 显示金额
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

  // 获取支付信息（用于显示）
  const getPaymentInfo = useCallback((usdtAmount: string): PaymentDisplayInfo => {
    const ethAmount = usdtToEth(usdtAmount);
    return {
      displayAmount: usdtAmount,
      payAmount: ethAmount,
      displaySymbol: 'USDT',
      paySymbol: 'ETH',
      exchangeRate: `1 USDT ≈ ${ETH_TO_USDT_RATE} ETH (测试网)`,
    };
  }, [usdtToEth]);

  // 获取订单详情（带转换）
  const getOrderWithConversion = useCallback(async (
    orderId: string | number | bigint
  ): Promise<OrderDisplayInfo | null> => {
    const order = await lunaEscrow.getOrder(BigInt(orderId));
    if (!order) return null;

    const amountEth = formatEther(order.amount);
    const shortOrderId = orderId.toString().slice(0, 8) + '...';

    return {
      orderId: orderId.toString(),
      buyer: order.buyer,
      seller: order.seller,
      status: order.status,
      statusText: OrderStatusText[order.status],
      displayStatus: OrderStatusText[order.status],
      amount: order.amount,
      amountEth,
      amountUsdt: ethToUsdt(amountEth),
      deliveryTimestamp: order.deliveryTimestamp,
      deliveryDate: order.deliveryTimestamp > 0
        ? new Date(Number(order.deliveryTimestamp) * 1000)
        : undefined,
      shortTxHash: lunaEscrow.txHash ? `${lunaEscrow.txHash.slice(0, 6)}...${lunaEscrow.txHash.slice(-4)}` : undefined,
      explorerUrl: lunaEscrow.txHash ? `https://sepolia.basescan.org/tx/${lunaEscrow.txHash}` : undefined,
    };
  }, [lunaEscrow, ethToUsdt]);

  // 创建订单（自动转换）
  const createOrderWithConversion = useCallback(async (
    orderId: string | number,
    seller: string,
    usdtAmount: string
  ): Promise<boolean> => {
    const ethAmount = usdtToEth(usdtAmount);
    console.log(`Creating order: ${usdtAmount} USDT = ${ethAmount} ETH`);
    return lunaEscrow.createOrder(BigInt(orderId), seller, ethAmount);
  }, [lunaEscrow, usdtToEth]);

  return {
    // 原有 hook 的所有功能
    ...lunaEscrow,

    // 适配器功能
    usdtToEth,
    ethToUsdt,
    getPaymentInfo,
    getOrderWithConversion,
    createOrderWithConversion,

    // 常量
    OrderStatus,
    OrderStatusText,
  };
}

// 导出类型
export type {
  PaymentDisplayInfo,
  OrderDisplayInfo,
  Order,
  OrderInfo,
};
export { OrderStatus, OrderStatusText };
