const CACHE_NAME = 'assiut-academy-v2';
const urlsToCache = [
  './',
  './index.html', // عدل حسب اسم الصفحة الرئيسية
  './manifest.json',
  './logo2.jpg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - Cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
        .catch(err => console.warn('فشل في كاش بعض الملفات:', err));
    })
  );
});

// Fetch event - No cache for API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // منع الكاش لطلبات Supabase أو أي API
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/rest/v1/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // باقي الملفات الثابتة - Cache first then network
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      });
    })
  );
});

// Activate event - Delete old caches
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
