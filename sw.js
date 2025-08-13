// sw.js
const CACHE_NAME = 'assiut-academy-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo2.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// التثبيت وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // تفعيل النسخة الجديدة فوراً
});

// الجلب: أولاً من الكاش، ثم تحديثه في الخلفية
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse); // لو فشل النت، رجع الكاش
      return cachedResponse || fetchPromise;
    })
  );
});

// مسح الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                  .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});
// إشعار عند التحديث