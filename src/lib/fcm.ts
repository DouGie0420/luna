/**
 * Firebase Cloud Messaging (FCM) Integration
 * Handles push notification subscription, token management, and message handling
 */

import { getMessaging, getToken, onMessage, deleteToken, Messaging } from 'firebase/messaging';
import { initializeApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// VAPID key for push notifications (you'll need to generate this in Firebase Console)
// This is a placeholder - you need to replace it with your actual VAPID key
// 🔥 How to get your VAPID key:
// 1. Go to Firebase Console → Project Settings → Cloud Messaging
// 2. Scroll to "Web configuration" → "Web Push certificates"
// 3. Click "Generate key pair" or copy existing VAPID key
// 4. Paste the key here (should start with 'BL', 'BM', etc.)
// 5. Also add this key in Firebase Console → Project Settings → Cloud Messaging → Web configuration
const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || 'BKagOny0KF_2pCJQ3m....'; // Use environment variable for security

// Check if FCM is supported
export function isFCMSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    getApps().length > 0
  );
}

// Initialize Firebase Messaging
export function getFirebaseMessaging(): Messaging | null {
  if (!isFCMSupported()) {
    console.log('[FCM] Firebase Messaging not supported');
    return null;
  }

  try {
    const app = getApps()[0];
    return getMessaging(app);
  } catch (error) {
    console.error('[FCM] Failed to get messaging instance:', error);
    return null;
  }
}

// Request permission and get FCM token
export async function getFCMToken(): Promise<string | null> {
  if (!isFCMSupported()) {
    return null;
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return null;
  }

  try {
    // Check if we have permission
    if (Notification.permission !== 'granted') {
      console.log('[FCM] Notification permission not granted');
      return null;
    }

    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
      try {
        await saveFCMToken(token);
      } catch (saveError) {
        console.warn('[FCM] Failed to save token to Firestore (non-critical):', saveError);
        // Saving to Firestore failed, but we still have the token for local use
        // This is a non-critical error - the token can still be used for notifications
      }
      return token;
    } else {
      console.log('[FCM] No registration token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Failed to get FCM token:', error);
    return null;
  }
}

// Save FCM token to Firestore
export async function saveFCMToken(token: string): Promise<void> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('[FCM] No user logged in, skipping token save');
      return;
    }

    console.log('[FCM] Saving token for user:', user.uid);
    
    const db = getFirestore();
    const tokenRef = doc(db, 'fcm_tokens', user.uid);
    
    const tokenData = {
      token,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      platform: navigator.platform,
      userAgent: navigator.userAgent.substring(0, 200)
    };
    
    console.log('[FCM] Token data:', tokenData);
    
    await setDoc(tokenRef, tokenData, { merge: true });

    console.log('[FCM] Token saved to Firestore successfully');
  } catch (error) {
    console.error('[FCM] Failed to save token to Firestore:', error);
    // Re-throw the error so calling code can handle it appropriately
    throw error;
  }
}

// Delete FCM token
export async function deleteFCMToken(): Promise<boolean> {
  if (!isFCMSupported()) {
    return false;
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return false;
  }

  try {
    const token = await getFCMToken();
    if (token) {
      await deleteToken(messaging);
      console.log('[FCM] Token deleted');
    }
    
    // Also remove from Firestore
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const db = getFirestore();
      const tokenRef = doc(db, 'fcm_tokens', user.uid);
      await setDoc(tokenRef, { token: null }, { merge: true });
    }
    
    return true;
  } catch (error) {
    console.error('[FCM] Failed to delete token:', error);
    return false;
  }
}

// Listen for incoming FCM messages while app is in foreground
export function listenForForegroundMessages(callback: (payload: any) => void): () => void {
  if (!isFCMSupported()) {
    return () => {};
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return () => {};
  }

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Message received in foreground:', payload);
      callback(payload);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[FCM] Failed to listen for foreground messages:', error);
    return () => {};
  }
}

// Send push notification to specific user
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    // In a real implementation, you would call a Cloud Function or backend API
    // to send the push notification. This is just a placeholder.
    console.log('[FCM] Would send notification:', { userId, title, body, data });
    
    // For now, we'll simulate by showing a local notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        data: data || {}
      });
      
      notification.onclick = () => {
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      };
    }
    
    return true;
  } catch (error) {
    console.error('[FCM] Failed to send push notification:', error);
    return false;
  }
}

// Initialize FCM and request permissions
export async function initializeFCM(): Promise<{
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
}> {
  const result = {
    token: null,
    permission: Notification.permission,
    isSupported: isFCMSupported()
  };

  if (!result.isSupported) {
    console.log('[FCM] Not supported in this environment');
    return result;
  }

  // Request notification permission if not already granted
  if (result.permission === 'default') {
    result.permission = await Notification.requestPermission();
  }

  if (result.permission === 'granted') {
    result.token = await getFCMToken();
  }

  return result;
}

// Check if we have FCM permission and token
export async function checkFCMStatus(): Promise<{
  hasPermission: boolean;
  hasToken: boolean;
  isSupported: boolean;
}> {
  const isSupported = isFCMSupported();
  const hasPermission = Notification.permission === 'granted';
  let hasToken = false;

  if (isSupported && hasPermission) {
    const token = await getFCMToken();
    hasToken = !!token;
  }

  return {
    hasPermission,
    hasToken,
    isSupported
  };
}