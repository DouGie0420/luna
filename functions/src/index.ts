// Luna Website\functions\src\index.ts
import * as functions from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { ethers, Contract } from 'ethers';
import ESCROW_ABI from './contracts/USDTEscrow.json';
import LUNA_ESCROW_ABI from './contracts/LunaEscrow.json';
import { USDTEscrow, LunaEscrow } from './types';

// 初始化 Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// --- 配置 Web3 相关的环境变量 ---
const config = (functions as any).config();
const WEB3_PRIVATE_KEY = config.web3?.private_key;
const WEB3_RPC_URL = config.web3?.rpc_url;
const ESCROW_CONTRACT_ADDRESS = config.web3?.escrow_contract_address;

if (!WEB3_PRIVATE_KEY || !WEB3_RPC_URL || !ESCROW_CONTRACT_ADDRESS) {
    const error = new Error('Missing Web3 configuration for Cloud Functions. Please set web3.private_key, web3.rpc_url, web3.escrow_contract_address.');
    functions.logger.error('配置缺失:', {
        hasPrivateKey: !!WEB3_PRIVATE_KEY,
        hasRpcUrl: !!WEB3_RPC_URL,
        hasEscrowAddress: !!ESCROW_CONTRACT_ADDRESS
    });
    throw error;
}

// USDTEscrow 合约实例（旧订单系统）
const provider = new ethers.JsonRpcProvider(WEB3_RPC_URL);
const signer = new ethers.Wallet(WEB3_PRIVATE_KEY!, provider);
const escrowContract = new Contract(ESCROW_CONTRACT_ADDRESS!, ESCROW_ABI, signer) as unknown as USDTEscrow;

// LunaEscrow 合约实例（租房预定系统，ETH 原生资产）
const lunaEscrowContract = new Contract(ESCROW_CONTRACT_ADDRESS!, LUNA_ESCROW_ABI, signer) as unknown as LunaEscrow;

// ─────────────────────────────────────────────────────────────────────────────
// 取消政策常量（天数）
// ─────────────────────────────────────────────────────────────────────────────
const AUTO_REFUND_DAYS = 7;    // 入住前 ≥ 7 天：自动全额退款
const REVIEW_DAYS     = 3;     // 入住前 3–7 天：人工审核
// 入住前 < 3 天：自动拒绝退款

/**
 * 将 Firebase 文档 ID 转换为智能合约使用的 uint256 数字 ID
 * 与前端 useEscrowContract.ts 中的 toNumericId() 逻辑完全一致
 */
function toNumericId(firebaseId: string): bigint {
    return ethers.toBigInt(ethers.id(firebaseId));
}


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

