/**
 * PWA Service Worker Registration
 * Handles service worker installation, updates, and FCM push notifications
 */

// Service Worker Registration
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return null;
  }

  try {
    console.log('[PWA] Attempting to register service worker at /sw.js');
    console.log('[PWA] Current origin:', window.location.origin);
    console.log('[PWA] Is HTTPS:', window.location.protocol === 'https:');
    console.log('[PWA] Is localhost:', window.location.hostname === 'localhost');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

    console.log('[PWA] Service Worker registered successfully:', registration);
    console.log('[PWA] Registration scope:', registration.scope);
    console.log('[PWA] Active worker:', registration.active);
    console.log('[PWA] Installing worker:', registration.installing);
    console.log('[PWA] Waiting worker:', registration.waiting);
    console.log('[PWA] Service Worker controller:', navigator.serviceWorker.controller);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('[PWA] Update found, new worker:', newWorker);
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('[PWA] New worker state change:', newWorker.state);
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New content available, please refresh');
            // You could show a "New content available" toast here
          }
        });
      }
    });

    // Add error handling for the service worker
    if (registration.installing) {
      registration.installing.addEventListener('error', (error) => {
        console.error('[PWA] Service Worker installation error:', error);
      });
    }

    return registration;
  } catch (error: any) {
    console.error('[PWA] Service Worker registration failed:', error);
    console.error('[PWA] Error name:', error.name);
    console.error('[PWA] Error message:', error.message);
    console.error('[PWA] Error stack:', error.stack);
    
    // Provide more specific error messages
    if (error.name === 'SecurityError') {
      console.error('[PWA] Security error - make sure you are using HTTPS or localhost');
    } else if (error.name === 'TypeError') {
      console.error('[PWA] Type error - check if sw.js file exists and is accessible');
    } else if (error.name === 'DOMException') {
      console.error('[PWA] DOM Exception - service worker scope conflict');
    }
    
    return null;
  }
}

// Unregister service worker (for development)
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('[PWA] Service Worker unregistered');
    return true;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

// Check if app is installed as PWA
export function isRunningAsPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.log('[PWA] Notifications previously denied');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[PWA] Notification permission request failed:', error);
    return 'denied';
  }
}

// Check if app is online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Get current service worker registration
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('[PWA] Failed to get service worker registration:', error);
    return null;
  }
}

// Send message to service worker
export async function sendMessageToSW(message: any): Promise<void> {
  const registration = await getServiceWorkerRegistration();
  if (registration?.active) {
    registration.active.postMessage(message);
  }
}

// Subscribe to service worker messages
export function listenToServiceWorker(callback: (event: MessageEvent) => void): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const messageHandler = (event: MessageEvent) => {
    callback(event);
  };

  navigator.serviceWorker.addEventListener('message', messageHandler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', messageHandler);
  };
}