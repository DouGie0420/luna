// G:\Luna Website\functions\src\index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ethers, Contract } from 'ethers'; // 引入 Contract
import ESCROW_ABI from './contracts/USDTEscrow.json'; // 导入托管合约 ABI
import { USDTEscrow } from './types'; // 导入合约类型

// 初始化 Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// --- 配置 Web3 相关的环境变量 ---
// 这些变量需要在 Firebase Functions 中配置
// 例如：firebase functions:config:set web3.private_key="..." web3.rpc_url="..." web3.escrow_contract_address="..."
const WEB3_PRIVATE_KEY = functions.config().web3?.private_key;
const WEB3_RPC_URL = functions.config().web3?.rpc_url;
const ESCROW_CONTRACT_ADDRESS = functions.config().web3?.escrow_contract_address;

if (!WEB3_PRIVATE_KEY || !WEB3_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
    console.error('Missing Web3 configuration for Cloud Functions. Please set web3.private_key, web3.rpc_url, web3.escrow_contract_address.');
    // 在生产环境中，可以考虑更详细的错误处理或告警
    // throw new Error('Web3 configuration is missing.'); // 在初始化阶段抛出错误
}

// 确保私钥和RPC URL存在且有效
const provider = new ethers.JsonRpcProvider(WEB3_RPC_URL);
const signer = new ethers.Wallet(WEB3_PRIVATE_KEY!, provider); // 私钥需要确保存在且格式正确
const escrowContract = new Contract(ESCROW_CONTRACT_ADDRESS!, ESCROW_ABI, signer) as unknown as USDTEscrow; // 类型断言


/**
 * 创建 USDT 托管订单的 Firebase Cloud Function。
 *
 * 当前端调用此函数时，它将在链上 `USDTEscrow` 合约中创建一个新订单，
 * 并将生成的 `escrowOrderId` 存储到 Firebase 的 `products` 文档中。
 *
 * 注意：此函数应通过 HTTPS Callable Function 调用。
 *
 * @param data 包含 productId, sellerId, buyerId, amount 的对象。
 *             amount 应该是已根据 USDT 小数位处理的 BigNumberish (例如，已乘以 10^decimals)。
 * @param context 函数调用的上下文，包含认证信息。
 */
export const createEscrowOrder = functions.https.onCall(async (data, context) => {
    // 1. 验证用户认证
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Authentication required to create an escrow order.'
        );
    }
    const userId = context.auth.uid; // 当前认证用户的ID

    // 2. 验证输入数据
    const { productId, sellerId, buyerId, amount: rawAmount } = data; // rawAmount 是已处理过小数位的 USDT 金额

    if (!productId || !sellerId || !buyerId || rawAmount === undefined || rawAmount === null || !ethers.isBigNumberish(rawAmount)) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing or invalid arguments for createEscrowOrder: productId, sellerId, buyerId, amount (BigNumberish) are required.'
        );
    }
    const amount = ethers.toBigInt(rawAmount); // 确保金额是 BigInt 类型

    // 验证调用者是买家（或根据业务逻辑）
    // 在 C2C 场景中，通常是买家触发购买意向，然后后端为该买家创建订单
    // 这里的 buyerId 应该就是 context.auth.uid
    if (userId !== buyerId) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only the authenticated buyer can initiate this order creation.'
        );
    }

    // 获取卖家钱包地址
    const sellerDoc = await db.collection('users').doc(sellerId).get();
    const sellerData = sellerDoc.data();
    const sellerWalletAddress = sellerData?.walletAddress;

    if (!sellerWalletAddress || !ethers.isAddress(sellerWalletAddress)) {
        throw new functions.https.HttpsError(
            'failed-precondition',
            'Seller has not configured a valid Web3 wallet address.'
        );
    }

    let escrowOrderId: string; // 使用 escrowOrderId 变量名以避免混淆
    try {
        // 3. 生成唯一的 bytes32 orderId
        // 使用 Firebase Document ID 或 UUID 生成一个 GUID，然后转换为 bytes32
        const uniqueId = db.collection('transactions').doc().id; // 生成一个 Firestore ID
        escrowOrderId = ethers.keccak256(ethers.toUtf8Bytes(uniqueId)); // 使用 keccak256 确保 32 字节

        // 4. 调用智能合约的 createOrder 函数
        functions.logger.info(`Calling createOrder on escrow contract:`, {
            escrowOrderId,
            buyerAddress: userId, // 合约中的 buyer 是创建订单的买家地址
            sellerAddress: sellerWalletAddress,
            amount: amount.toString(), // 传递 BigInt 的字符串表示
        });

        const tx = await escrowContract.createOrder(
            escrowOrderId,
            userId, // 买家地址，即当前认证用户
            sellerWalletAddress,
            amount // 已根据 USDT 小数位处理的 BigInt 金额
        );
        await tx.wait(); // 等待交易确认

        functions.logger.info('Escrow order created on-chain successfully.', {
            transactionHash: tx.hash,
            escrowOrderId,
        });

        // 5. 将 escrowOrderId 存入 Firebase products 文档 (或其他相关订单文档)
        // 这里将 escrowOrderId 存储到 product 文档中，供前端 lockFunds 使用。
        // 同时，也应该在 orders 集合中创建或更新一个订单记录。
        // 我们会先更新 product 记录，因为 lockFunds 会依赖它。
        await db.collection('products').doc(productId).update({
            escrowOrderId: escrowOrderId, // 将链上订单ID存入商品
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 也可以在这里创建或更新 Firebase 中的 order 记录，并关联 escrowOrderId
        // 例如：
        /*
        await db.collection('orders').doc(uniqueId).set({ // uniqueId 可以作为 Firebase Order ID
            productId,
            buyerId: userId,
            sellerId,
            amount: amount.toString(),
            escrowOrderId: escrowOrderId,
            status: 'created_on_chain',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            // ...其他订单相关数据
        }, { merge: true });
        */


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