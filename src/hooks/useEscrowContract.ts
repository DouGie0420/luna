// G:\Luna Website\src\\hooks\\useEscrowContract.ts
import { useState, useCallback } from 'react';
import { ethers, Contract, BigNumberish } from 'ethers';
import ESCROW_ABI from '@/contracts/USDTEscrow.json'; // 引入托管合约 ABI
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

// 从环境变量获取合约地址
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;

interface UseEscrowContractResult {
  isInteracting: boolean;
  interactionError: string | null;
  transactionState: TransactionState;
  lockFunds: (orderId: string) => Promise<EscrowTransactionResult>; // 返回详细结果
  confirmDelivery: (orderId: string) => Promise<EscrowTransactionResult>; // 返回详细结果
  openDispute: (orderId: string) => Promise<EscrowTransactionResult>; // 返回详细结果
  // resolveDispute 方法通常由 Arbiter 调用，可以在管理后台或独立的Hook中实现
}

/**
 * React Hook 用于与 Luna USDTEscrow 智能合约交互。
 * 封装了存款、确认交货、打开争议等操作。
 *
 * @returns {UseEscrowContractResult} 包含交互状态、错误信息和合约交互函数。
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
      return new Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);
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

  const lockFunds = useCallback(async (orderId: string, amount?: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return {
        success: false,
        error: 'Failed to get escrow contract',
        status: TransactionStatus.FAILED
      };
    }
    const result = await executeTransaction(escrowContract.lockFunds(orderId));
    
    // 记录交易（如果成功）
    if (result.success && result.hash) {
      try {
        await recordLockTransaction(
          orderId,
          amount || '0',
          result.hash,
          'confirmed',
          ESCROW_CONTRACT_ADDRESS
        );
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record lock transaction:', recordError);
        // 不阻塞主操作
      }
    }
    
    return result;
  }, [getEscrowContract, executeTransaction]);

  const confirmDelivery = useCallback(async (orderId: string, amount?: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return {
        success: false,
        error: 'Failed to get escrow contract',
        status: TransactionStatus.FAILED
      };
    }
    const result = await executeTransaction(escrowContract.confirmDelivery(orderId));
    
    // 记录交易（如果成功）
    if (result.success && result.hash) {
      try {
        await recordReleaseTransaction(
          orderId,
          amount || '0',
          result.hash,
          'confirmed',
          ESCROW_CONTRACT_ADDRESS
        );
      } catch (recordError) {
        console.error('[Escrow Contract] Failed to record release transaction:', recordError);
        // 不阻塞主操作
      }
    }
    
    return result;
  }, [getEscrowContract, executeTransaction]);

  const openDispute = useCallback(async (orderId: string): Promise<EscrowTransactionResult> => {
    const escrowContract = await getEscrowContract();
    if (!escrowContract) {
      return {
        success: false,
        error: 'Failed to get escrow contract',
        status: TransactionStatus.FAILED
      };
    }
    return executeTransaction(escrowContract.openDispute(orderId));
  }, [getEscrowContract, executeTransaction]);

  return {
    isInteracting,
    interactionError,
    transactionState,
    lockFunds,
    confirmDelivery,
    openDispute,
  };
}