// 托管合约交互Hook - 与Base网 LunaEscrow 合约交互
import { useState, useCallback } from 'react';
import { useTranslation } from './use-translation';
import { ethers, Contract } from 'ethers';
import { EscrowContractABI } from '@/lib/abi/escrow'; // 使用统一的ABI来源
import { getEthersSigner } from '@/lib/web3-provider'; // 引入我们自己的 getEthersSigner
import { useUSDTBalanceAndAllowance } from './useUSDTBalanceAndAllowance'; // 用于刷新数据和获取钱包状态
import { recordLockTransaction, recordReleaseTransaction, recordRefundTransaction } from '@/lib/usdt-transactions'; // 交易记录

// 交易状态枚举
export enum TransactionStatus {
  IDLE = 'idle',
  SIGNING = 'signing',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

interface TransactionState {
  status: TransactionStatus;
  hash?: string;
  confirmations?: number;
  error?: string;
}

interface EscrowTransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  status: TransactionStatus;
}

// 从环境变量获取合约地址，带默认值 (Base Sepolia)
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "0x5CcD28825df05AEAf6F55b62c9a35695B070740F";

interface UseEscrowContractResult {
  isInteracting: boolean;
  interactionError: string | null;
  transactionState: TransactionState;

  createOrder: (orderId: string, sellerAddress: string, amount: string | number) => Promise<EscrowTransactionResult>;
  confirmReceipt: (orderId: string, amount?: string) => Promise<EscrowTransactionResult>;
  raiseDispute: (orderId: string) => Promise<EscrowTransactionResult>;
  resolveDispute: (orderId: string, refundToBuyer: boolean) => Promise<EscrowTransactionResult>;
  markAsShipped: (orderId: string) => Promise<EscrowTransactionResult>;

  // ✅ 修复：调整参数顺序以匹配前端 ClientCheckout.tsx 的调用习惯 (orderId, amount, sellerAddress)
  lockFunds: (orderId: string, amount: string | number, sellerAddress?: string) => Promise<EscrowTransactionResult>;
  confirmDelivery: (orderId: string, amount?: string) => Promise<EscrowTransactionResult>;
  openDispute: (orderId: string) => Promise<EscrowTransactionResult>;
}

// 🚀 核心工具：将 Firebase 的字母数字 ID 转换为智能合约支持的 uint256 纯数字
const toNumericId = (id: string): string => {
  if (/^\d+$/.test(id)) return id; // 如果已经是纯数字，直接返回
  // 否则，将其哈希为一个唯一的大整数
  return ethers.toBigInt(ethers.id(id)).toString();
};

/**
 * React Hook 用于与 Luna Escrow 智能合约交互 (Native ETH 版)
 */
