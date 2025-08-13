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

// تثبيت الـ SW وحفظ الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => {
        console.warn('فشل في إضافة ملفات للكاش أثناء التثبيت:', err);
      })
  );
  self.skipWaiting(); // اطلب من المتصفح تفعيل الSW الجديدة فوراً
});

// تفعيل: حذف كاش قديم وإبلاغ العملاء بوجود تحديث
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => {
      // بعدما نحذف الكاش القديم، نأخذ التحكم فوراً
      return self.clients.claim();
    }).then(() => {
      // إبلاغ كل النوافذ/التابات أن هناك نسخة جديدة
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

// مسار مساعدة: هل الطلب لصفحة (navigation)?
function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Fetch: Cache-first مع تحديث في الخلفية، و fallback للـ index.html لطلبات التنقل
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // تجاهل الطلبات من نطاقات خاصة أو طلبات البريد/POST
  if (req.method !== 'GET') {
    return; // دع الشبكة تتعامل معها
  }

  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        // رجع من الكاش فوراً، وفي الخلفية حدّث الكاش
        event.waitUntil(
          fetch(req).then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              caches.open(CACHE_NAME).then(cache => cache.put(req, networkResponse.clone()));
            }
          }).catch(() => {/* فشل التحديث لا يهم الآن */})
        );
        return cachedResponse;
      }

      // لو مش في الكاش، جرب الشبكة ثم خزّن النتيجة
      return fetch(req).then(networkResponse => {
        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, copy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // لو فشل كل شيء:
        // - لو الطلب صفحة (navigation)، اعد index.html من الكاش كـ fallback
        if (isNavigationRequest(req)) {
          return caches.match('./index.html');
        }
        // - وإلا حاول إعادة أي ملف مطابق في الكاش
        return caches.match(req);
      });
    })
  );
});

// التعامل مع رسائل من الصفحة (مثلاً: طلب تفعيل النسخة فوراً)
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
