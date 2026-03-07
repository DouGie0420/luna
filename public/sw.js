// LUNA Marketplace Service Worker
// PWA + FCM Push Notifications

const CACHE_NAME = 'luna-cache-v2';
const OFFLINE_URL = '/offline.html';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll([
        '/',
        '/offline.html',
        '/manifest.json',
        '/base-testnet-icon-192x192.svg',
        '/base-testnet-icon-512x512.svg',
        '/base-testnet-icon-96x96.svg',
        // Base测试网核心资产缓存
        'https://base-sepolia.public.blastapi.io',
        // Add other critical assets here
      ]);
    }).then(() => {
      console.log('[Service Worker] Install completed');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, cache fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Never intercept Next.js runtime/chunk assets to avoid stale chunk mismatches.
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith('/_next/')) {
    return;
  }

  // Skip Firebase and external API requests
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis') ||
      (event.request.url.includes('web3') && !event.request.url.includes('base-sepolia.public.blastapi.io'))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful same-origin responses only
        if (response.status === 200 && requestUrl.origin === self.location.origin) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache and user is offline, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Network error', { status: 408 });
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.log('[Service Worker] Push data not JSON:', event.data.text());
    data = {
      title: 'New Notification',
      body: event.data.text() || 'You have a new message',
    };
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/base-testnet-icon-192x192.svg',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      ...data
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Open'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LUNA', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    console.log('[Service Worker] Background sync for messages');
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Implement background sync for offline messages
  console.log('[Service Worker] Syncing messages...');

  // IndexedDB核心配置
  const DB_NAME = 'luna-offline-chats';
  const DB_VERSION = 1;
  const STORE_NAME = 'unsynced-messages';

  try {
    // 1. 打开或创建IndexedDB数据库
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // 数据库版本升级（创建消息存储容器）
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    // 2. 获取未同步的聊天消息
    const unsyncedMessages = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });

    if (unsyncedMessages.length === 0) {
      console.log('[Service Worker] 无未同步的离线消息');
      return;
    }

    // 3. 同步消息至Firestore（适配现有聊天结构）
    for (const message of unsyncedMessages) {
      try {
        await fetch('/api/sync-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chatId: message.chatId,
            senderId: message.senderId,
            content: message.content,
            timestamp: message.timestamp
          })
        });

        // 4. 标记消息为已同步并删除
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(message.id);

          request.onsuccess = (event) => resolve(event.target.result);
          request.onerror = (event) => reject(event.target.error);
        });

        console.log('[Service Worker] 已同步离线消息:', message.id);
      } catch (syncError) {
        console.error('[Service Worker] 消息同步失败:', syncError, message);
        // 保留失败消息待下次同步
        break;
      }
    }

    db.close();
  } catch (dbError) {
    console.error('[Service Worker] IndexedDB操作失败:', dbError);
  }
}
