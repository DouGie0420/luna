'use client';
import { collection, addDoc, serverTimestamp, type Firestore } from "firebase/firestore";
import type { Notification, UserProfile, BbsPost, Product } from './types';
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export type NotificationContext = 
    | { type: 'like-post', actor: UserProfile, post: BbsPost }
    | { type: 'like-product', actor: UserProfile, product: Product }
    | { type: 'comment', actor: UserProfile, post: BbsPost, commentText: string }
    | { type: 'reply', actor: UserProfile, parentCommentAuthorName: string, post: BbsPost, commentText: string }
    | { type: 'feature', actor: UserProfile, post: BbsPost };

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
