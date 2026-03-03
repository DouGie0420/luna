// 托管合约交互Hook - 与Base网 LunaEscrow 合约交互
import { useState, useCallback } from 'react';
import { ethers, Contract, BigNumberish } from 'ethers';
import { EscrowContractABI } from '@/lib/abi/escrow'; // 使用统一的ABI来源
import { getEthersSigner } from '@/lib/web3-provider'; // 引入我们自己的 getEthersSigner
import { useUSDTBalanceAndAllowance } from './useUSDTBalanceAndAllowance'; // 用于刷新数据
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

// 从环境变量获取合约地址，带默认值
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ESCROW_ADDRESS || "0x5CcD28825df05AEAf6F55b62c9a35695B070740F";

interface UseEscrowContractResult {
  isInteracting: boolean;
  interactionError: string | null;
  transactionState: TransactionState;
  // createOrder: 创建托管订单（买家调用，附带ETH/原生代币支付）
  createOrder: (orderId: string, sellerAddress: string, amount?: string) => Promise<EscrowTransactionResult>;
  // confirmReceipt: 买家确认收货，释放资金给卖家
  confirmReceipt: (orderId: string, amount?: string) => Promise<EscrowTransactionResult>;
  // raiseDispute: 发起争议
  raiseDispute: (orderId: string) => Promise<EscrowTransactionResult>;
  // 保留旧接口名以兼容现有代码
  lockFunds: (orderId: string, sellerAddress?: string, amount?: string) => Promise<EscrowTransactionResult>;
  confirmDelivery: (orderId: string, amount?: string) => Promise<EscrowTransactionResult>;
  openDispute: (orderId: string) => Promise<EscrowTransactionResult>;
}

/**
 * React Hook 用于与 Luna LunaEscrow 智能合约交互。
 * 封装了创建订单、确认收货、发起争议等操作。
 * 合约方法名: createOrder, confirmReceipt, raiseDispute, resolveDispute, markAsShipped, sellerRequestRelease
 */
export function useEscrowContract(): UseEscrowContractResult {
  // 从 useUSDTBalanceAndAllowance 中获取连接状态和地址
  const { address, isConnected, refetch: refetchUSDTData } = useUSDTBalanceAndAllowance();

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
      // 使用统一的 EscrowContractABI
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
      // 1. 用户签名阶段
      setTransactionState({ status: TransactionStatus.SIGNING, hash: undefined });
      const transaction = await contractFunction;

      // 2. 交易已提交，等待确认
      setTransactionState({
        status: TransactionStatus.PENDING,
        hash: transaction.hash,
        confirmations: 0
      });

      // 3. 等待交易被挖矿确认
      const receipt = await transaction.wait();

      // 4. 交易确认成功
      setTransactionState({
        status: TransactionStatus.CONFIRMED,
        hash: transaction.hash,
        confirmations: receipt.confirmations || 1
      });

      refetchUSDTData(); // 交易成功后刷新相关数据
      setIsInteracting(false);

      return {
        success: true,
        hash: transaction.hash,
        status: TransactionStatus.CONFIRMED
      };
    } catch (err: any) {
      console.error('Escrow contract interaction failed:', err);

      let errorMessage = 'Transaction failed';
      if (err.code === 4001) {
        errorMessage = 'User rejected the transaction.';
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        errorMessage = err.message;
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
  }, [refetchUSDTData]);

  // 创建订单 - 合约方法: createOrder(uint256 _orderId, address _seller) payable
  const createOrder = useCallback(async (orderId: string, sellerAddress: string, amount?: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return { success: false, error: 'Failed to get escrow contract', status: TransactionStatus.FAILED };
    }

    // createOrder 是 payable 方法，需要附带 ETH 值
    const txOptions = amount ? { value: ethers.parseEther(amount) } : {};
    const result = await executeTransaction(escrowContract.createOrder(orderId, sellerAddress, txOptions));

    // 记录交易
    if (result.success && result.hash) {
      try {
        await recordLockTransaction(orderId, amount || '0', result.hash, 'confirmed', ESCROW_CONTRACT_ADDRESS);
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record lock transaction:', recordError);
      }
    }
    return result;
  }, [getEscrowContract, executeTransaction]);

  // 确认收货 - 合约方法: confirmReceipt(uint256 _orderId)
  const confirmReceipt = useCallback(async (orderId: string, amount?: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return { success: false, error: 'Failed to get escrow contract', status: TransactionStatus.FAILED };
    }
    const result = await executeTransaction(escrowContract.confirmReceipt(orderId));

    // 记录交易
    if (result.success && result.hash) {
      try {
        await recordReleaseTransaction(orderId, amount || '0', result.hash, 'confirmed', ESCROW_CONTRACT_ADDRESS);
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record release transaction:', recordError);
      }
    }
    return result;
  }, [getEscrowContract, executeTransaction]);

  // 发起争议 - 合约方法: raiseDispute(uint256 _orderId)
  const raiseDispute = useCallback(async (orderId: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return { success: false, error: 'Failed to get escrow contract', status: TransactionStatus.FAILED };
    }
    return executeTransaction(escrowContract.raiseDispute(orderId));
  }, [getEscrowContract, executeTransaction]);

  // 兼容旧接口: lockFunds -> createOrder
  const lockFunds = useCallback(async (orderId: string, sellerAddress?: string, amount?: string): Promise<EscrowTransactionResult> => {
    return createOrder(orderId, sellerAddress || ethers.ZeroAddress, amount);
  }, [createOrder]);

  // 兼容旧接口: confirmDelivery -> confirmReceipt
  const confirmDelivery = useCallback(async (orderId: string, amount?: string): Promise<EscrowTransactionResult> => {
    return confirmReceipt(orderId, amount);
  }, [confirmReceipt]);

  // 兼容旧接口: openDispute -> raiseDispute
  const openDispute = useCallback(async (orderId: string): Promise<EscrowTransactionResult> => {
    return raiseDispute(orderId);
  }, [raiseDispute]);

  return {
    isInteracting,
    interactionError,
    transactionState,
    createOrder,
    confirmReceipt,
    raiseDispute,
    // 兼容旧接口
    lockFunds,
    confirmDelivery,
    openDispute,
  };
}