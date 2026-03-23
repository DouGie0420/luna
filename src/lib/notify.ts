/**
 * 系统通知工具
 * 将通知写入 Firestore notifications/{userId}/items
 * 代替 toast() 用于非关键性系统事件
 */

import { getFirestore, collection, addDoc, serverTimestamp, doc, updateDoc, query, where, writeBatch, getDocs } from 'firebase/firestore';

export type NotificationType =
  | 'follow'
  | 'like'
  | 'save'
  | 'comment'
  | 'order'
  | 'kyc'
  | 'system'
  | 'promo'
  | 'review';

export interface SystemNotification {
  id?: string;
  type: NotificationType;
  title: string;
  body?: string;
  isRead: boolean;
  createdAt: any;
  link?: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  icon?: string;
}

/**
 * 发送系统通知给指定用户
 * @param db - Firestore instance
 * @param toUserId - 接收通知的用户 UID
 * @param notification - 通知内容
 */
export async function sendSystemNotification(
  db: ReturnType<typeof getFirestore>,
  toUserId: string,
  notification: Omit<SystemNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<void> {
  try {
    const ref = collection(db, 'notifications', toUserId, 'items');
    await addDoc(ref, {
      ...notification,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // 通知写入失败不影响主流程
    console.warn('[notify] Failed to send system notification:', e);
  }
}

/**
 * 标记单条通知已读
 */
export async function markNotificationRead(
  db: ReturnType<typeof getFirestore>,
  userId: string,
  notifId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', userId, 'items', notifId), { isRead: true });
  } catch (e) {
    console.warn('[notify] Failed to mark read:', e);
  }
}

/**
 * 标记所有通知已读
 */
export async function markAllNotificationsRead(
  db: ReturnType<typeof getFirestore>,
  userId: string
): Promise<void> {
  try {
    const q = query(collection(db, 'notifications', userId, 'items'), where('isRead', '==', false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
    await batch.commit();
  } catch (e) {
    console.warn('[notify] Failed to mark all read:', e);
  }
}

/** 根据 type 返回对应 emoji 图标 */
export function getNotifIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    follow: '👤',
    like: '❤️',
    save: '🔖',
    comment: '💬',
    order: '📦',
    kyc: '🛡️',
    system: '🔔',
    promo: '🎁',
    review: '⭐',
  };
  return map[type] ?? '🔔';
}