// ─────────────────────────────────────────────────────────────────────────────
// 自动退款 Cloud Function
// 触发条件：bookings/{bookingId} 文档更新，且 cancellationRequested 刚变为 true
// ─────────────────────────────────────────────────────────────────────────────
export const processBookingCancellation = onDocumentUpdated('bookings/{bookingId}', async (event) => {
        const bookingId = event.params.bookingId;
        const before = event.data!.before.data();
        const after  = event.data!.after.data();

        // 只在 cancellationRequested 刚变为 true 时触发，防止重复执行
        if (!after.cancellationRequested || before.cancellationRequested === true) {
            return null;
        }

        // 必须有 escrowOrderId 才能执行链上操作
        if (!after.escrowOrderId) {
            functions.logger.warn(`[AutoRefund] Booking ${bookingId} 缺少 escrowOrderId，跳过链上操作。`);
            await event.data!.after.ref.update({
                autoRefundStatus: 'skipped_no_escrow_id',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return null;
        }

        // 计算距离入住还有多少天
        let checkInDate: Date;
        try {
            checkInDate = after.checkIn?.toDate
                ? after.checkIn.toDate()
                : new Date(after.checkIn._seconds * 1000);
        } catch (e) {
            functions.logger.error(`[AutoRefund] Booking ${bookingId} checkIn 日期解析失败`, e);
            return null;
        }

        const now = new Date();
        const daysUntilCheckIn = Math.floor(
            (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        functions.logger.info(`[AutoRefund] Booking ${bookingId} | 距离入住: ${daysUntilCheckIn} 天 | 政策阈值: ${AUTO_REFUND_DAYS}天全退 / ${REVIEW_DAYS}天人工`);

        // ── 情况一：入住前 < 3 天 → 自动拒绝退款 ────────────────────────────
        if (daysUntilCheckIn < REVIEW_DAYS) {
            functions.logger.info(`[AutoRefund] Booking ${bookingId} 入住前 ${daysUntilCheckIn} 天，不符合退款政策，自动拒绝。`);
            await event.data!.after.ref.update({
                status: 'cancelled',
                cancellationRequested: false,
                autoRefundStatus: 'auto_rejected',
                autoRefundReason: `入住前 ${daysUntilCheckIn} 天内申请，不符合退款政策（最少需提前 ${REVIEW_DAYS} 天）`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // 写一条通知给租客
            await db.collection('notifications').add({
                userId: after.tenantId,
                type: 'booking_cancellation_rejected',
                title: '退款申请已处理',
                message: `您的预定（${after.propertyName || bookingId.slice(0, 8)}）退款申请已被系统自动拒绝。原因：入住前 ${daysUntilCheckIn} 天内申请不符合退款政策。`,
                bookingId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return null;
        }

        // ── 情况二：入住前 3–7 天 → 转人工审核 ──────────────────────────────
        if (daysUntilCheckIn < AUTO_REFUND_DAYS) {
            functions.logger.info(`[AutoRefund] Booking ${bookingId} 入住前 ${daysUntilCheckIn} 天，转人工审核。`);
            await event.data!.after.ref.update({
                status: 'cancellation_requested',
                autoRefundStatus: 'pending_manual_review',
                autoRefundReason: `入住前 ${daysUntilCheckIn} 天申请，需管理员人工审核（${REVIEW_DAYS}–${AUTO_REFUND_DAYS} 天区间）`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // 通知管理员
            await db.collection('adminNotifications').add({
                type: 'booking_cancellation_manual_review',
                title: '租房退款申请 — 需人工审核',
                message: `预定 ${after.propertyName || bookingId.slice(0, 8)} 需要人工审核退款（入住前 ${daysUntilCheckIn} 天）。租客原因：${after.cancellationReason || '未填写'}`,
                bookingId,
                tenantId: after.tenantId,
                hostId: after.hostId,
                daysUntilCheckIn,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return null;
        }

        // ── 情况三：入住前 ≥ 7 天 → 自动全额退款 ────────────────────────────
        functions.logger.info(`[AutoRefund] Booking ${bookingId} 入住前 ${daysUntilCheckIn} 天，触发自动全额退款。`);

        // 先标记处理中，防止并发重复触发
        await event.data!.after.ref.update({
            autoRefundStatus: 'processing',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        try {
            const numericOrderId = toNumericId(bookingId);

            functions.logger.info(`[AutoRefund] 调用链上 resolveDispute | orderId: ${numericOrderId.toString()} | refundToBuyer: true`);

            const tx = await lunaEscrowContract.resolveDispute(numericOrderId, true);
            await tx.wait();

            functions.logger.info(`[AutoRefund] 链上退款成功 | txHash: ${tx.hash} | booking: ${bookingId}`);

            // 更新 Firestore
            await event.data!.after.ref.update({
                status: 'refunded',
                cancellationApproved: true,
                autoRefundStatus: 'completed',
                refundTxHash: tx.hash,
                refundedAt: admin.firestore.FieldValue.serverTimestamp(),
                resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // 解除房源日期封锁
            if (after.propertyId) {
                try {
                    const propRef = db.collection('rentalProperties').doc(after.propertyId);
                    const propSnap = await propRef.get();
                    if (propSnap.exists) {
                        const blockedDates: any[] = propSnap.data()?.blockedDates || [];
                        const ciTime = checkInDate.getTime();
                        const coDate = after.checkOut?.toDate
                            ? after.checkOut.toDate()
                            : new Date(after.checkOut._seconds * 1000);
                        const filteredDates = blockedDates.filter((d: any) => {
                            const dTime = d?.toDate ? d.toDate().getTime() : new Date(d).getTime();
                            return dTime < ciTime || dTime >= coDate.getTime();
                        });
                        await propRef.update({ blockedDates: filteredDates });
                        functions.logger.info(`[AutoRefund] 已解除房源 ${after.propertyId} 的日期封锁`);
                    }
                } catch (dateErr) {
                    functions.logger.warn(`[AutoRefund] 解除房源日期封锁失败（非致命）:`, dateErr);
                }
            }

            // 通知租客退款成功
            await db.collection('notifications').add({
                userId: after.tenantId,
                type: 'booking_refunded',
                title: '退款成功 ✅',
                message: `您的预定（${after.propertyName || bookingId.slice(0, 8)}）已成功退款，ETH 将在链上确认后到账您的钱包。交易哈希: ${tx.hash}`,
                bookingId,
                txHash: tx.hash,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        } catch (err: any) {
            functions.logger.error(`[AutoRefund] 链上退款失败 | booking: ${bookingId}`, err);

            // 退款失败 → 转人工处理，不能让用户的钱卡在那里
            await event.data!.after.ref.update({
                autoRefundStatus: 'failed_fallback_to_manual',
                autoRefundError: err.message || '链上交易失败',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            await db.collection('adminNotifications').add({
                type: 'booking_auto_refund_failed',
                title: '⚠️ 自动退款失败 — 需紧急人工处理',
                message: `预定 ${bookingId} 自动退款失败，请立即手动处理！错误: ${err.message}`,
                bookingId,
                tenantId: after.tenantId,
                error: err.message,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        return null;
    });