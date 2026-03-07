'use client';
import { collection, addDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import type { Notification, UserProfile, BbsPost, Product, Order, PaymentChangeRequest } from './types';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export type NotificationContext = 
    | { type: 'like-post', actor: UserProfile, post: BbsPost }
    | { type: 'like-product', actor: UserProfile, product: Product }
    | { type: 'comment', actor: UserProfile, post: BbsPost, commentText: string }
    | { type: 'reply', actor: UserProfile, parentCommentAuthorName: string, post: BbsPost, commentText: string }
    | { type: 'feature', actor: UserProfile, post: BbsPost }
    | { type: 'paymentRequestApproved', actor: UserProfile, requestId: string }
    | { type: 'paymentRequestRejected', actor: UserProfile, requestId: string, reason?: string }
    | { type: 'remind-to-ship', actor: UserProfile, order: Order, product: Product }
    | { type: 'shipped', actor: UserProfile, order: Order, trackingNumber: string, shippingProvider: string };

export async function createNotification(db: Firestore, recipientId: string, context: NotificationContext) {
    if (recipientId === context.actor.uid) {
        return; // Don't send notifications to self
    }

    let title = '';
    let message = '';
    let notificationType: Notification['type'] = 'info';

    switch (context.type) {
        case 'like-post':
            title = '帖子收到了新点赞';
            message = `${context.actor.displayName} 喜欢了你的帖子: "${context.post.title}"`;
            notificationType = 'success';
            break;
        case 'like-product':
            title = '商品收到了新点赞';
            message = `${context.actor.displayName} 喜欢了你的商品: "${context.product.name}"`;
            notificationType = 'success';
            break;
        case 'comment':
             title = '你的帖子有新评论';
             message = `${context.actor.displayName} 评论了: "${context.commentText.substring(0, 50)}..."`;
             notificationType = 'info';
            break;
        case 'reply':
             title = '你的评论有新回复';
             message = `${context.actor.displayName} 回复了你: "${context.commentText.substring(0, 50)}..."`;
             notificationType = 'info';
            break;
        case 'feature':
            title = '你的帖子被设为精华！';
            message = `恭喜！你的帖子 "${context.post.title}" 已被设为精华。`;
            notificationType = 'success';
            break;
        case 'paymentRequestApproved':
            title = '收款信息修改已批准';
            message = `管理员 ${context.actor.displayName} 已批准您的收款信息修改请求。`;
            notificationType = 'success';
            break;
        case 'paymentRequestRejected':
            title = '收款信息修改被拒绝';
            message = `您的收款信息修改请求已被拒绝。${context.reason ? `原因: ${context.reason}` : ''}`;
            notificationType = 'error';
            break;
        case 'remind-to-ship':
            title = '【发货提醒】买家正在等待您发货';
            message = `买家 ${context.actor.displayName} 正在等待您为订单 #${context.order.id.slice(0, 8)}（${context.product.name}）发货。`;
            notificationType = 'warning';
            break;
        case 'shipped':
            title = '您的订单已发货！';
            message = `卖家 ${context.actor.displayName} 已将您的商品 “${context.order.productName}” 发出。物流信息: ${context.shippingProvider} ${context.trackingNumber}`;
            notificationType = 'success';
            break;
        default:
            return;
    }

    const notification: Omit<Notification, 'id'> = {
        title,
        message,
        read: false,
        createdAt: serverTimestamp(),
        type: notificationType,
    };
    
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    
    try {
        await addDoc(notificationsRef, notification);
    } catch(serverError) {
        // This can get noisy, so maybe only emit in dev.
        if (process.env.NODE_ENV === 'development') {
            const permissionError = new FirestorePermissionError({
                path: notificationsRef.path,
                operation: 'create',
                requestResourceData: notification,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        console.error("Failed to create notification:", serverError);
    }
}
