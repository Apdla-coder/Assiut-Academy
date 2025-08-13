// اسم الكاش
const CACHE_NAME = "app-cache-v1";

// الملفات اللي هيتم تخزينها في الكاش
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo2.png", // غيّر المسار والصورة حسب ملفاتك
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// تفعيل الـ Service Worker وحذف الكاش القديم
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

// جلب الملفات من الكاش أو من الشبكة
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
