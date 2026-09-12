'use client';

import { useEffect } from 'react';

/**
 * Đăng ký service worker. Không có nó thì Chrome không cho cài app về màn hình
 * chính. Chạy sau khi trang tải xong để không giành băng thông lúc mở app.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Chặn bởi trình duyệt hoặc chạy ở http: app vẫn dùng bình thường,
        // chỉ là không cài về màn hình chính được.
      });
    };
    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
