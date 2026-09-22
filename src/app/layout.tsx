import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ServiceWorker } from '@/components/pwa/service-worker';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'HRM Nha Khoa Gia Đình',
  description: 'Hệ thống quản lý nội bộ phòng khám nha khoa',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NK Gia Đình',
    statusBarStyle: 'default',
  },
  // Chỉ khai các bản nền trong suốt ở đây. Trình duyệt chọn favicon trong đúng
  // danh sách này, mà icon-192/512 là bản nền trắng dành cho lúc cài app — để ở
  // đây là thanh tab hiện ra một ô trắng. Icon cài app lấy từ manifest.
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  // Chừa chỗ cho tai thỏ / thanh gạt của iPhone khi chạy dạng app.
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-[#F9F9F9]">
        <Providers>{children}</Providers>
        <ServiceWorker />
      </body>
    </html>
  );
}
