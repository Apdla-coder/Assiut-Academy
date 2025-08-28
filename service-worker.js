const CACHE_NAME = 'assiut-academy-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo2.jpg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
        .catch(err => console.warn('فشل في كاش بعض الملفات:', err));
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // ✅ تحسين: تجاهل طلبات non-GET أو ملفات خاصة
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // ✅ تحسين: خزن في الكاش بس لو الطلب شغال و response.ok
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(async () => {
        // ✅ تحسين: لو في خطأ، نرجع الكاش لو موجود
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // ✅ تحسين: fallback للصفحات HTML بس (مش للصور أو APIs)
        const acceptHeader = event.request.headers.get('Accept');
        if (acceptHeader && acceptHeader.includes('text/html')) {
          return caches.match('./index.html');
        }

        // ❌ لو مش HTML ولا محفوظ في الكاش، نسيب الطلب يفشل طبيعي
        // علشان ما يحصلش خطأ "Failed to convert..."
        return new Response('Not Found', { status: 404 });
      })
  );
});
// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
                  .map(name => caches.delete(name))
      )
    )
  );
});
