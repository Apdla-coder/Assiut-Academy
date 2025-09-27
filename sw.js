// sw.js
const CACHE_NAME = 'assiut-academy-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo2.jpg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// تثبيت الـ SW وحفظ الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => {
        console.warn('فشل في إضافة ملفات للكاش أثناء التثبيت:', err);
      })
  );
  self.skipWaiting();
});

// تفعيل: حذف كاش قديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// هل الطلب لصفحة HTML؟
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Fetch: Cache-first مع تحديث في الخلفية
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // تجاهل الطلبات من بروتوكولات غير مدعومة
  if (!req.url.startsWith('http')) return;

  // تجاهل أي طلب من chrome-extension:// أو mailto أو غيره
  if (req.url.startsWith('chrome-extension://')) return;

  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        // تحديث في الخلفية
        event.waitUntil(
          fetch(req).then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              const cloneForCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(req, cloneForCache);
              });
            }
          }).catch(() => { /* تجاهل أي خطأ */ })
        );
        return cachedResponse;
      }

      // لو مش في الكاش، جرب الشبكة وخزن
      return fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const cloneForCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, cloneForCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (isNavigationRequest(req)) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// استقبال رسائل من الصفحة
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
