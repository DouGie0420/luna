// Luna Website\functions\src\index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ethers, Contract } from 'ethers'; // 引入 Contract
import ESCROW_ABI from './contracts/USDTEscrow.json'; // 导入托管合约 ABI
import { USDTEscrow } from './types'; // 导入合约类型

// 初始化 Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// --- 配置 Web3 相关的环境变量 ---
const config = (functions as any).config();
const WEB3_PRIVATE_KEY = config.web3?.private_key;
const WEB3_RPC_URL = config.web3?.rpc_url;
const ESCROW_CONTRACT_ADDRESS = config.web3?.escrow_contract_address;

if (!WEB3_PRIVATE_KEY || !WEB3_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
    const error = new Error('Missing Web3 configuration for Cloud Functions. Please set web3.private_key, web3.rpc_url, webbase.escrow_contract_address.');
    functions.logger.error('配置缺失:', {
        hasPrivateKey: !!WEB3_PRIVATE_KEY,
        hasRpcUrl: !!WEB3_RPC_URL,
        hasEscrowAddress: !!ESCROW_CONTRACT_ADDRESS
    });
    throw error;
}

// 确保私钥和RPC URL存在且有效
const provider = new ethers.JsonRpcProvider(WEB3_RPC_URL);
const signer = new ethers.Wallet(WEB3_PRIVATE_KEY!, provider); // 私钥需要确保存在且格式正确
const escrowContract = new Contract(ESCROW_CONTRACT_ADDRESS!, ESCROW_ABI, signer) as unknown as USDTEscrow; // 类型断言


/**
 * 创建 USDT 托管订单的 Firebase Cloud Function。
 */
export const createEscrowOrder = functions.https.onCall(async (request) => {
    // 1. 验证用户认证 (新版本：从 request.auth 获取)
    const authContext = request.auth;
    if (!authContext) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Authentication required to create an escrow order.'
        );
    }
    const userId = authContext.uid; // 当前认证用户的ID

    // 2. 验证输入数据 (新版本：从 request.data 获取)
    const { productId, sellerId, buyerId, amount: rawAmount } = request.data;

    if (!productId || !sellerId || !buyerId || rawAmount === undefined || rawAmount === null) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing or invalid arguments for createEscrowOrder: productId, sellerId, buyerId, amount are required.'
        );
    }

    // 安全地转换和验证 BigInt (兼容 Ethers v6)
    let amount: bigint;
    try {
        amount = ethers.toBigInt(rawAmount);
    } catch (e) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid amount format. It must be convertible to BigInt.'
        );
    }

    // 验证调用者是买家
    if (userId !== buyerId) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the authenticated buyer can initiate this order creation.'
        );
    }

    // 获取买家 (Buyer) 的真实 Web3 钱包地址
    const buyerDoc = await db.collection('users').doc(userId).get();
    const buyerData = buyerDoc.data();
    const buyerWalletAddress = buyerData?.walletAddress;

    if (!buyerWalletAddress || !ethers.isAddress(buyerWalletAddress)) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Buyer has not configured a valid Web3 wallet address.'
        );
    }

    // 获取卖家 (Seller) 的 Web3 钱包地址
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    const sellerData = sellerDoc.data();
    const sellerWalletAddress = sellerData?.walletAddress;

    if (!sellerWalletAddress || !ethers.isAddress(sellerWalletAddress)) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Seller has not configured a valid Web3 wallet address.'
        );
    }

    let escrowOrderId: string;
    try {
        // 3. 生成唯一的 bytes32 orderId
        const uniqueId = db.collection('transactions').doc().id; 
        escrowOrderId = ethers.keccak256(ethers.toUtf8Bytes(uniqueId)); 

        // 4. 调用智能合约的 createOrder 函数
        functions.logger.info(`Calling createOrder on escrow contract:`, {
            escrowOrderId,
            buyerAddress: buyerWalletAddress,   
            sellerAddress: sellerWalletAddress, 
            amount: amount.toString(), 
        });

        const tx = await escrowContract.createOrder(
            escrowOrderId,
            buyerWalletAddress, 
            sellerWalletAddress,
            amount 
        );
        await tx.wait(); // 等待交易确认

        functions.logger.info('Escrow order created on-chain successfully.', {
            transactionHash: tx.hash,
            escrowOrderId,
        });

        // 5. 将 escrowOrderId 存入 Firebase products 文档
        await db.collection('products').doc(productId).update({
            escrowOrderId: escrowOrderId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return { success: true, escrowOrderId: escrowOrderId, transactionHash: tx.hash };

    } catch (error: any) {
        functions.logger.error('Error creating escrow order on-chain:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to create escrow order on-chain.',
            error.message
        );
    }
});