export function useEscrowContract(): UseEscrowContractResult {
  const { address, isConnected, refetch: refetchUSDTData } = useUSDTBalanceAndAllowance();
  const { t } = useTranslation();

  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<TransactionState>({
    status: TransactionStatus.IDLE
  });

  const getEscrowContract = useCallback(async () => {
    if (!isConnected || !address) {
      setInteractionError('Wallet not connected or address unavailable.');
      return null;
    }
    if (!ESCROW_CONTRACT_ADDRESS) {
      setInteractionError('Missing Escrow contract address in environment variables.');
      return null;
    }

    try {
      const signer = await getEthersSigner();
      if (!signer) {
        setInteractionError('Could not get wallet signer. Please ensure your wallet is unlocked and connected.');
        return null;
      }
      return new Contract(ESCROW_CONTRACT_ADDRESS, EscrowContractABI, signer);
    } catch (err: any) {
      console.error('Failed to get Escrow Contract instance:', err);
      setInteractionError(`Failed to initialize contract: ${err.message || err.toString()}`);
      return null;
    }
  }, [address, isConnected]);

  const executeTransaction = useCallback(async (contractFunction: Promise<any>): Promise<EscrowTransactionResult> => {
    setIsInteracting(true);
    setInteractionError(null);
    setTransactionState({ status: TransactionStatus.SIGNING });

    try {
      setTransactionState({ status: TransactionStatus.SIGNING, hash: undefined });
      const transaction = await contractFunction; // 唤起钱包签名

      setTransactionState({
        status: TransactionStatus.PENDING,
        hash: transaction.hash,
        confirmations: 0
      });

      const receipt = await transaction.wait(); // 等待上链

      setTransactionState({
        status: TransactionStatus.CONFIRMED,
        hash: transaction.hash,
        confirmations: receipt.confirmations || 1
      });

      if (refetchUSDTData) refetchUSDTData(); 
      setIsInteracting(false);

      return {
        success: true,
        hash: transaction.hash,
        status: TransactionStatus.CONFIRMED
      };
    } catch (err: any) {
      console.error('Escrow contract interaction failed:', err);

      let errorMessage = t('escrowErrors.generalFailure');
      const msg = (err.message || '').toLowerCase();
      const reason = (err.reason || '').toLowerCase();

      if (err.code === 4001 || err.code === 'ACTION_REJECTED' || msg.includes('user rejected') || msg.includes('user denied')) {
        errorMessage = t('escrowErrors.cancelled');
      } else if (msg.includes('insufficient funds') || msg.includes('insufficient balance') || msg.includes('exceeds balance')) {
        errorMessage = t('escrowErrors.insufficientFunds');
      } else if ((msg.includes('missing revert data') || msg.includes('call_exception')) && err.action === 'estimateGas') {
        errorMessage = t('escrowErrors.simulationFailed');
      } else if (reason === 'not shipped') {
        errorMessage = t('escrowErrors.notShipped');
      } else if (reason === 'order already exists' || reason.includes('already exist')) {
        errorMessage = t('escrowErrors.orderAlreadyExists');
      } else if (reason === 'only seller') {
        errorMessage = t('escrowErrors.onlySeller');
      } else if (reason === 'only buyer') {
        errorMessage = t('escrowErrors.onlyBuyer');
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (msg.includes('network') || msg.includes('timeout') || msg.includes('could not fetch')) {
        errorMessage = t('escrowErrors.networkError');
      } else if (msg.includes('nonce') || msg.includes('replacement fee too low')) {
        errorMessage = t('escrowErrors.nonceConflict');
      }

      setInteractionError(errorMessage);
      setTransactionState({
        status: TransactionStatus.FAILED,
        error: errorMessage
      });
      setIsInteracting(false);

      return {
        success: false,
        error: errorMessage,
        status: TransactionStatus.FAILED
      };
    }
  }, [refetchUSDTData, t]);

  // 🚀 创建订单 (买家调用) - 附加 Native ETH
  const createOrder = useCallback(async (orderId: string, sellerAddress: string, amount: string | number): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return { success: false, error: 'Failed to get escrow contract', status: TransactionStatus.FAILED };
    }

    // 1. 将 Firebase ID 转换为智能合约接受的 uint256
    const numericOrderId = toNumericId(orderId);
    
    // 2. 将金额转换为 Wei，并作为交易的 value 发送 (ETH payable)
    const txOptions = { value: ethers.parseEther(amount.toString()) };
    
    // 3. 调用合约
    const result = await executeTransaction(escrowContract.createOrder(numericOrderId, sellerAddress, txOptions));

    if (result.success && result.hash) {
      try {
        await recordLockTransaction(orderId, amount.toString(), result.hash, 'confirmed', ESCROW_CONTRACT_ADDRESS);
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record lock transaction:', recordError);
      }
    }
    return result;
  }, [getEscrowContract, executeTransaction]);

  // 🚀 确认收货 (释放资金)
  const confirmReceipt = useCallback(async (orderId: string, amount?: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return { success: false, error: 'Failed to get escrow contract', status: TransactionStatus.FAILED };
    }
    
    const numericOrderId = toNumericId(orderId);
    const result = await executeTransaction(escrowContract.confirmReceipt(numericOrderId));

    if (result.success && result.hash) {
      try {
        await recordReleaseTransaction(orderId, amount || '0', result.hash, 'confirmed', ESCROW_CONTRACT_ADDRESS);
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record release transaction:', recordError);
      }
    }
    return result;
  }, [getEscrowContract, executeTransaction]);

  // 🚀 卖家标记发货 (链上)
  const markAsShipped = useCallback(async (orderId: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) return { success: false, error: 'Failed to get contract', status: TransactionStatus.FAILED };
    const numericOrderId = toNumericId(orderId);
    return executeTransaction(escrowContract.markAsShipped(numericOrderId));
  }, [getEscrowContract, executeTransaction]);

  // 🚀 发起争议
  const raiseDispute = useCallback(async (orderId: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) return { success: false, error: 'Failed to get contract', status: TransactionStatus.FAILED };
    
    const numericOrderId = toNumericId(orderId);
    return executeTransaction(escrowContract.raiseDispute(numericOrderId));
  }, [getEscrowContract, executeTransaction]);

  // ✅ 兼容接口：匹配 ClientCheckout 里的 await lockFunds(protocolId, order.price)
  const lockFunds = useCallback(async (orderId: string, amount: string | number, sellerAddress?: string): Promise<EscrowTransactionResult> => {
    // 如果没有传入卖家ETH地址，默认使用 ZeroAddress（智能合约需支持处理）
    return createOrder(orderId, sellerAddress || ethers.ZeroAddress, amount);
  }, [createOrder]);

  const confirmDelivery = useCallback(async (orderId: string, amount?: string): Promise<EscrowTransactionResult> => {
    return confirmReceipt(orderId, amount);
  }, [confirmReceipt]);

  const openDispute = useCallback(async (orderId: string): Promise<EscrowTransactionResult> => {
    return raiseDispute(orderId);
  }, [raiseDispute]);

  // 🚀 管理员仲裁：解决争议（退款给买家 或 释放给卖家）
  const resolveDispute = useCallback(async (orderId: string, refundToBuyer: boolean): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) return { success: false, error: 'Failed to get contract', status: TransactionStatus.FAILED };

    const numericOrderId = toNumericId(orderId);
    const result = await executeTransaction(escrowContract.resolveDispute(numericOrderId, refundToBuyer));

    if (result.success && result.hash && refundToBuyer) {
      try {
        await recordRefundTransaction(orderId, '0', result.hash, 'confirmed', ESCROW_CONTRACT_ADDRESS);
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record refund transaction:', recordError);
      }
    }
    return result;
  }, [getEscrowContract, executeTransaction]);

  return {
    isInteracting,
    interactionError,
    transactionState,
    createOrder,
    confirmReceipt,
    raiseDispute,
    resolveDispute,
    markAsShipped,
    lockFunds,
    confirmDelivery,
    openDispute,
  };
}