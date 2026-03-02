// G:\Luna Website\src\\hooks\\useUSDTApprove.ts
import { useState, useCallback } from 'react';
import { ethers, Contract, BigNumberish } from 'ethers';
import USDT_ABI from '@/contracts/USDT_ABI.json';
import { useUSDTBalanceAndAllowance } from './useUSDTBalanceAndAllowance'; // 引入余额和授权Hook
import { getEthersSigner } from '@/lib/web3-provider'; // 引入我们自己的 getEthersSigner
import { recordApprovalTransaction } from '@/lib/usdt-transactions'; // 引入交易记录

// 从环境变量获取合约地址
const USDT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS;
const ESCROW_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;

interface UseUSDTApproveResult {
  isApproving: boolean;
  approvalError: string | null;
  approveUSDT: (amountToApprove: BigNumberish) => Promise<boolean>;
}

/**
 * React Hook 用于授权 Luna 托管合约从用户钱包中花费 USDT。
 *
 * @returns {UseUSDTApproveResult} 包含授权状态、错误信息和授权函数。
 */
export function useUSDTApprove(): UseUSDTApproveResult {
  // 从 useUSDTBalanceAndAllowance 中获取连接状态和地址
  const { address, isConnected, refetch: refetchUSDTData, decimals } = useUSDTBalanceAndAllowance(); 

  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const approveUSDT = useCallback(async (amountToApprove: BigNumberish): Promise<boolean> => {
    setIsApproving(true);
    setApprovalError(null);

    // 检查连接状态和地址
    if (!isConnected || !address) {
      setApprovalError('Wallet not connected or address unavailable.');
      setIsApproving(false);
      return false;
    }

    if (!USDT_CONTRACT_ADDRESS || !ESCROW_CONTRACT_ADDRESS) {
      setApprovalError('Missing USDT or Escrow contract address in environment variables.');
      setIsApproving(false);
      return false;
    }

    try {
      const signer = await getEthersSigner(); // 获取 signer
      if (!signer) {
        setApprovalError('Could not get wallet signer. Please ensure your wallet is unlocked and connected.');
        setIsApproving(false);
        return false;
      }

      const usdtContract = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);

      const transaction = await usdtContract.approve(ESCROW_CONTRACT_ADDRESS, amountToApprove);
      console.log('[USDT Approve] Transaction submitted:', transaction.hash);
      
      // 记录 pending 状态（可选，如果允许更新可以添加）
      // 暂时不记录 pending，等确认后再记录
      
      const receipt = await transaction.wait(); // 等待交易被挖矿确认

      console.log('[USDT Approve] Transaction confirmed:', transaction.hash);
      
      // 记录成功的授权交易
      if (decimals !== null) {
        const amountFormatted = ethers.formatUnits(amountToApprove, decimals);
        await recordApprovalTransaction(
          amountFormatted,
          transaction.hash,
          'confirmed',
          USDT_CONTRACT_ADDRESS
        );
      }

      refetchUSDTData(); // 授权成功后刷新 USDT 余额和授权额度

      setIsApproving(false);
      return true;
    } catch (err: any) {
      console.error('USDT approval failed:', err);
      
      // 记录失败的交易（如果有交易哈希）
      if (err.transactionHash) {
        try {
          const amountFormatted = decimals !== null ? ethers.formatUnits(amountToApprove, decimals) : amountToApprove.toString();
          await recordApprovalTransaction(
            amountFormatted,
            err.transactionHash,
            'failed',
            USDT_CONTRACT_ADDRESS
          );
        } catch (recordError) {
          console.error('[USDT Approve] Failed to record failed transaction:', recordError);
        }
      }
      
      // 检查用户取消交易的错误码 (例如 MetaMask 的 4001)
      if (err.code === 4001) {
        setApprovalError('User rejected the transaction.');
      } else {
        setApprovalError(`Approval failed: ${err.reason || err.message || err.toString()}`);
      }
      setIsApproving(false);
      return false;
    }
  }, [address, isConnected, refetchUSDTData, decimals]); // 依赖项更新

  return { isApproving, approvalError, approveUSDT };
}