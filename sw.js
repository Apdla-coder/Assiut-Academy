// sw.js
const CACHE_NAME = 'delivery-office-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // يمكنك إضافة صور أو ملفات محلية لاحقًا
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache)
          .catch(err => console.warn('فشل في كاش بعض الملفات:', err));
      })
  );
});

self.addEventListener('fetch', (event) => {
  // تحسين استراتيجية الـ fetch مع معالجة أفضل للأخطاء
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // إذا نجح الطلب، قم بحفظه في الكاش للمرة القادمة
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // في حالة فشل الشبكة، استخدم الكاش
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // إذا لم توجد في الكاش، استخدم الصفحة الرئيسية
            return caches.match('./index.html');
          });
      })
  );
});

// تحديث الـ Cache عند تغيير النسخة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                  .map(name => caches.delete(name))
      );
    })
  );
});