/*
 * Service worker tối thiểu.
 *
 * Chỉ để app đủ điều kiện cài về màn hình chính và mở được khung trang khi mất
 * mạng. KHÔNG cache lời gọi API: dữ liệu chấm công, công việc phải luôn lấy mới,
 * cache nhầm ở đây còn hại hơn là không có.
 */
const CACHE = 'hrm-shell-v1';
const SHELL = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Bỏ qua mọi thứ không cùng origin (API nằm ở tên miền khác) và các đường dẫn dữ liệu.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api')) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/dashboard'))),
  );
});
