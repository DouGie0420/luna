/**
 * USDT Transaction Recording Utility
 * Records USDT transactions to Firestore for display in wallet history
 */

import { doc, setDoc, serverTimestamp, collection, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface USDTTransactionData {
  // Transaction identification
  type: 'lock' | 'release' | 'refund' | 'approval' | 'transfer';
  amount: string; // Human-readable amount (e.g., "100.00")
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  
  // Context
  orderId?: string;
  from?: string;
  to?: string;
  
  // Metadata
  userId: string;
  timestamp: Date;
  network: string; // e.g., "Base Mainnet"
  contractAddress?: string;
}

/**
 * Record a USDT transaction to Firestore
 */
export async function recordUSDTTransaction(
  data: Omit<USDTTransactionData, 'userId' | 'createdAt'>
): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.warn('[USDT Transactions] No user logged in, skipping transaction recording');
      return null;
    }

    const db = getFirestore();
    
    // Create transaction document
    const transactionData: USDTTransactionData = {
      ...data,
      userId: user.uid,
      timestamp: new Date(),
      network: data.network || 'Base Mainnet'
    };

    // Generate a unique ID (using timestamp + random suffix to avoid collisions)
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const txRef = doc(db, 'usdt_transactions', txId);
    
    await setDoc(txRef, {
      ...transactionData,
      timestamp: serverTimestamp(),
      // Store as separate fields for easier querying
      amountNumber: parseFloat(data.amount) || 0,
      status: data.status,
      type: data.type,
      txHash: data.txHash,
      userId: user.uid,
      orderId: data.orderId || null,
      from: data.from || user.uid,
      to: data.to || null,
      network: transactionData.network,
      contractAddress: data.contractAddress || null
    });

    console.log(`[USDT Transactions] Transaction recorded: ${txId}`, {
      type: data.type,
      amount: data.amount,
      txHash: data.txHash?.substring(0, 20) + '...'
    });

    return txId;
  } catch (error) {
    console.error('[USDT Transactions] Failed to record transaction:', error);
    // Don't throw - transaction recording failure shouldn't block the main operation
    return null;
  }
}

/**
 * Record a USDT approval transaction
 */
export async function recordApprovalTransaction(
  amount: string,
  txHash: string,
  status: 'pending' | 'confirmed' | 'failed',
  contractAddress?: string
): Promise<string | null> {
  return recordUSDTTransaction({
    type: 'approval',
    amount,
    txHash,
    status,
    contractAddress,
    network: 'Base Mainnet'
  });
}

/**
 * Record a funds lock transaction (buyer locks funds in escrow)
 */
export async function recordLockTransaction(
  orderId: string,
  amount: string,
  txHash: string,
  status: 'pending' | 'confirmed' | 'failed',
  contractAddress?: string
): Promise<string | null> {
  return recordUSDTTransaction({
    type: 'lock',
    amount,
    txHash,
    status,
    orderId,
    contractAddress,
    network: 'Base Mainnet'
  });
}

/**
 * Record a funds release transaction (buyer confirms delivery)
 */
export async function recordReleaseTransaction(
  orderId: string,
  amount: string,
  txHash: string,
  status: 'pending' | 'confirmed' | 'failed',
  contractAddress?: string
): Promise<string | null> {
  return recordUSDTTransaction({
    type: 'release',
    amount,
    txHash,
    status,
    orderId,
    contractAddress,
    network: 'Base Mainnet'
  });
}

/**
 * Record a funds refund transaction (dispute resolved in buyer's favor)
 */
export async function recordRefundTransaction(
  orderId: string,
  amount: string,
  txHash: string,
  status: 'pending' | 'confirmed' | 'failed',
  contractAddress?: string
): Promise<string | null> {
  return recordUSDTTransaction({
    type: 'refund',
    amount,
    txHash,
    status,
    orderId,
    contractAddress,
    network: 'Base Mainnet'
  });
}

/**
 * Get transaction type emoji for UI display
 */
export function getTransactionEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    'lock': '🔒',
    'release': '💰',
    'refund': '↩️',
    'approval': '✅',
    'transfer': '💸'
  };
  return emojiMap[type] || '📄';
}

/**
 * Get transaction type label for UI display
 */
export function getTransactionLabel(type: string): string {
  const labelMap: Record<string, string> = {
    'lock': 'Funds Locked',
    'release': 'Funds Released',
    'refund': 'Refund Issued',
    'approval': 'USDT Approved',
    'transfer': 'Transfer'
  };
  return labelMap[type] || 'Transaction';
}